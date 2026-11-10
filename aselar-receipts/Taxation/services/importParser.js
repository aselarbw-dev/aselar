// Taxation/services/importParser.js
//
// Reads an uploaded file (Excel .xlsx or CSV) and turns it into line-builder input.
// No database and no Express in here; it needs the `exceljs` package for .xlsx files.
//
// Two kinds of file are understood:
//   - a BURS schedule: sheets named "Input" (purchases) and/or "Output" (sales), laid out like
//     the sample schedules (and like the schedule this service exports): a header row, rows of
//     invoices, and total rows such as "TOTAL LOCAL PURCHASES AND EXPENSES". Rows above an
//     "IMPORTED PURCHASES" total are treated as imported purchases.
//   - any other table with a header row (a CSV or a single sheet from another system). Then the
//     caller says whether it holds sales or purchases.
//
// Column headers are recognised by name, so the order of the columns does not matter.
//
// Things learned from the real sample schedules, and handled here:
//   - dates arrive two ways. Text such as "07/11/2023" is read day first. Real date cells can have
//     had day and month swapped by Excel's regional settings (1 August typed in a US-style Excel
//     becomes 8 January). Those are corrected ONLY when the swapped date falls inside the period
//     and the date as read does not, and every correction is reported.
//   - invoice numbers are sometimes numbers (12143) and sometimes text ("0002/00574374")
//   - the Tax Amount column is often a formula (=0.14*F2); its calculated value is used
//   - imported suppliers carry the country after the tax ID: "0150309-01-5 (NAMIBIA)"
//   - consumer sales have "n/a" as the customer TIN
//   - negative amounts are credit notes

const ExcelJS = require("exceljs");
const { parsePula } = require("../utils/Money");

// A problem with the file itself (not with one row). The service turns it into a 400 reply.
class ImportFileError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "ImportFileError";
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// reading cells
// ---------------------------------------------------------------------------

// A cell's plain value: formulas give their calculated result, rich text becomes text.
function plain(v) {
  if (v === null || v === undefined) return undefined;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return plain(v.result);
    if (Array.isArray(v.richText)) return plain(v.richText.map((t) => t.text).join(""));
    if ("text" in v) return plain(v.text);
    return undefined; // errors and anything else
  }
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? undefined : t;
  }
  return v;
}

// Reads comma, semicolon or tab separated text into rows of cells.
function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] || "";
  const count = (ch) => firstLine.split(ch).length - 1;
  const delimiter = [",", ";", "\t"].sort((a, b) => count(b) - count(a))[0];

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < clean.length; i += 1) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      endField();
    } else if (c === "\n") {
      endRow();
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length) endRow();

  return rows.map((cells) => cells.map(plain));
}

// Loads the file into "grids": one per sheet, each a list of { rowNumber, cells }.
async function loadGrids(buffer) {
  if (!buffer || buffer.length === 0) throw new ImportFileError("No file was received.");

  const isZip = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b; // "PK": an .xlsx file
  if (isZip) {
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(buffer);
    } catch (err) {
      throw new ImportFileError("The file could not be read as an Excel workbook (.xlsx).");
    }
    return wb.worksheets.map((ws) => {
      const grid = [];
      ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const cells = [];
        row.eachCell({ includeEmpty: true }, (cell, col) => {
          cells[col - 1] = plain(cell.value);
        });
        grid.push({ rowNumber, cells });
      });
      return { name: ws.name, grid };
    });
  }

  // Old .xls files start with a different marker; say so clearly instead of guessing.
  if (buffer[0] === 0xd0 && buffer[1] === 0xcf) {
    throw new ImportFileError("This looks like an old Excel file (.xls). Save it as .xlsx and try again.");
  }

  const rows = parseCsv(buffer.toString("utf8"));
  return [{ name: "csv", grid: rows.map((cells, i) => ({ rowNumber: i + 1, cells })) }];
}

// ---------------------------------------------------------------------------
// headers
// ---------------------------------------------------------------------------

const normalizeHeader = (h) => String(h === undefined || h === null ? "" : h).toLowerCase().replace(/[^a-z0-9]/g, "");

// Which field a column header stands for, or null.
function classifyHeader(header) {
  const n = normalizeHeader(header);
  if (!n) return null;

  if (
    n === "invoice" ||
    /^(invoiceno|invoicenumber|invoicenum|invno|invoiceref|invoicereference|documentno|documentnumber|docno|docnumber|reference|ref|receiptno|receiptnumber)$/.test(n)
  ) {
    return "invoiceNumber";
  }
  if (n.includes("date")) return "date";
  if (n.endsWith("tin") || /^(tinno|tinnumber|taxid|taxidnumber|taxnumber|vatno|vatnumber|vatregno|vatregistrationnumber)$/.test(n)) {
    return "tin";
  }
  if (/^(taxamount|vatamount|vat|tax|taxvalue|vatvalue|inputtax|outputtax)$/.test(n) || n.includes("vat") || (n.includes("tax") && n.includes("amount"))) {
    return "vat";
  }
  if (
    /^(invoiceamount|amount|amountexclvat|amountexcludingvat|netamount|net|subtotal|valueexclvat|totalexclvat|taxableamount|taxablevalue|value)$/.test(n) ||
    n.includes("amount")
  ) {
    return "amount";
  }
  if (/^(nameofsupplier|nameofcustomer|suppliername|customername|supplier|customer|name|counterparty|vendor|client|buyer|seller)$/.test(n)) {
    return "name";
  }
  if (n.startsWith("description") || /^(details|item|narration|particulars)$/.test(n)) return "description";
  if (n === "country" || n === "countryoforigin") return "country";
  return null;
}

// column index for each field, plus how many headers were recognised. First column wins.
function mapHeaders(cells) {
  const columns = {};
  let recognized = 0;
  cells.forEach((cell, index) => {
    const field = classifyHeader(cell);
    if (field && columns[field] === undefined) {
      columns[field] = index;
      recognized += 1;
    }
  });
  return { columns, recognized };
}

// The header is the first of the top rows that has an amount column and at least two others.
function findHeaderRow(grid) {
  for (let i = 0; i < Math.min(grid.length, 15); i += 1) {
    const { columns, recognized } = mapHeaders(grid[i].cells);
    if (columns.amount !== undefined && recognized >= 3) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// one sheet
// ---------------------------------------------------------------------------

const TOTAL_LABEL = /\b(total|purchases|expenses|supplied)\b/i;

// A total row: no invoice number, no date, a label such as "TOTAL LOCAL PURCHASES AND EXPENSES".
const isTotalRow = (rec) =>
  rec.invoiceNumber === undefined &&
  rec.date === undefined &&
  [rec.name, rec.description, rec.tin].some((v) => typeof v === "string" && TOTAL_LABEL.test(v));

// Reads the data rows of one sheet, working out which section each belongs to.
// kind: "input" (purchases), "output" (sales) or "table" (the caller decides the direction).
function parseGrid(grid, { sheetName, kind }) {
  const headerIndex = findHeaderRow(grid);
  if (headerIndex === -1) {
    return { sheetName, error: "No header row with an amount column was found in the first rows.", rows: [], sections: [] };
  }
  const { columns } = mapHeaders(grid[headerIndex].cells);

  const rows = [];
  const sections = [];
  const notes = [];
  let pending = [];
  let ignored = 0;

  const closeSection = (sectionKind, label, total) => {
    const sumAmount = pending.reduce((s, r) => s + (parsePula(r.amount) || 0), 0);
    const sumVat = pending.reduce((s, r) => s + (parsePula(r.vat) || 0), 0);
    const fileAmount = total ? parsePula(total.amount) : null;
    const fileVat = total ? parsePula(total.vat) : null;
    sections.push({
      kind: sectionKind,
      label: label || null,
      rowCount: pending.length,
      sumAmountThebe: sumAmount,
      sumVatThebe: sumVat,
      fileAmountThebe: fileAmount,
      fileVatThebe: fileVat,
      // amounts have two decimals; VAT may have been rounded line by line, so allow a thebe per row
      amountMatches: fileAmount === null ? null : Math.abs(fileAmount - sumAmount) <= 1,
      vatMatches: fileVat === null ? null : Math.abs(fileVat - sumVat) <= Math.max(1, pending.length),
    });
    for (const r of pending) r.section = sectionKind;
    rows.push(...pending);
    pending = [];
  };

  const sectionFor = (label) => {
    if (kind === "output") return "sale";
    if (kind === "table") return "table";
    return /import/i.test(label || "") ? "imported" : "local";
  };

  for (let i = headerIndex + 1; i < grid.length; i += 1) {
    const { rowNumber, cells } = grid[i];
    const get = (field) => (columns[field] === undefined ? undefined : cells[columns[field]]);
    const rec = {
      sheet: sheetName,
      row: rowNumber,
      invoiceNumber: get("invoiceNumber"),
      date: get("date"),
      tin: get("tin"),
      name: get("name"),
      description: get("description"),
      amount: get("amount"),
      vat: get("vat"),
      country: get("country"),
    };

    const isBlank = Object.entries(rec).every(([k, v]) => k === "sheet" || k === "row" || v === undefined);
    if (isBlank) continue;

    if (isTotalRow(rec)) {
      const label = [rec.name, rec.description, rec.tin].find((v) => typeof v === "string" && TOTAL_LABEL.test(v));
      closeSection(sectionFor(label), label, rec);
      continue;
    }

    // Text with no amount, no invoice number and no date (a note under the table): not a line.
    if (rec.amount === undefined && rec.vat === undefined && rec.invoiceNumber === undefined && rec.date === undefined) {
      ignored += 1;
      continue;
    }

    pending.push(rec);
  }

  if (pending.length) {
    notes.push(`${pending.length} row(s) in "${sheetName}" have no total row after them; they were read as ${sectionFor("")}.`);
    closeSection(sectionFor(""), null, null);
  }
  if (ignored) notes.push(`${ignored} text-only row(s) in "${sheetName}" were ignored.`);

  return { sheetName, headerRow: grid[headerIndex].rowNumber, columns: Object.keys(columns), rows, sections, notes };
}

// ---------------------------------------------------------------------------
// the whole file
// ---------------------------------------------------------------------------

async function parseImportFile(buffer, options = {}) {
  const grids = await loadGrids(buffer);
  const byName = (name) => grids.find((g) => g.name.trim().toLowerCase() === name);
  const inputSheet = byName("input");
  const outputSheet = byName("output");

  const sheets = [];
  let format;

  if (inputSheet || outputSheet) {
    format = "schedule";
    if (inputSheet) sheets.push({ ...parseGrid(inputSheet.grid, { sheetName: inputSheet.name, kind: "input" }), direction: "input" });
    if (outputSheet) sheets.push({ ...parseGrid(outputSheet.grid, { sheetName: outputSheet.name, kind: "output" }), direction: "output" });
  } else {
    format = "table";
    if (options.direction !== "input" && options.direction !== "output") {
      throw new ImportFileError(
        'This file is not a BURS schedule (no "Input" or "Output" sheet), so say what it holds: direction=input for purchases or direction=output for sales.'
      );
    }
    const sheet = grids.find((g) => findHeaderRow(g.grid) !== -1) || grids[0];
    if (!sheet) throw new ImportFileError("The file has no sheets.");
    sheets.push({ ...parseGrid(sheet.grid, { sheetName: sheet.name, kind: "table" }), direction: options.direction });
  }

  const failed = sheets.filter((s) => s.error);
  if (failed.length === sheets.length) {
    throw new ImportFileError(failed.map((s) => `"${s.sheetName}": ${s.error}`).join(" "), {
      expectedHeaders: "an amount column (Invoice Amount) plus at least two of: invoice number, date, TIN, name, description, tax amount",
    });
  }

  return { format, sheets: sheets.filter((s) => !s.error), warnings: failed.map((s) => `Sheet "${s.sheetName}" was skipped: ${s.error}`) };
}

// ---------------------------------------------------------------------------
// dates
// ---------------------------------------------------------------------------

const pad2 = (n) => String(n).padStart(2, "0");
const isoDay = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
const isRealDay = (y, m, d) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

// Reads one date cell.
//   raw      a Date (a real date cell), an Excel serial number, or text
//   window   { start, end } as YYYY-MM-DD: the period the lines are being imported into
//   fixSwapped  correct day/month swaps in real date cells (see the note at the top)
// Returns { missing: true } | { error } | { iso, original, guessed }
function parseImportDate(raw, { window, fixSwapped = true } = {}) {
  if (raw === undefined || raw === null || raw === "") return { missing: true };

  let y;
  let m;
  let d;
  let typed = false; // a real date cell (as opposed to text), which can carry a swap

  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return { error: "the date is not valid" };
    y = raw.getUTCFullYear();
    m = raw.getUTCMonth() + 1;
    d = raw.getUTCDate();
    typed = true;
  } else if (typeof raw === "number") {
    if (!(raw > 20000 && raw < 80000)) return { error: `${raw} is not a date` };
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(raw) * 86400000);
    y = dt.getUTCFullYear();
    m = dt.getUTCMonth() + 1;
    d = dt.getUTCDate();
    typed = true;
  } else if (typeof raw === "string") {
    const s = raw.trim();
    let match = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(s);
    if (match) {
      y = Number(match[1]);
      m = Number(match[2]);
      d = Number(match[3]);
    } else if ((match = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/.exec(s))) {
      d = Number(match[1]); // day first, always, for text
      m = Number(match[2]);
      y = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
    } else {
      return { error: `"${s}" is not a date I can read (use dd/mm/yyyy or yyyy-mm-dd)` };
    }
  } else {
    return { error: "the date is not valid" };
  }

  if (y < 2000 || y > 2100 || !isRealDay(y, m, d)) return { error: `${pad2(d)}/${pad2(m)}/${y} is not a real date` };

  const original = isoDay(y, m, d);

  // Only real date cells can carry a swap, and only when the day could also be a month.
  if (typed && fixSwapped && window && d <= 12 && d !== m) {
    const swapped = isoDay(y, d, m);
    const inside = (x) => x >= window.start && x <= window.end;
    if (!inside(original) && inside(swapped)) return { iso: swapped, original, guessed: true };
  }
  return { iso: original, original, guessed: false };
}

// ---------------------------------------------------------------------------
// rows -> line-builder input
// ---------------------------------------------------------------------------

const NO_TIN = new Set(["n/a", "na", "n.a", "none", "nil", "-", "--"]);
const formatPula = (thebe) => (thebe / 100).toFixed(2);
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());

const toText = (v) => {
  if (v === undefined || v === null) return undefined;
  if (v instanceof Date) return undefined;
  const t = typeof v === "number" ? String(v) : String(v).trim();
  return t === "" ? undefined : t;
};

// options: { importedSupplyType, zeroVatAs, fixSwappedDates, window }
// Returns one item per row: { sheet, row, section, input, errors: [{field,message}], notes: [...] }
function toInputs(parsed, options = {}) {
  const importedSupplyType = options.importedSupplyType || "imported_goods";
  const zeroVatAs = options.zeroVatAs || "zero";
  const items = [];

  for (const sheet of parsed.sheets) {
    for (const r of sheet.rows) {
      const errors = [];
      const notes = [];
      const input = { direction: sheet.direction };

      const invoiceNumber = toText(r.invoiceNumber);
      if (invoiceNumber !== undefined) input.invoiceNumber = invoiceNumber;

      // date
      const date = parseImportDate(r.date, { window: options.window, fixSwapped: options.fixSwappedDates !== false });
      if (date.error) errors.push({ field: "invoiceDate", message: date.error });
      else if (!date.missing) {
        input.invoiceDate = date.iso;
        if (date.guessed) notes.push({ code: "DATE_SWAPPED_GUESS", from: date.original, to: date.iso });
      }

      // text fields
      const name = toText(r.name);
      if (name !== undefined) input.counterpartyName = name;
      const description = toText(r.description);
      if (description !== undefined) input.description = description;

      // TIN: "n/a" means none; imported suppliers carry the country in brackets
      let tin = toText(r.tin);
      let country = toText(r.country);
      if (tin && NO_TIN.has(tin.toLowerCase())) tin = undefined;
      if (tin && r.section === "imported") {
        const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(tin);
        if (m) {
          tin = m[1].trim() || undefined;
          country = country || titleCase(m[2].trim());
        }
      }
      if (tin) input.counterpartyTin = tin;
      if (country) input.country = country;

      // amounts. A negative amount is a credit note (the builder wants positive numbers).
      const amountThebe = parsePula(r.amount);
      if (amountThebe === null) {
        errors.push({ field: "amount", message: "the amount is missing or is not a number" });
      } else {
        if (amountThebe < 0) input.docType = "credit_note";
        input.amount = formatPula(Math.abs(amountThebe));
      }

      if (r.vat === undefined) {
        if (amountThebe !== null) notes.push({ code: "VAT_CALCULATED" }); // no Tax Amount: calculated at the profile's rate
      } else {
        const vatThebe = parsePula(r.vat);
        if (vatThebe === null) {
          errors.push({ field: "vatAmount", message: "the tax amount is not a number" });
        } else if (amountThebe !== null && vatThebe !== 0 && Math.sign(vatThebe) !== Math.sign(amountThebe)) {
          errors.push({ field: "vatAmount", message: "the tax amount and the amount have opposite signs" });
        } else {
          input.vatAmount = formatPula(Math.abs(vatThebe));
          if (vatThebe === 0 && amountThebe !== null && amountThebe !== 0 && zeroVatAs !== "standard") {
            input.vatClass = zeroVatAs;
            notes.push({ code: "ZERO_VAT", as: zeroVatAs });
          }
        }
      }

      if (sheet.direction === "input" && r.section === "imported") {
        input.supplyType = importedSupplyType;
        notes.push({ code: "IMPORTED", as: importedSupplyType });
      }

      items.push({ sheet: r.sheet, row: r.row, section: r.section, input, errors, notes });
    }
  }
  return items;
}

module.exports = {
  ImportFileError,
  plain,
  parseCsv,
  classifyHeader,
  mapHeaders,
  parseGrid,
  parseImportFile,
  parseImportDate,
  toInputs,
};