// Taxation/services/excelExport.test.js
// Run from the Taxation folder (needs the exceljs package installed):  node services/excelExport.test.js

const assert = require("assert");
const ExcelJS = require("exceljs");
const { summarizeRows, reconcileChain } = require("./reconcileCalc");
const {
  periodLabel,
  scheduleFileName,
  reportFileName,
  buildScheduleData,
  buildScheduleWorkbook,
  buildReportWorkbook,
} = require("./excelExport");

let count = 0;
const eq = (actual, expected, label) => {
  assert.strictEqual(actual, expected, `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  count += 1;
};
const near = (actual, expected, label) => {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: expected ${expected}, got ${actual}`);
  count += 1;
};

// ---- fixtures ---------------------------------------------------------------
const day = (iso) => new Date(`${iso}T00:00:00.000Z`);
const L = (extra) => ({
  direction: "input",
  docType: "invoice",
  supplyType: "local",
  vatClass: "standard",
  claimable: true,
  currency: "BWP",
  reviewStatus: "confirmed",
  flags: [],
  ...extra,
});

const lines = [
  // local purchases
  L({ invoiceNumber: "12143", invoiceDate: day("2026-10-06"), counterpartyTin: "C06619801113", counterpartyName: "ACME HARDWARE", description: "ELECTRICAL PARTS", amountExclThebe: 27632, vatThebe: 3868 }),
  L({ invoiceNumber: "INV-2201", invoiceDate: day("2026-10-20"), counterpartyTin: "BW00001766013", counterpartyName: "OFFICE SUPPLIES (PTY) LTD", description: "STATIONERY", amountExclThebe: 185000, vatThebe: 25900 }),
  L({ invoiceNumber: "CN-5", docType: "credit_note", invoiceDate: day("2026-10-22"), counterpartyTin: "C06619801113", counterpartyName: "ACME HARDWARE", description: "RETURNED PARTS", amountExclThebe: -10000, vatThebe: -1400 }),
  // imported purchases
  L({ invoiceNumber: "SA-2291", invoiceDate: day("2026-10-05"), counterpartyTin: "ZA1234567", country: "South Africa", supplyType: "imported_services", counterpartyName: "EXAMPLE SUPPLIER SA", description: "SOFTWARE LICENCE", currency: "USD", amountExclThebe: 1350000, vatThebe: 189000 }),
  L({
    invoiceNumber: "IMP-77",
    invoiceDate: day("2026-10-09"),
    counterpartyTin: "0150309-01-5",
    country: "Namibia",
    supplyType: "imported_goods",
    counterpartyName: "NAMIB TRADING",
    description: "SHOWER HEADS",
    amountExclThebe: 500000,
    vatThebe: 70000,
    flags: [{ code: "IMPORT_VAT_ESTIMATED", severity: "warning", message: "Import VAT is P700.00, the 14% estimate. If you have the customs figure, enter it.", resolved: true, resolvedAt: day("2026-11-03") }],
  }),
  // a purchase that is not being claimed
  L({ invoiceNumber: "ENT-1", invoiceDate: day("2026-10-15"), counterpartyTin: "C0000000001", counterpartyName: "THE GRILL", description: "STAFF LUNCH", claimable: false, amountExclThebe: 20000, vatThebe: 2800 }),
  // sales
  L({ direction: "output", invoiceNumber: "INV271026001", invoiceDate: day("2026-10-27"), counterpartyName: "", description: "ELECTRIC SHOWER", amountExclThebe: 100000, vatThebe: 14000 }),
  L({ direction: "output", invoiceNumber: "INV281026001", invoiceDate: day("2026-10-28"), counterpartyTin: "C04401234567", counterpartyName: "BUILDERS PTY LTD", description: "ELECTRIC SHOWERS x5", amountExclThebe: 250000, vatThebe: 35000 }),
  L({ direction: "output", invoiceNumber: "INV291026001", invoiceDate: day("2026-10-29"), counterpartyName: "EXPORT CLIENT", description: "EXPORT", vatClass: "zero", amountExclThebe: 50000, vatThebe: 0 }),
];

const meta = {
  businessName: "TEST BUSINESS (PTY) LTD",
  vatNumber: "C06619801113",
  countryCode: "BW",
  ratePercent: 14,
  periodStart: "2026-10-01",
  periodEnd: "2026-11-30",
  dueDate: "2026-12-28",
  periodVersion: 1,
  generatedAt: "2026-11-07T10:00:00.000Z",
};

// the same grouped totals the database would hand to the reconciliation
function reconciliationFor(linesIn, opening = 0) {
  const groups = new Map();
  for (const l of linesIn.filter((x) => x.reviewStatus !== "rejected")) {
    const key = [l.direction, l.supplyType, l.vatClass, l.claimable, l.reviewStatus].join("|");
    if (!groups.has(key)) groups.set(key, { direction: l.direction, supplyType: l.supplyType, vatClass: l.vatClass, claimable: l.claimable, reviewStatus: l.reviewStatus, base: 0, vat: 0, count: 0 });
    const g = groups.get(key);
    g.base += l.amountExclThebe; g.vat += l.vatThebe; g.count += 1;
  }
  const { periodId, ...rec } = reconcileChain(["p"], new Map([["p", [...groups.values()]]]), opening)[0]; // eslint-disable-line no-unused-vars
  return rec;
}
const snapshotOf = (linesIn, opening = 0, metaIn = meta) => ({
  lines: linesIn,
  totals: { meta: metaIn, reconciliation: reconciliationFor(linesIn, opening) },
});

const load = async (buffer) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
};
const formulaOf = (cell) => cell.value && cell.value.formula;
// The saved value of a formula cell. (exceljs leaves `result` out when it READS back a result of
// exactly 0, even though the file does contain it, so a missing result on a formula counts as 0.)
const resultOf = (cell) => {
  if (!cell.value || cell.value.formula === undefined) return undefined;
  return cell.value.result === undefined ? 0 : cell.value.result;
};

(async () => {
  // ---- names ------------------------------------------------------------------
  eq(periodLabel(meta), "OCT-NOV_2026", "two-month label");
  eq(periodLabel({ ...meta, periodStart: "2026-10-01", periodEnd: "2026-10-31" }), "OCT_2026", "monthly label");
  eq(periodLabel({ ...meta, periodStart: "2026-12-01", periodEnd: "2027-01-31" }), "DEC-JAN_2027", "label across a year end");
  eq(scheduleFileName(meta), "INVOICE_SCHEDULE_OCT-NOV_2026.xlsx", "schedule file name");
  eq(reportFileName(meta), "RECONCILIATION_OCT-NOV_2026.xlsx", "report file name");

  // ---- the schedule: data -----------------------------------------------------
  const snap = snapshotOf(lines);
  const before = JSON.stringify(snap);
  const data = buildScheduleData(snap);
  eq(JSON.stringify(snap), before, "building the data leaves the snapshot untouched");
  eq(data.local.length, 3, "three local purchases (the unclaimed one is left out)");
  eq(data.imported.length, 2, "two imported purchases");
  eq(data.outputs.length, 3, "three sales");
  eq(data.totals.local.vatThebe, 3868 + 25900 - 1400, "local VAT total includes the credit note");
  eq(data.totals.imported.amountThebe, 1850000, "imported base total");

  // ---- the schedule: workbook -------------------------------------------------
  const wb = await load(await buildScheduleWorkbook(snap));
  eq(JSON.stringify(wb.worksheets.map((w) => w.name)), JSON.stringify(["Input", "Output"]), "exactly two sheets, as BURS expects");

  const input = wb.getWorksheet("Input");
  eq(JSON.stringify([1, 2, 3, 4, 5, 6, 7].map((c) => input.getCell(1, c).value)),
    JSON.stringify(["Invoice Number", "Invoice Date", "Supplier TIN", "Name of Supplier", "Description of Goods", "Invoice Amount", "Tax Amount"]),
    "Input headers match the sample");
  eq(input.getCell("A1").font.bold, true, "headers are bold");
  eq(input.getCell("A1").border.bottom.style, "medium", "headers have the medium bottom border");
  eq(input.getCell("A1").font.name, "Calibri", "Calibri, like the sample");

  // local rows 2-4, blank row 5, total row 6
  eq(input.getCell("A2").value, "12143", "invoice number is text");
  eq(input.getCell("B2").value, "06/10/2026", "date is text, day first");
  eq(input.getCell("C2").value, "C06619801113", "supplier TIN");
  eq(input.getCell("D2").value, "ACME HARDWARE", "supplier name");
  eq(input.getCell("E2").value, "ELECTRICAL PARTS", "description");
  near(input.getCell("F2").value, 276.32, "amount in pula");
  near(input.getCell("G2").value, 38.68, "tax in pula");
  eq(input.getCell("G2").numFmt, "#,##0.00", "amounts show two decimals");
  near(input.getCell("F4").value, -100, "credit note amount is negative");
  near(input.getCell("G4").value, -14, "credit note tax is negative");
  eq(input.getCell("A5").value, null, "one blank row before the total");
  eq(input.getCell("D6").value, "TOTAL LOCAL PURCHASES AND EXPENSES", "local total label");
  eq(input.getCell("E6").master.address, "D6", "the label spans D:E");
  eq(input.getCell("D6").alignment.horizontal, "right", "label is right-aligned");
  eq(input.getCell("D6").font.bold, true, "label is bold");
  eq(formulaOf(input.getCell("F6")), "SUM(F2:F4)", "local amount total is a SUM");
  eq(formulaOf(input.getCell("G6")), "SUM(G2:G4)", "local tax total is a SUM");
  near(resultOf(input.getCell("F6")), 2026.32, "local amount total, saved value");
  near(resultOf(input.getCell("G6")), 283.68, "local tax total, saved value");

  // two blank rows, then the imported section from row 9
  eq(input.getCell("A7").value, null, "blank row 7");
  eq(input.getCell("A8").value, null, "blank row 8");
  eq(input.getCell("A9").value, "SA-2291", "imported rows start at row 9");
  eq(input.getCell("C9").value, "ZA1234567 (SOUTH AFRICA)", "imported TIN shows the country, like the sample");
  eq(input.getCell("C10").value, "0150309-01-5 (NAMIBIA)", "second imported TIN");
  eq(input.getCell("A11").value, null, "blank row before the imported total");
  eq(input.getCell("D12").value, "TOTAL IMPORTED PURCHASES", "imported total label");
  eq(formulaOf(input.getCell("F12")), "SUM(F9:F10)", "imported total is a SUM");
  near(resultOf(input.getCell("F12")), 18500, "imported amount total");
  near(resultOf(input.getCell("G12")), 2590, "imported tax total");

  // the purchase that is not claimed is not on the schedule
  let found = false;
  input.eachRow((row) => row.eachCell((cell) => { if (cell.value === "ENT-1") found = true; }));
  eq(found, false, "unclaimed purchases are not on the upload");

  const output = wb.getWorksheet("Output");
  eq(output.getCell("C1").value, "Customer TIN", "Output headers");
  eq(output.getCell("D1").value, "Name of Customer", "Output headers");
  eq(output.getCell("C2").value, "n/a", "consumer sales show n/a");
  eq(output.getCell("C3").value, "C04401234567", "customer TIN");
  eq(output.getCell("A4").value, "INV291026001", "zero-rated sale is listed too");
  near(output.getCell("G4").value, 0, "zero-rated sale carries no tax");
  eq(output.getCell("D6").value, "TOTAL GOODS AND SERVICES SUPPLIED", "output total label");
  eq(formulaOf(output.getCell("F6")), "SUM(F2:F4)", "output total is a SUM");
  near(resultOf(output.getCell("F6")), 4000, "sales amount total");
  near(resultOf(output.getCell("G6")), 490, "sales tax total");

  // ---- schedule edge cases -----------------------------------------------------
  const localOnly = await load(await buildScheduleWorkbook(snapshotOf(lines.filter((l) => l.supplyType === "local"))));
  let hasImportedLabel = false;
  localOnly.getWorksheet("Input").eachRow((row) => row.eachCell((c) => { if (c.value === "TOTAL IMPORTED PURCHASES") hasImportedLabel = true; }));
  eq(hasImportedLabel, false, "no imported section when there are no imports");

  const nil = await load(await buildScheduleWorkbook(snapshotOf([])));
  eq(nil.getWorksheet("Input").getCell("D3").value, "TOTAL LOCAL PURCHASES AND EXPENSES", "a nil return still has its total row");
  eq(nil.getWorksheet("Input").getCell("F3").value, 0, "...with a plain 0");
  eq(nil.getWorksheet("Output").getCell("D3").value, "TOTAL GOODS AND SERVICES SUPPLIED", "nil sales total row");
  eq(nil.getWorksheet("Output").getCell("G3").value, 0, "...with a plain 0");

  const importOnly = await load(await buildScheduleWorkbook(snapshotOf(lines.filter((l) => l.supplyType === "imported_goods"))));
  eq(importOnly.getWorksheet("Input").getCell("A2").value, "IMP-77", "imports only: the section starts at row 2");
  eq(importOnly.getWorksheet("Input").getCell("D4").value, "TOTAL IMPORTED PURCHASES", "imports only: its total follows after one blank row");

  // a line with nothing optional filled in still writes cleanly
  const sparse = await load(await buildScheduleWorkbook(snapshotOf([L({ amountExclThebe: 100, vatThebe: 14 })])));
  eq(sparse.getWorksheet("Input").getCell("A2").value, "", "missing invoice number is an empty cell");
  eq(sparse.getWorksheet("Input").getCell("B2").value, "", "missing date is an empty cell");

  // ---- the report ----------------------------------------------------------------
  const rec = snap.totals.reconciliation;
  const report = await load(await buildReportWorkbook(snap));
  eq(JSON.stringify(report.worksheets.map((w) => w.name)), JSON.stringify(["Summary", "Reviewed issues", "Not claimed"]), "report sheets");

  const s = report.getWorksheet("Summary");
  eq(s.getCell("A1").value, "VAT RECONCILIATION", "title");
  eq(s.getCell("A2").value, "TEST BUSINESS (PTY) LTD", "business name");
  eq(s.getCell("A3").value, "VAT number: C06619801113", "VAT number");
  eq(s.getCell("A4").value, "Period: 01/10/2026 to 30/11/2026", "period");
  eq(s.getCell("A5").value, "Due date: 28/12/2026", "due date");
  eq(s.getCell("A6").value, "Prepared by Aselar on 07/11/2026 (version 1)", "prepared line");

  near(s.getCell("B11").value, rec.breakdown.output.standard.vat / 100, "standard sales VAT");
  near(s.getCell("B12").value, rec.breakdown.reverseCharge.vat / 100, "reverse charge VAT");
  eq(formulaOf(s.getCell("B13")), "SUM(B11:B12)", "total output VAT formula");
  near(resultOf(s.getCell("B13")), rec.exact.outputVat / 100, "total output VAT value");
  eq(formulaOf(s.getCell("C13")), "ROUND(B13,0)", "rounded output VAT is a ROUND of the exact figure");
  eq(resultOf(s.getCell("C13")), rec.rounded.outputVat, "rounded output VAT value");
  near(s.getCell("B16").value, rec.breakdown.input.local.vat / 100, "local input VAT");
  near(s.getCell("B17").value, rec.breakdown.input.importedGoods.vat / 100, "imported goods VAT");
  near(s.getCell("B18").value, rec.breakdown.input.importedServices.vat / 100, "imported services VAT");
  eq(formulaOf(s.getCell("B19")), "SUM(B16:B18)", "total input VAT formula");
  near(resultOf(s.getCell("B19")), rec.exact.inputVat / 100, "total input VAT value");
  eq(resultOf(s.getCell("C19")), rec.rounded.inputVat, "rounded input VAT value");
  eq(formulaOf(s.getCell("B24")), "B22-B23", "net formula");
  near(resultOf(s.getCell("B24")), rec.exact.net / 100, "exact net value");
  eq(formulaOf(s.getCell("C24")), "C22-C23", "the rounded net is the difference of the rounded boxes");
  eq(resultOf(s.getCell("C24")), rec.rounded.net, "rounded net value");
  near(resultOf(s.getCell("B25")), rec.exact.payable / 100, "payable value");
  eq(resultOf(s.getCell("C26")), rec.rounded.credit, "rounded credit value");

  const notes = [];
  for (let r = 29; r < 40; r += 1) if (s.getCell(`A${r}`).value) notes.push(String(s.getCell(`A${r}`).value));
  assert.ok(notes.some((n) => n.includes("3 sale line(s) and 6 purchase line(s)")), "line counts note: " + notes.join(" | "));
  count += 1;
  assert.ok(notes.some((n) => n.includes("1 imported purchase(s) use the standard-rate estimate")), "estimate note");
  count += 1;
  assert.ok(notes.some((n) => n.includes("1 purchase(s) were marked as not claimable")), "not-claimed note");
  count += 1;
  assert.ok(notes.some((n) => n.startsWith("Reverse charge")), "reverse charge note");
  count += 1;
  assert.ok(!notes.some((n) => n.includes("refund may be claimable")), "no refund note while there is no credit run");
  count += 1;

  // a credit run adds the refund note
  const withCredit = snapshotOf([L({ amountExclThebe: 1000000, vatThebe: 140000 })], 0);
  withCredit.totals.reconciliation.refund = { consecutiveCreditPeriods: 2, maybeClaimable: true };
  const reportCredit = await load(await buildReportWorkbook(withCredit));
  const creditNotes = [];
  for (let r = 29; r < 40; r += 1) {
    const v = reportCredit.getWorksheet("Summary").getCell(`A${r}`).value;
    if (v) creditNotes.push(String(v));
  }
  assert.ok(creditNotes.some((n) => n.includes("credit period number 2 in a row")), "refund note appears: " + creditNotes.join(" | "));
  count += 1;

  const issues = report.getWorksheet("Reviewed issues");
  eq(issues.getCell("A2").value, "Purchase", "reviewed issue type");
  eq(issues.getCell("B2").value, "IMP-77", "reviewed issue invoice");
  eq(issues.getCell("D2").value, "IMPORT_VAT_ESTIMATED", "reviewed issue code");
  eq(issues.getCell("F2").value, "03/11/2026", "reviewed on");

  const notClaimed = report.getWorksheet("Not claimed");
  eq(notClaimed.getCell("A2").value, "ENT-1", "not-claimed invoice");
  near(notClaimed.getCell("F2").value, 28, "VAT not claimed");

  const empty = await load(await buildReportWorkbook(snapshotOf([])));
  eq(empty.getWorksheet("Reviewed issues").getCell("A2").value, "No issues were raised for this period.", "empty issues message");
  eq(empty.getWorksheet("Not claimed").getCell("A2").value, "Every purchase in this period was claimed.", "empty not-claimed message");
  eq(resultOf(empty.getWorksheet("Summary").getCell("B24")), 0, "an empty period nets to zero");

  console.log(`All ${count} Excel export checks passed`);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});