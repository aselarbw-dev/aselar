// Taxation/services/reconcileCalc.test.js
// Run from the Taxation folder:  node services/reconcileCalc.test.js

const assert = require("assert");
const { roundToPula, summarizeRows, finalize, reconcileChain } = require("./reconcileCalc");

let count = 0;
const eq = (actual, expected, label) => {
  assert.strictEqual(actual, expected, `${label}: expected ${expected}, got ${actual}`);
  count += 1;
};

// A row: the totals of all lines sharing the same direction / supply type / VAT class.
const row = (direction, base, vat, extra = {}) => ({
  direction,
  supplyType: "local",
  vatClass: "standard",
  claimable: true,
  reviewStatus: "confirmed",
  base,
  vat,
  count: 1,
  ...extra,
});

// --- rounding to the nearest pula -------------------------------------------
eq(roundToPula(12345), 123, "P123.45 -> P123");
eq(roundToPula(12350), 124, "exactly half a pula rounds up");
eq(roundToPula(12349), 123, "just under half rounds down");
eq(roundToPula(-12350), -124, "negative half rounds away from zero");
eq(roundToPula(-12349), -123, "negative just under half");
eq(roundToPula(0), 0, "zero");
eq(Object.is(roundToPula(-10), 0), true, "tiny negative is plain 0");

// --- an empty period --------------------------------------------------------
let r = finalize(summarizeRows([]), 0);
eq(r.exact.net, 0, "empty period: net");
eq(r.exact.payable, 0, "empty period: payable");
eq(r.exact.closingCredit, 0, "empty period: closing credit");
eq(r.rounded.net, 0, "empty period: rounded net");

// --- the Sellex Aug-Sep sample ------------------------------------------------
// Output VAT 63,750.40. Input VAT 33,357.52 local + 251,492.78 imported. (Bases are 100/14 of the VAT.)
const augSep = [
  row("output", 45536000, 6375040),
  row("input", 23826800, 3335752),
  row("input", 179637700, 25149278, { supplyType: "imported_goods" }),
];
const augSepResult = reconcileChain(["augsep"], new Map([["augsep", augSep]]), 0)[0];
eq(augSepResult.exact.outputVat, 6375040, "Aug-Sep output VAT");
eq(augSepResult.exact.inputVat, 28485030, "Aug-Sep input VAT (local + imported)");
eq(augSepResult.exact.net, -22109990, "Aug-Sep net: a credit of P221,099.90");
eq(augSepResult.exact.payable, 0, "Aug-Sep nothing payable");
eq(augSepResult.exact.closingCredit, 22109990, "Aug-Sep credit carried forward");
eq(augSepResult.rounded.outputVat, 63750, "Aug-Sep rounded output VAT");
eq(augSepResult.rounded.inputVat, 284850, "Aug-Sep rounded input VAT (rounded once, from the exact total)");
eq(augSepResult.rounded.net, -221100, "Aug-Sep rounded net");
eq(augSepResult.rounded.credit, 221100, "Aug-Sep rounded credit");
eq(augSepResult.rounded.payable, 0, "Aug-Sep rounded payable");
// The detail rows are each rounded on their own, so they can differ from the total by a pula.
eq(augSepResult.rounded.detail.localInputVat, 33358, "detail: local input VAT");
eq(augSepResult.rounded.detail.importedGoodsVat, 251493, "detail: imported goods VAT");
eq(
  augSepResult.rounded.detail.localInputVat + augSepResult.rounded.detail.importedGoodsVat,
  284851,
  "the detail rows add to 284,851 while the total box says 284,850 (expected; ask BURS which they want)"
);
eq(augSepResult.refund.consecutiveCreditPeriods, 1, "first credit period");
eq(augSepResult.refund.maybeClaimable, false, "one credit period is not enough");

// --- ...and the Oct-Nov sample, carrying the credit forward -------------------
// Output VAT 341.77, input VAT 13,254.74 local.
const octNov = [row("output", 244121, 34177), row("input", 9467671, 1325474)];
const chain = reconcileChain(
  ["augsep", "octnov"],
  new Map([
    ["augsep", augSep],
    ["octnov", octNov],
  ]),
  0
);
const octNovResult = chain[1];
eq(octNovResult.exact.openingCredit, 22109990, "Oct-Nov starts with the Aug-Sep credit");
eq(octNovResult.exact.netBeforeCredit, -1291297, "Oct-Nov on its own: a credit of P12,912.97");
eq(octNovResult.exact.net, -23401287, "Oct-Nov after the credit brought forward: P234,012.87");
eq(octNovResult.exact.closingCredit, 23401287, "Oct-Nov credit carried forward");
eq(octNovResult.rounded.openingCredit, 221100, "rounded opening credit matches last period's rounded credit");
eq(octNovResult.rounded.net, -234013, "Oct-Nov rounded net");
eq(octNovResult.rounded.credit, 234013, "Oct-Nov rounded credit");
eq(octNovResult.refund.consecutiveCreditPeriods, 2, "two credit periods in a row");
eq(octNovResult.refund.maybeClaimable, true, "a refund may be claimable (to be confirmed)");

// a period with VAT payable breaks the run
const payable = [row("output", 10000000, 1400000), row("input", 100000, 14000)];
const broken = reconcileChain(
  ["a", "b", "c"],
  new Map([["a", augSep], ["b", payable], ["c", octNov]]),
  0
);
eq(broken[1].exact.payable, 0, "b: the old credit absorbs the VAT: nothing payable");
eq(broken[1].exact.closingCredit, 22109990 - (1400000 - 14000), "b: the credit is used up in part");
const bigPayable = [row("output", 100000000, 14000000)];
const broken2 = reconcileChain(["a", "b", "c"], new Map([["a", augSep], ["b", bigPayable], ["c", octNov]]), 0);
eq(broken2[1].exact.payable, 0, "b2: the credit is bigger than this period's VAT, so nothing is payable");
eq(broken2[1].exact.closingCredit, 22109990 - 14000000, "b2: credit left over");

const pays = reconcileChain(["a", "b"], new Map([["a", augSep], ["b", [row("output", 300000000, 42000000)]]]), 0);
eq(pays[1].exact.payable, 42000000 - 22109990, "VAT payable after using the credit");
eq(pays[1].exact.closingCredit, 0, "no credit left");
eq(pays[1].refund.consecutiveCreditPeriods, 0, "a payable period resets the run");
eq(pays[1].refund.maybeClaimable, false, "so no refund flag");

// --- opening credit against a positive net ------------------------------------
const sales = [row("output", 714286, 100000)];
r = finalize(summarizeRows(sales), 30000);
eq(r.exact.payable, 70000, "credit reduces what is payable");
eq(r.exact.closingCredit, 0, "and is used up");
r = finalize(summarizeRows(sales), 150000);
eq(r.exact.payable, 0, "credit bigger than the VAT: nothing payable");
eq(r.exact.closingCredit, 50000, "the rest is carried forward");

// --- zero-rated and exempt sales -----------------------------------------------
r = summarizeRows([
  row("output", 100000, 14000),
  row("output", 50000, 0, { vatClass: "zero" }),
  row("output", 20000, 0, { vatClass: "exempt" }),
]);
eq(r.totals.outputBase, 170000, "all three kinds count in the sales total");
eq(r.totals.outputVat, 14000, "only standard-rated sales carry VAT");
eq(r.breakdown.output.zeroRated.base, 50000, "zero-rated base shown separately");
eq(r.breakdown.output.exempt.base, 20000, "exempt base shown separately");

// --- credit notes (negative amounts) -------------------------------------------
r = summarizeRows([row("output", 100000, 14000), row("output", -10000, -1400)]);
eq(r.totals.outputVat, 12600, "a credit note reduces the VAT");
eq(r.totals.outputBase, 90000, "and the sales total");

// --- purchases that cannot be claimed -------------------------------------------
r = summarizeRows([row("input", 100000, 14000), row("input", 50000, 7000, { claimable: false })]);
eq(r.totals.inputVat, 14000, "unclaimable VAT is left out of the claim");
eq(r.totals.inputBase, 100000, "and out of the purchases total");
eq(r.breakdown.input.notClaimed.vat, 7000, "but it is listed");
r = summarizeRows([row("input", 100000, 14000, { claimable: undefined })]);
eq(r.totals.inputVat, 14000, "a line with no claimable value counts as claimable");
r = summarizeRows([row("input", 100000, 14000, { claimable: null })]);
eq(r.totals.inputVat, 14000, "null counts as claimable too");

// --- reverse charge on imported services ----------------------------------------
const service = row("input", 1350000, 189000, { supplyType: "imported_services" });
r = finalize(summarizeRows([service]), 0);
eq(r.exact.outputVat, 189000, "the VAT is declared as output tax on the business itself");
eq(r.exact.inputVat, 189000, "and claimed back as input tax");
eq(r.exact.net, 0, "so the net effect is nil");

const unclaimable = row("input", 1350000, 189000, { supplyType: "imported_services", claimable: false });
r = finalize(summarizeRows([unclaimable]), 0);
eq(r.exact.outputVat, 189000, "output VAT is still declared when the input cannot be claimed");
eq(r.exact.inputVat, 0, "but nothing is claimed back");
eq(r.exact.payable, 189000, "so it is payable");
r = summarizeRows([service]);
eq(r.breakdown.reverseCharge.vat, 189000, "reverse charge shown separately");
eq(r.breakdown.reverseCharge.count, 1, "with its line count");
eq(r.breakdown.input.importedServices.vat, 189000, "imported services input shown separately");

// imported goods are NOT reverse-charged (their VAT is paid at the border)
r = finalize(summarizeRows([row("input", 100000, 14000, { supplyType: "imported_goods" })]), 0);
eq(r.exact.outputVat, 0, "imported goods have no reverse charge");
eq(r.exact.inputVat, 14000, "their VAT is claimed as input");

// --- line counts and pending lines -----------------------------------------------
r = summarizeRows([
  row("output", 100, 14, { count: 3 }),
  row("input", 100, 14, { reviewStatus: "pending", count: 2 }),
  row("input", 100, 14, { reviewStatus: "confirmed", count: 4 }),
]);
eq(r.lines, 9, "total lines");
eq(r.pendingLines, 2, "lines still to review");

// --- the rounded net always equals the difference of the rounded boxes -------------
r = finalize(summarizeRows([row("output", 1, 12345), row("input", 1, 5555)]), 2222);
eq(r.rounded.net, r.rounded.outputVat - r.rounded.inputVat - r.rounded.openingCredit, "the form adds up");
eq(r.rounded.outputVat, 123, "P123.45 -> 123");
eq(r.rounded.inputVat, 56, "P55.55 -> 56");
eq(r.rounded.openingCredit, 22, "P22.22 -> 22");

// --- inputs are never changed --------------------------------------------------------
const original = [row("output", 100000, 14000), row("input", 50000, 7000)];
const snapshot = JSON.stringify(original);
summarizeRows(original);
finalize(summarizeRows(original), 100);
reconcileChain(["x"], new Map([["x", original]]), 100);
eq(JSON.stringify(original), snapshot, "the rows are left untouched");

console.log(`All ${count} reconciliation checks passed`);