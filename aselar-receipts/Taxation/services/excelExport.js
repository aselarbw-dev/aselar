// Taxation/services/excelExport.js
//
// Builds the two Excel files for an exported period, from the frozen snapshot only:
//
//   1. The schedule: the file to upload to BURS. Exactly two sheets, "Input" and "Output", laid
//      out like the sample schedules Sellex's accountant already uses (same headers, column
//      order, section totals). Nothing else is added, so the upload stays clean.
//   2. The reconciliation report: for the business to review. Return figures (exact and rounded
//      to the nearest pula), what was reviewed, and what was not claimed. Not for upload.
//
// No database and no Express in this file. It needs the `exceljs` package.
//
// Layout decisions, taken from the sample schedules:
//   - dates are written as text, dd/mm/yyyy (day first, like most of the sample's cells)
//   - Tax Amount is written as a value (it can be a printed or customs figure, not always 14%)
//   - section totals are SUM formulas, saved with their calculated value so that readers that
//     do not recalculate still see the number
//   - imported suppliers show the country after the tax ID, e.g. "0150309-01-5 (NAMIBIA)"
//   - sales to consumers show "n/a" as the customer TIN

const ExcelJS = require("exceljs");
const { roundToPula } = require("./reconcileCalc");

const SHEET_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const toPula = (thebe) => thebe / 100;
const sumThebe = (rows, key) => rows.reduce((total, r) => total + r[key], 0);

// Invoice dates are stored as midnight UTC of the calendar day, so the UTC date IS the date.
const calendarDate = (d) => new Date(d).toISOString().slice(0, 10);
const dmy = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`; // YYYY-MM-DD -> dd/mm/yyyy

const isImported = (line) => line.supplyType === "imported_goods" || line.supplyType === "imported_services";

// "OCT-NOV_2026", or "OCT_2026" for a monthly period. meta.periodStart/periodEnd are YYYY-MM-DD.
function periodLabel(meta) {
  const startMonth = Number(meta.periodStart.slice(5, 7));
  const endMonth = Number(meta.periodEnd.slice(5, 7));
  const year = meta.periodEnd.slice(0, 4);
  return startMonth === endMonth
    ? `${MONTHS[endMonth - 1]}_${year}`
    : `${MONTHS[startMonth - 1]}-${MONTHS[endMonth - 1]}_${year}`;
}
const scheduleFileName = (meta) => `INVOICE_SCHEDULE_${periodLabel(meta)}.xlsx`;
const reportFileName = (meta) => `RECONCILIATION_${periodLabel(meta)}.xlsx`;

// ---------------------------------------------------------------------------
// 1. the schedule (what goes to BURS)
// ---------------------------------------------------------------------------

// Sorts the frozen lines into the rows each sheet needs. Pure: no Excel in here.
function buildScheduleData(snapshot) {
  const lines = snapshot.lines || [];

  const toRow = (line, tin) => ({
    invoiceNumber: line.invoiceNumber ? String(line.invoiceNumber) : "",
    date: line.invoiceDate ? dmy(calendarDate(line.invoiceDate)) : "",
    tin,
    name: line.counterpartyName || "",
    description: line.description || "",
    amountThebe: line.amountExclThebe,
    vatThebe: line.vatThebe,
  });

  // Only purchases that are being claimed go on the schedule.
  const claimed = lines.filter((l) => l.direction === "input" && l.claimable !== false);

  const supplierTin = (l) => {
    const tin = l.counterpartyTin || "";
    return isImported(l) && l.country && tin ? `${tin} (${String(l.country).toUpperCase()})` : tin;
  };

  const local = claimed.filter((l) => !isImported(l)).map((l) => toRow(l, supplierTin(l)));
  const imported = claimed.filter(isImported).map((l) => toRow(l, supplierTin(l)));
  const outputs = lines
    .filter((l) => l.direction === "output")
    .map((l) => toRow(l, l.counterpartyTin || "n/a"));

  const totals = (rows) => ({ amountThebe: sumThebe(rows, "amountThebe"), vatThebe: sumThebe(rows, "vatThebe") });
  return {
    local,
    imported,
    outputs,
    totals: { local: totals(local), imported: totals(imported), outputs: totals(outputs) },
  };
}

const SCHEDULE_WIDTHS = [16, 12, 26, 38, 38, 15, 12];
const AMOUNT_FORMAT = "#,##0.00";

function styleHeader(ws, headers) {
  headers.forEach((text, i) => {
    const cell = ws.getCell(1, i + 1);
    cell.value = text;
    cell.font = { name: "Calibri", size: 11, bold: true };
    cell.border = { bottom: { style: "medium" } };
  });
  SCHEDULE_WIDTHS.forEach((width, i) => {
    ws.getColumn(i + 1).width = width;
  });
}

// Writes data rows from `startRow`; returns the row number after the last one.
function writeRows(ws, startRow, rows) {
  let r = startRow;
  for (const row of rows) {
    ws.getCell(r, 1).value = row.invoiceNumber;
    ws.getCell(r, 2).value = row.date;
    ws.getCell(r, 3).value = row.tin;
    ws.getCell(r, 4).value = row.name;
    ws.getCell(r, 5).value = row.description;
    ws.getCell(r, 6).value = toPula(row.amountThebe);
    ws.getCell(r, 7).value = toPula(row.vatThebe);
    ws.getCell(r, 6).numFmt = AMOUNT_FORMAT;
    ws.getCell(r, 7).numFmt = AMOUNT_FORMAT;
    r += 1;
  }
  return r;
}

// A total row: the label spans D:E, right-aligned and bold; F and G add up the rows above.
function writeTotalRow(ws, r, label, firstRow, lastRow, totals) {
  ws.mergeCells(r, 4, r, 5);
  const labelCell = ws.getCell(r, 4);
  labelCell.value = label;
  labelCell.font = { name: "Calibri", size: 11, bold: true };
  labelCell.alignment = { horizontal: "right" };

  [
    { col: 6, letter: "F", value: toPula(totals.amountThebe) },
    { col: 7, letter: "G", value: toPula(totals.vatThebe) },
  ].forEach(({ col, letter, value }) => {
    const cell = ws.getCell(r, col);
    // With no rows to add up there is no range to sum, so write a plain 0.
    cell.value = lastRow >= firstRow ? { formula: `SUM(${letter}${firstRow}:${letter}${lastRow})`, result: value } : 0;
    cell.font = { name: "Calibri", size: 11, bold: true };
    cell.numFmt = AMOUNT_FORMAT;
  });
}

async function toBuffer(workbook) {
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// The upload file: sheets "Input" and "Output", nothing else.
async function buildScheduleWorkbook(snapshot) {
  const meta = snapshot.totals.meta;
  const data = buildScheduleData(snapshot);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Aselar";
  wb.created = new Date(meta.generatedAt);
  wb.title = `VAT invoice schedule ${periodLabel(meta)}`;

  // ---- Input: local purchases, then imported purchases ----
  const input = wb.addWorksheet("Input");
  styleHeader(input, [
    "Invoice Number",
    "Invoice Date",
    "Supplier TIN",
    "Name of Supplier",
    "Description of Goods",
    "Invoice Amount",
    "Tax Amount",
  ]);

  let r = 2;
  const noPurchases = data.local.length === 0 && data.imported.length === 0;
  if (data.local.length > 0 || noPurchases) {
    const first = r;
    r = writeRows(input, r, data.local);
    const last = r - 1;
    r += 1; // one blank row, then the total (as in the sample)
    writeTotalRow(input, r, "TOTAL LOCAL PURCHASES AND EXPENSES", first, last, data.totals.local);
    r += 3; // two blank rows before the next section (as in the sample)
  }
  if (data.imported.length > 0) {
    const first = r;
    r = writeRows(input, r, data.imported);
    const last = r - 1;
    r += 1;
    writeTotalRow(input, r, "TOTAL IMPORTED PURCHASES", first, last, data.totals.imported);
  }

  // ---- Output: all sales ----
  const output = wb.addWorksheet("Output");
  styleHeader(output, [
    "Invoice Number",
    "Invoice Date",
    "Customer TIN",
    "Name of Customer",
    "Description of Goods",
    "Invoice Amount",
    "Tax Amount",
  ]);
  const firstOut = 2;
  const afterOut = writeRows(output, firstOut, data.outputs);
  writeTotalRow(output, afterOut + 1, "TOTAL GOODS AND SERVICES SUPPLIED", firstOut, afterOut - 1, data.totals.outputs);

  return toBuffer(wb);
}

// ---------------------------------------------------------------------------
// 2. the reconciliation report (for the business to review)
// ---------------------------------------------------------------------------

const REPORT_FONT = { name: "Arial", size: 10 };
const REPORT_BOLD = { name: "Arial", size: 10, bold: true };
const MONEY_FORMAT = "#,##0.00;-#,##0.00";
const PULA_FORMAT = "#,##0;-#,##0";

async function buildReportWorkbook(snapshot) {
  const meta = snapshot.totals.meta;
  const rec = snapshot.totals.reconciliation;
  const lines = snapshot.lines || [];

  const wb = new ExcelJS.Workbook();
  wb.creator = "Aselar";
  wb.created = new Date(meta.generatedAt);
  wb.title = `VAT reconciliation ${periodLabel(meta)}`;

  // ================= Summary =================
  const ws = wb.addWorksheet("Summary");
  ws.getColumn(1).width = 58;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 26;

  const put = (ref, value, font = REPORT_FONT, numFmt) => {
    const cell = ws.getCell(ref);
    cell.value = value;
    cell.font = font;
    if (numFmt) cell.numFmt = numFmt;
    return cell;
  };

  put("A1", "VAT RECONCILIATION", { name: "Arial", size: 14, bold: true });
  put("A2", meta.businessName || "");
  put("A3", `VAT number: ${meta.vatNumber || "not set"}`);
  put("A4", `Period: ${dmy(meta.periodStart)} to ${dmy(meta.periodEnd)}`);
  put("A5", `Due date: ${dmy(meta.dueDate)}`);
  put("A6", `Prepared by Aselar on ${dmy(meta.generatedAt.slice(0, 10))} (version ${meta.periodVersion})`);
  put("A7", "Prepared for review. The taxpayer reviews the figures and submits the return on the BURS portal.", {
    name: "Arial",
    size: 10,
    italic: true,
  });

  ["Description", "Exact (P)", "Rounded to the nearest pula (P)"].forEach((text, i) => {
    const cell = ws.getCell(9, i + 1);
    cell.value = text;
    cell.font = REPORT_BOLD;
    cell.border = { bottom: { style: "medium" } };
    if (i > 0) cell.alignment = { horizontal: "right" };
  });

  const b = rec.breakdown;
  const e = rec.exact;
  const x = rec.rounded;

  // A section heading, a detail row (exact value, rounded by formula), and so on.
  const heading = (row, text) => put(`A${row}`, text, REPORT_BOLD);
  const detail = (row, label, thebe) => {
    put(`A${row}`, label);
    put(`B${row}`, toPula(thebe), REPORT_FONT, MONEY_FORMAT);
    put(`C${row}`, { formula: `ROUND(B${row},0)`, result: roundToPula(thebe) }, REPORT_FONT, PULA_FORMAT);
  };
  const total = (row, label, exactFormula, exactThebe, roundedFormula, roundedPula) => {
    put(`A${row}`, label, REPORT_BOLD);
    put(`B${row}`, { formula: exactFormula, result: toPula(exactThebe) }, REPORT_BOLD, MONEY_FORMAT);
    put(`C${row}`, { formula: roundedFormula, result: roundedPula }, REPORT_BOLD, PULA_FORMAT);
  };

  heading(10, "OUTPUT VAT");
  detail(11, "Standard-rated sales", b.output.standard.vat);
  detail(12, "Reverse charge on imported services (declared on yourself)", b.reverseCharge.vat);
  total(13, "Total output VAT", "SUM(B11:B12)", e.outputVat, "ROUND(B13,0)", x.outputVat);

  heading(15, "INPUT VAT CLAIMED");
  detail(16, "Local purchases and expenses", b.input.local.vat);
  detail(17, "Imported goods", b.input.importedGoods.vat);
  detail(18, "Imported services", b.input.importedServices.vat);
  total(19, "Total input VAT", "SUM(B16:B18)", e.inputVat, "ROUND(B19,0)", x.inputVat);

  heading(21, "RESULT");
  total(22, "Output VAT less input VAT", "B13-B19", e.netBeforeCredit, "C13-C19", x.outputVat - x.inputVat);
  put("A23", "Credit brought forward");
  put("B23", toPula(e.openingCredit), REPORT_FONT, MONEY_FORMAT);
  put("C23", { formula: "ROUND(B23,0)", result: x.openingCredit }, REPORT_FONT, PULA_FORMAT);
  total(24, "Net VAT: payable (positive) or credit (negative)", "B22-B23", e.net, "C22-C23", x.net);
  total(25, "VAT payable", "MAX(B24,0)", e.payable, "MAX(C24,0)", x.payable);
  total(26, "Credit carried forward", "MAX(-B24,0)", e.closingCredit, "MAX(-C24,0)", x.credit);

  // ---- notes ----
  const importedEstimated = lines.filter((l) => (l.flags || []).some((f) => f.code === "IMPORT_VAT_ESTIMATED")).length;
  const notClaimed = lines.filter((l) => l.direction === "input" && l.claimable === false).length;
  const outputs = lines.filter((l) => l.direction === "output").length;
  const inputs = lines.filter((l) => l.direction === "input").length;

  const notes = [
    `This period has ${outputs} sale line(s) and ${inputs} purchase line(s).`,
    "The schedule is exact to the thebe. Only the right-hand column is rounded to the nearest pula. " +
      "Each total box is rounded once from its exact figure; the detail rows are rounded separately and may differ from their total by a pula.",
    "Reverse charge: VAT on services bought from abroad is declared as output tax and claimed back as input tax. Confirm this treatment with your tax adviser.",
  ];
  if (rec.refund && rec.refund.maybeClaimable) {
    notes.push(
      `This is credit period number ${rec.refund.consecutiveCreditPeriods} in a row. A refund may be claimable; confirm the rules with your tax adviser.`
    );
  }
  if (importedEstimated > 0) {
    notes.push(
      `${importedEstimated} imported purchase(s) use the standard-rate estimate for import VAT instead of a customs figure.`
    );
  }
  if (notClaimed > 0) {
    notes.push(`${notClaimed} purchase(s) were marked as not claimable; see the "Not claimed" sheet.`);
  }

  put("A28", "NOTES", REPORT_BOLD);
  notes.forEach((text, i) => {
    const cell = put(`A${29 + i}`, text);
    ws.mergeCells(29 + i, 1, 29 + i, 3);
    cell.alignment = { wrapText: true, vertical: "top" };
    ws.getRow(29 + i).height = text.length > 110 ? 40 : 18;
  });

  // ================= Reviewed issues =================
  const issues = wb.addWorksheet("Reviewed issues");
  const issueHeaders = ["Type", "Invoice Number", "Counterparty", "Issue", "Detail", "Reviewed on"];
  [14, 18, 30, 26, 70, 14].forEach((w, i) => (issues.getColumn(i + 1).width = w));
  issueHeaders.forEach((text, i) => {
    const cell = issues.getCell(1, i + 1);
    cell.value = text;
    cell.font = REPORT_BOLD;
    cell.border = { bottom: { style: "medium" } };
  });
  let ir = 2;
  for (const line of lines) {
    for (const flag of line.flags || []) {
      issues.getCell(ir, 1).value = line.direction === "output" ? "Sale" : "Purchase";
      issues.getCell(ir, 2).value = line.invoiceNumber || "";
      issues.getCell(ir, 3).value = line.counterpartyName || "";
      issues.getCell(ir, 4).value = flag.code;
      issues.getCell(ir, 5).value = flag.message || "";
      issues.getCell(ir, 6).value = flag.resolvedAt ? dmy(calendarDate(flag.resolvedAt)) : "not reviewed";
      for (let c = 1; c <= 6; c += 1) issues.getCell(ir, c).font = REPORT_FONT;
      ir += 1;
    }
  }
  if (ir === 2) {
    issues.getCell(2, 1).value = "No issues were raised for this period.";
    issues.getCell(2, 1).font = REPORT_FONT;
  }

  // ================= Not claimed =================
  const nc = wb.addWorksheet("Not claimed");
  ["Invoice Number", "Invoice Date", "Supplier", "Description", "Amount", "VAT not claimed"].forEach((text, i) => {
    const cell = nc.getCell(1, i + 1);
    cell.value = text;
    cell.font = REPORT_BOLD;
    cell.border = { bottom: { style: "medium" } };
  });
  [18, 14, 30, 40, 15, 16].forEach((w, i) => (nc.getColumn(i + 1).width = w));
  let nr = 2;
  for (const line of lines.filter((l) => l.direction === "input" && l.claimable === false)) {
    nc.getCell(nr, 1).value = line.invoiceNumber || "";
    nc.getCell(nr, 2).value = line.invoiceDate ? dmy(calendarDate(line.invoiceDate)) : "";
    nc.getCell(nr, 3).value = line.counterpartyName || "";
    nc.getCell(nr, 4).value = line.description || "";
    nc.getCell(nr, 5).value = toPula(line.amountExclThebe);
    nc.getCell(nr, 6).value = toPula(line.vatThebe);
    nc.getCell(nr, 5).numFmt = MONEY_FORMAT;
    nc.getCell(nr, 6).numFmt = MONEY_FORMAT;
    for (let c = 1; c <= 6; c += 1) nc.getCell(nr, c).font = REPORT_FONT;
    nr += 1;
  }
  if (nr === 2) {
    nc.getCell(2, 1).value = "Every purchase in this period was claimed.";
    nc.getCell(2, 1).font = REPORT_FONT;
  }

  return toBuffer(wb);
}

module.exports = {
  SHEET_MIME,
  periodLabel,
  scheduleFileName,
  reportFileName,
  buildScheduleData,
  buildScheduleWorkbook,
  buildReportWorkbook,
};