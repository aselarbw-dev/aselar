// Taxation/services/importParser.test.js
// Run from the Taxation folder (needs the exceljs package):  node services/importParser.test.js

const assert = require("assert");
const ExcelJS = require("exceljs");
const {
  ImportFileError,
  parseCsv,
  classifyHeader,
  parseImportFile,
  parseImportDate,
  toInputs,
} = require("./importParser");
const { buildLine } = require("./lineBuilder");
const { buildScheduleWorkbook } = require("./excelExport");

let count = 0;
const eq = (actual, expected, label) => {
  assert.strictEqual(actual, expected, `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  count += 1;
};
const same = (actual, expected, label) => {
  assert.deepStrictEqual(actual, expected, label);
  count += 1;
};

const profile = { ratePercent: 14, pricesInclusive: false };
const day = (iso) => new Date(`${iso}T00:00:00.000Z`);

(async () => {
  // ---- dates -----------------------------------------------------------------------------------
  const augSep = { start: "2023-08-01", end: "2023-09-30" };
  const octNov = { start: "2023-10-01", end: "2023-11-30" };

  eq(parseImportDate("07/11/2023").iso, "2023-11-07", "text dates are day first: 7 November");
  eq(parseImportDate("7-11-2023").iso, "2023-11-07", "dashes work");
  eq(parseImportDate("07.11.2023").iso, "2023-11-07", "dots work");
  eq(parseImportDate("07/11/23").iso, "2023-11-07", "two-digit years");
  eq(parseImportDate("2023-11-07").iso, "2023-11-07", "ISO");
  eq(parseImportDate("2023-11-07T00:00:00Z").iso, "2023-11-07", "ISO with a time");
  eq(parseImportDate("07/11/2023", { window: octNov }).guessed, false, "text dates are never 'corrected'");
  eq(parseImportDate("01/08/2023", { window: octNov }).iso, "2023-08-01", "...even when outside the period");
  same(parseImportDate(""), { missing: true }, "empty");
  same(parseImportDate(undefined), { missing: true }, "undefined");

  // real date cells can carry a day/month swap from Excel's regional settings
  let r = parseImportDate(day("2023-01-08"), { window: augSep });
  eq(r.iso, "2023-08-01", "8 Jan read from a date cell becomes 1 August when only 1 August is in the period");
  eq(r.guessed, true, "...and is reported as corrected");
  eq(r.original, "2023-01-08", "...with the date as read");
  eq(parseImportDate(day("2023-06-11"), { window: octNov }).iso, "2023-11-06", "11 June -> 6 November");
  eq(parseImportDate(day("2023-09-11"), { window: augSep }).guessed, false, "a date already inside the period is left alone");
  eq(parseImportDate(day("2023-01-08"), { window: augSep, fixSwapped: false }).iso, "2023-01-08", "switched off: kept as written");
  eq(parseImportDate(day("2023-01-08"), { window: octNov }).guessed, false, "the swapped date is outside the period too: kept");
  eq(parseImportDate(day("2023-06-25"), { window: octNov }).guessed, false, "a day above 12 cannot be a month");
  eq(parseImportDate(day("2023-08-08"), { window: octNov }).guessed, false, "day equals month: nothing to swap");
  eq(parseImportDate(day("2023-01-08")).iso, "2023-01-08", "no period given: kept");
  eq(parseImportDate(45114).iso, "2023-07-07", "an Excel serial number");
  eq(parseImportDate(day("2023-02-30")).error === undefined, true, "(JavaScript has already turned 30 Feb into March)");

  assert.ok(parseImportDate("tomorrow").error);
  assert.ok(parseImportDate("31/02/2026").error);
  assert.ok(parseImportDate("13/13/2026").error);
  assert.ok(parseImportDate("01/01/1850").error);
  assert.ok(parseImportDate(5).error);
  assert.ok(parseImportDate(true).error);
  assert.ok(parseImportDate(new Date("nonsense")).error);
  count += 7;

  // ---- CSV -------------------------------------------------------------------------------------
  same(parseCsv("a,b,c\n1,2,3\n"), [["a", "b", "c"], ["1", "2", "3"]], "plain CSV");
  same(parseCsv('a,"b,c",d\r\n1,"say ""hi""",3'), [["a", "b,c", "d"], ["1", 'say "hi"', "3"]], "quotes, commas inside, doubled quotes, CRLF");
  same(parseCsv("\uFEFFa,b\n1,2"), [["a", "b"], ["1", "2"]], "a byte-order mark is dropped");
  same(parseCsv("a;b;c\n1;2;3"), [["a", "b", "c"], ["1", "2", "3"]], "semicolons");
  same(parseCsv("a\tb\n1\t2"), [["a", "b"], ["1", "2"]], "tabs");
  same(parseCsv("a,b\n,\n1,"), [["a", "b"], [undefined, undefined], ["1", undefined]], "empty cells are undefined");
  same(parseCsv(""), [], "empty file");

  // ---- header names ------------------------------------------------------------------------------
  const headerCases = {
    "Invoice Number": "invoiceNumber", "Invoice No": "invoiceNumber", "Doc No": "invoiceNumber", Reference: "invoiceNumber", Invoice: "invoiceNumber",
    "Invoice Date": "date", Date: "date",
    "Supplier TIN": "tin", "Customer TIN": "tin", TIN: "tin", "Tax ID": "tin", "VAT Number": "tin",
    "Name of Supplier": "name", "Name of Customer": "name", Customer: "name", Supplier: "name",
    "Description of Goods": "description", Description: "description",
    "Invoice Amount": "amount", Amount: "amount", "Amount (excl VAT)": "amount", "Net Amount": "amount",
    "Tax Amount": "vat", VAT: "vat", "VAT Amount": "vat",
    Country: "country",
    "Customer VAT Number": "tin", "Supplier Tax ID": "tin",
    "Amount of VAT": "vat", "VAT charged": "vat",
    "Net Value": null, // not a name we know: better to say so than to guess
  };
  for (const [header, field] of Object.entries(headerCases)) eq(classifyHeader(header), field, `header "${header}"`);
  eq(classifyHeader("Amount incl VAT"), null, "a VAT-inclusive amount is never read as an amount before VAT");
  eq(classifyHeader("Total (including VAT)"), null, "...nor this one");
  eq(classifyHeader("Colour"), null, "unknown header");
  eq(classifyHeader(""), null, "empty header");
  eq(classifyHeader(undefined), null, "missing header");

  // ---- a messy workbook in the style of the real sample ----------------------------------------------
  // (label in column E and not merged, real dates, a formula for the tax, numeric invoice numbers)
  const wb = new ExcelJS.Workbook();
  const input = wb.addWorksheet("Input");
  input.addRow(["Invoice Number", "Invoice Date", "Supplier TIN", "Name of Supplier", "Description of Goods", "Invoice Amount", "Tax Amount"]);
  input.addRow([12143, "06/10/2023", "C06619801113", "ACME HARDWARE", "ELECTRICAL PARTS", 276.32, { formula: "0.14*F2", result: 38.6848 }]);
  input.addRow(["INV-9", day("2023-01-08"), "BW00001766013-00-05-90", "OFFICE SUPPLIES", "STATIONERY", 1850, 259]); // 8 Jan = 1 Aug swapped
  input.addRow(["CN-1", "20/10/2023", "C06619801113", "ACME HARDWARE", "RETURNED PARTS", -100, -14]);
  input.addRow(["NOTE-1", "21/10/2023", "C06619801113", "ACME HARDWARE", "NOTE: total purchases to follow", 50, null]); // 'purchases' in a data row, no tax
  input.addRow([]); // blank
  input.addRow([null, null, null, null, "LOCAL PURCHASES AND EXPENSES", { formula: "SUM(F2:F5)", result: 2076.32 }, { formula: "SUM(G2:G5)", result: 283.6848 }]);
  input.addRow([]);
  input.addRow([]);
  input.addRow(["I003261", "30/09/2023", "0150309-01-5 (NAMIBIA)", "NAMIB TRADING", "SHOWER HEADS", 5000, { formula: "0.14*F10", result: 700 }]);
  input.addRow(["I003262", "01/10/2023", "ZA1234567", "CAPE SUPPLIES", "SPARES", 100, 0]);
  input.addRow([]);
  input.addRow([null, null, null, null, "IMPORTED PURCHASES", { formula: "SUM(F10:F11)", result: 5100 }, { formula: "SUM(G10:G11)", result: 700 }]);
  input.addRow([]);
  input.addRow([null, null, null, null, "Prepared by the accountant"]); // a stray note: ignored

  const output = wb.addWorksheet("OUTPUT"); // sheet names are not case sensitive
  output.addRow(["Invoice Number", "Invoice Date", "Customer TIN", "Name of Customer", "Description of Goods", "Invoice Amount", "Tax Amount"]);
  output.addRow(["INV271023001", "27/10/2023", "n/a", "", "ELECTRIC SHOWER", 1000, 140]);
  output.addRow(["INV281023001", "28/10/2023", "C04401234567", "BUILDERS PTY LTD", "SHOWERS", 2500, 350]);
  output.addRow(["INV291023001", "29/10/2023", "n/a", "EXPORT CLIENT", "EXPORT", 500, 0]);
  output.addRow([]);
  output.addRow([null, null, null, "TOTAL GOODS AND SERVICES SUPPLIED", "TOTAL GOODS AND SERVICES SUPPLIED", { formula: "SUM(F2:F4)", result: 4000 }, { formula: "SUM(G2:G4)", result: 490 }]);
  wb.addWorksheet("Notes").addRow(["this sheet is not part of the schedule"]);

  const messy = await parseImportFile(Buffer.from(await wb.xlsx.writeBuffer()), {});
  eq(messy.format, "schedule", "recognised as a schedule");
  same(messy.sheets.map((s) => `${s.sheetName}:${s.direction}`), ["Input:input", "OUTPUT:output"], "only the Input and Output sheets are read");

  const inSheet = messy.sheets[0];
  eq(inSheet.rows.length, 6, "six purchase rows: four local, two imported (totals, blanks and the note are not rows)");
  same(inSheet.sections.map((s) => [s.kind, s.rowCount]), [["local", 4], ["imported", 2]], "local rows, then imported rows");
  eq(inSheet.sections[0].label, "LOCAL PURCHASES AND EXPENSES", "label found in column E");
  eq(inSheet.sections[0].fileAmountThebe, 207632, "the file's own total (from the formula's saved value)");
  eq(inSheet.sections[0].sumAmountThebe, 207632, "the rows add up to it");
  eq(inSheet.sections[0].amountMatches, true, "amount total matches");
  eq(inSheet.sections[0].vatMatches, true, "VAT total matches within the per-row rounding");
  eq(inSheet.sections[1].amountMatches, true, "imported total matches");
  assert.ok(inSheet.notes.some((n) => n.includes("1 text-only row")), "the stray note was ignored and counted");
  count += 1;
  eq(inSheet.rows.find((x) => x.invoiceNumber === 12143).vat, 38.6848, "a formula cell is read as its saved result");
  eq(inSheet.rows.find((x) => x.invoiceNumber === "NOTE-1").section, "local", "a data row that says 'purchases' in its description is still a data row");

  const outSheet = messy.sheets[1];
  same(outSheet.sections.map((s) => [s.kind, s.rowCount, s.amountMatches]), [["sale", 3, true]], "sales section");

  // ---- rows become line-builder input -------------------------------------------------------------------
  const items = toInputs(messy, { window: augSep, importedSupplyType: "imported_goods", zeroVatAs: "zero", fixSwappedDates: true });
  const pick = (sheet, n) => items.find((i) => i.sheet === sheet && String(i.input.invoiceNumber) === String(n));

  let it = pick("Input", 12143);
  eq(it.input.invoiceNumber, "12143", "numeric invoice numbers become text");
  eq(it.input.amount, "276.32", "amount");
  eq(it.input.vatAmount, "38.68", "the 4-decimal tax is rounded to the thebe");
  eq(it.input.invoiceDate, "2023-10-06", "text date read day first");
  eq(it.input.counterpartyTin, "C06619801113", "TIN");
  eq(it.errors.length, 0, "no errors");

  it = pick("Input", "INV-9");
  eq(it.input.invoiceDate, "2023-08-01", "the swapped date is corrected");
  assert.ok(it.notes.some((n) => n.code === "DATE_SWAPPED_GUESS" && n.from === "2023-01-08" && n.to === "2023-08-01"), "and reported");
  count += 1;

  it = pick("Input", "CN-1");
  eq(it.input.docType, "credit_note", "a negative amount is a credit note");
  eq(it.input.amount, "100.00", "...entered as a positive number");
  eq(it.input.vatAmount, "14.00", "...with a positive tax amount");

  it = pick("Input", "NOTE-1");
  assert.ok(it.notes.some((n) => n.code === "VAT_CALCULATED"), "no tax amount: VAT will be calculated");
  eq(it.input.vatAmount, undefined, "...so none is sent");

  it = pick("Input", "I003261");
  eq(it.input.supplyType, "imported_goods", "rows above the IMPORTED total are imported purchases");
  eq(it.input.counterpartyTin, "0150309-01-5", "the country is split off the tax ID");
  eq(it.input.country, "Namibia", "...and tidied");

  it = pick("Input", "I003262");
  eq(it.input.vatClass, "zero", "0 tax is read as zero-rated by default");
  assert.ok(it.notes.some((n) => n.code === "ZERO_VAT"), "...and reported");
  count += 1;

  const asServices = toInputs(messy, { window: augSep, importedSupplyType: "imported_services" });
  eq(asServices.find((i) => String(i.input.invoiceNumber) === "I003261").input.supplyType, "imported_services", "the imported type is an option");
  const asExempt = toInputs(messy, { window: augSep, zeroVatAs: "exempt" });
  eq(asExempt.find((i) => String(i.input.invoiceNumber) === "I003262").input.vatClass, "exempt", "zeroVatAs=exempt");
  const asStandard = toInputs(messy, { window: augSep, zeroVatAs: "standard" });
  eq(asStandard.find((i) => String(i.input.invoiceNumber) === "I003262").input.vatClass, undefined, "zeroVatAs=standard leaves the class alone");
  const noFix = toInputs(messy, { window: augSep, fixSwappedDates: false });
  eq(noFix.find((i) => i.input.invoiceNumber === "INV-9").input.invoiceDate, "2023-01-08", "fixSwappedDates=false keeps the date as written");

  it = items.find((i) => i.sheet === "OUTPUT" && i.input.invoiceNumber === "INV271023001");
  eq(it.input.direction, "output", "sales");
  eq(it.input.counterpartyTin, undefined, "n/a means no TIN");
  eq(it.input.counterpartyName, undefined, "an empty name is left out");

  // every row of the messy file builds into a valid line
  for (const item of items) {
    assert.strictEqual(item.errors.length, 0, `row ${item.row} should have no parse errors`);
    const built = buildLine(item.input, { profile });
    assert.ok(built.ok, `row ${item.sheet}/${item.row} should build: ${JSON.stringify(built.errors)}`);
  }
  count += 1;

  // ---- row-level errors ---------------------------------------------------------------------------------------
  const bad = new ExcelJS.Workbook();
  const bi = bad.addWorksheet("Input");
  bi.addRow(["Invoice Number", "Invoice Date", "Supplier TIN", "Name of Supplier", "Description", "Invoice Amount", "Tax Amount"]);
  bi.addRow(["A1", "tomorrow", "C1", "X", "d", 100, 14]); // bad date
  bi.addRow(["A2", "01/10/2023", "C1", "X", "d", "abc", 14]); // bad amount
  bi.addRow(["A3", "01/10/2023", "C1", "X", "d", 100, "lots"]); // bad tax
  bi.addRow(["A4", "01/10/2023", "C1", "X", "d", 100, -14]); // opposite signs
  bi.addRow(["A5", "01/10/2023", "C1", "X", "d", 100, 14]); // fine
  const badItems = toInputs(await parseImportFile(Buffer.from(await bad.xlsx.writeBuffer()), {}), {});
  same(badItems.map((i) => i.errors.map((e) => e.field)), [["invoiceDate"], ["amount"], ["vatAmount"], ["vatAmount"], []], "each problem is reported against its row and field");

  // ---- a table from another system -------------------------------------------------------------------------------
  const csv = Buffer.from("Doc No,Date,Customer,Net,VAT\nS-1,05/10/2023,ACME,\"1,000.00\",140.00\nS-2,06/10/2023,BOB,200,28\n");
  const table = await parseImportFile(csv, { direction: "output" });
  eq(table.format, "table", "a CSV is a table");
  eq(table.sheets[0].direction, "output", "the caller says what it holds");
  eq(table.sheets[0].rows.length, 2, "two rows");
  const tableItems = toInputs(table, {});
  eq(tableItems[0].input.amount, "1000.00", "thousands separators inside quotes are read");
  eq(tableItems[0].input.counterpartyName, "ACME", "customer column");
  eq(tableItems[0].input.invoiceNumber, "S-1", "Doc No is the invoice number");
  eq(table.sheets[0].sections[0].kind, "table", "a table has one section");

  await assert.rejects(parseImportFile(csv, {}), (e) => e instanceof ImportFileError && /direction=input/.test(e.message));
  await assert.rejects(parseImportFile(Buffer.from("hello\nworld\n"), { direction: "input" }), (e) => e instanceof ImportFileError && /header/i.test(e.message));
  await assert.rejects(parseImportFile(Buffer.alloc(0), {}), (e) => e instanceof ImportFileError);
  await assert.rejects(parseImportFile(Buffer.from("PK\u0003\u0004 this is not really a zip"), { direction: "input" }), (e) => e instanceof ImportFileError && /Excel/.test(e.message));
  await assert.rejects(parseImportFile(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0]), {}), (e) => e instanceof ImportFileError && /\.xls/.test(e.message));
  count += 5;

  // a sheet with no header row is skipped, but the file still imports if the other sheet is good
  const half = new ExcelJS.Workbook();
  half.addWorksheet("Input").addRow(["nothing", "useful", "here"]);
  const goodOut = half.addWorksheet("Output");
  goodOut.addRow(["Invoice Number", "Invoice Date", "Customer TIN", "Name of Customer", "Description of Goods", "Invoice Amount", "Tax Amount"]);
  goodOut.addRow(["S-1", "01/10/2023", "n/a", "", "x", 100, 14]);
  const halfParsed = await parseImportFile(Buffer.from(await half.xlsx.writeBuffer()), {});
  eq(halfParsed.sheets.length, 1, "the unreadable sheet is skipped");
  assert.ok(halfParsed.warnings[0].includes('Sheet "Input" was skipped'), "and a warning says so");
  count += 1;

  // ---- the round trip: a schedule we export can be imported again ------------------------------------------------
  const L = (extra) => ({ direction: "input", docType: "invoice", supplyType: "local", vatClass: "standard", claimable: true, currency: "BWP", reviewStatus: "confirmed", flags: [], ...extra });
  const exported = [
    L({ invoiceNumber: "12143", invoiceDate: day("2026-10-06"), counterpartyTin: "C06619801113", counterpartyName: "ACME HARDWARE", description: "ELECTRICAL PARTS", amountExclThebe: 27632, vatThebe: 3868 }),
    L({ invoiceNumber: "CN-5", docType: "credit_note", invoiceDate: day("2026-10-22"), counterpartyTin: "C06619801113", counterpartyName: "ACME HARDWARE", description: "RETURNED PARTS", amountExclThebe: -10000, vatThebe: -1400 }),
    L({ invoiceNumber: "IMP-77", invoiceDate: day("2026-10-09"), counterpartyTin: "0150309-01-5", country: "Namibia", supplyType: "imported_goods", counterpartyName: "NAMIB TRADING", description: "SHOWER HEADS", amountExclThebe: 500000, vatThebe: 70000 }),
    L({ invoiceNumber: "ENT-1", invoiceDate: day("2026-10-15"), counterpartyTin: "C0000000001", counterpartyName: "THE GRILL", description: "STAFF LUNCH", claimable: false, amountExclThebe: 20000, vatThebe: 2800 }),
    L({ direction: "output", invoiceNumber: "INV1", invoiceDate: day("2026-10-27"), counterpartyName: "", description: "SHOWER", amountExclThebe: 100000, vatThebe: 14000 }),
    L({ direction: "output", invoiceNumber: "INV2", invoiceDate: day("2026-10-29"), counterpartyTin: "C04401234567", counterpartyName: "BUILDERS", description: "SHOWERS", amountExclThebe: 50000, vatThebe: 0, vatClass: "zero" }),
  ];
  const meta = { businessName: "T", vatNumber: "C1", countryCode: "BW", ratePercent: 14, periodStart: "2026-10-01", periodEnd: "2026-11-30", dueDate: "2026-12-28", periodVersion: 1, generatedAt: "2026-11-07T10:00:00.000Z" };
  const file = await buildScheduleWorkbook({ lines: exported, totals: { meta, reconciliation: {} } });
  const back = await parseImportFile(file, {});
  const backItems = toInputs(back, { window: { start: "2026-10-01", end: "2026-11-30" } });
  const lines = backItems.map((i) => {
    assert.strictEqual(i.errors.length, 0);
    const b = buildLine(i.input, { profile });
    assert.ok(b.ok, JSON.stringify(b.errors));
    return b.line;
  });
  count += 1;
  const find = (n) => lines.find((l) => l.invoiceNumber === n);
  eq(lines.length, 5, "the unclaimed purchase was not on the schedule, so it does not come back");
  eq(find("12143").amountExclThebe, 27632, "round trip: amount");
  eq(find("12143").vatThebe, 3868, "round trip: VAT");
  eq(find("12143").invoiceDate.toISOString().slice(0, 10), "2026-10-06", "round trip: date");
  eq(find("CN-5").docType, "credit_note", "round trip: credit note");
  eq(find("CN-5").amountExclThebe, -10000, "round trip: credit note amount");
  eq(find("CN-5").vatThebe, -1400, "round trip: credit note VAT");
  eq(find("IMP-77").supplyType, "imported_goods", "round trip: imported purchase");
  eq(find("IMP-77").counterpartyTin, "0150309-01-5", "round trip: TIN without the country");
  eq(find("IMP-77").country, "Namibia", "round trip: country");
  eq(find("INV1").counterpartyTin, undefined, "round trip: n/a means no TIN");
  eq(find("INV2").vatClass, "zero", "round trip: zero-rated sale");
  eq(back.sheets.every((s) => s.sections.every((sec) => sec.amountMatches && sec.vatMatches)), true, "round trip: every section total matches");

  console.log(`All ${count} import parser checks passed`);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});