// Taxation/services/verificationRules.test.js
// Run from the Taxation folder:  node services/verificationRules.test.js

const assert = require("assert");
const { checkLine, mergeFlags, unresolvedBlockers, acknowledgeWarnings } = require("./verificationRules");

// The Oct-Nov 2026 period (Botswana local time: 1 Oct 00:00 to 30 Nov 23:59:59.999).
const period = {
  periodStart: new Date("2026-09-30T22:00:00.000Z"),
  periodEnd: new Date("2026-11-30T21:59:59.999Z"),
};
const profile = { ratePercent: 14, lateClaimPolicy: "warn" };
const now = new Date("2026-11-02T10:00:00.000Z");
const ctx = (extra = {}) => ({ profile, period, now, ...extra });

// A clean purchase: P276.32 + P38.68 VAT, supplier TIN, number and date all present.
const cleanInput = () => ({
  direction: "input",
  docType: "invoice",
  invoiceNumber: "INV-1",
  invoiceDate: new Date("2026-10-12T00:00:00.000Z"),
  counterpartyName: "Example Supplies",
  counterpartyTin: "C06619801113",
  supplyType: "local",
  currency: "BWP",
  amountExclThebe: 27632,
  vatThebe: 3868,
  vatClass: "standard",
  claimable: true,
  reviewStatus: "pending",
});
const cleanOutput = () => ({ ...cleanInput(), direction: "output", counterpartyTin: undefined });

let count = 0;
const codes = (line, context = ctx()) => checkLine(line, context).map((f) => f.code);
const expectCodes = (line, expected, label, context = ctx()) => {
  assert.deepStrictEqual(codes(line, context), expected, label);
  count += 1;
};
const severityOf = (line, code, context = ctx()) => checkLine(line, context).find((f) => f.code === code).severity;
const eq = (actual, expected, label) => {
  assert.strictEqual(actual, expected, `${label}: expected ${expected}, got ${actual}`);
  count += 1;
};

// --- a clean line raises nothing --------------------------------------------
expectCodes(cleanInput(), [], "clean purchase");
expectCodes(cleanOutput(), [], "clean sale (no customer TIN is normal for consumer sales)");

// --- missing basics ---------------------------------------------------------
expectCodes({ ...cleanInput(), invoiceNumber: undefined }, ["MISSING_INVOICE_NUMBER"], "no invoice number");
expectCodes({ ...cleanInput(), invoiceNumber: "   " }, ["MISSING_INVOICE_NUMBER"], "blank invoice number");
expectCodes({ ...cleanInput(), invoiceDate: undefined }, ["MISSING_DATE"], "no date");
expectCodes({ ...cleanInput(), counterpartyTin: undefined }, ["MISSING_TIN"], "purchase without supplier TIN");
expectCodes({ ...cleanInput(), counterpartyTin: undefined, claimable: false }, [], "not claimable: TIN not needed");
eq(severityOf({ ...cleanInput(), invoiceNumber: undefined }, "MISSING_INVOICE_NUMBER"), "blocker", "missing number is a blocker");
eq(severityOf({ ...cleanInput(), counterpartyTin: undefined }, "MISSING_TIN"), "blocker", "missing TIN is a blocker");

// --- VAT mismatch -----------------------------------------------------------
expectCodes({ ...cleanInput(), vatThebe: 3869 }, [], "1 thebe off is within tolerance");
expectCodes({ ...cleanInput(), vatThebe: 3870 }, [], "2 thebe off is within tolerance");
expectCodes({ ...cleanInput(), vatThebe: 3871 }, ["VAT_MISMATCH"], "3 thebe off is a mismatch");
expectCodes({ ...cleanInput(), vatThebe: 3880 }, ["VAT_MISMATCH"], "12 thebe off");
expectCodes({ ...cleanInput(), vatThebe: 0 }, ["VAT_MISMATCH"], "no VAT on a standard-rated line");
expectCodes({ ...cleanOutput(), vatThebe: 3880 }, ["VAT_MISMATCH"], "also checked on sales");
eq(severityOf({ ...cleanInput(), vatThebe: 3880 }, "VAT_MISMATCH"), "blocker", "mismatch is a blocker");

const mismatch = checkLine({ ...cleanInput(), vatThebe: 3880 }, ctx())[0];
assert.ok(mismatch.message.includes("P38.80") && mismatch.message.includes("P38.68") && mismatch.message.includes("P276.32"));
count += 1;

// credit notes mirror invoices
expectCodes({ ...cleanInput(), docType: "credit_note", amountExclThebe: -27632, vatThebe: -3868 }, [], "exact credit note");
expectCodes({ ...cleanInput(), docType: "credit_note", amountExclThebe: -27632, vatThebe: -3880 }, ["VAT_MISMATCH"], "credit note mismatch");

// not checked where the plain rate does not apply
expectCodes({ ...cleanInput(), vatClass: "zero", vatThebe: 0 }, [], "zero-rated");
expectCodes({ ...cleanInput(), vatClass: "exempt", vatThebe: 0 }, [], "exempt");
expectCodes({ ...cleanInput(), currency: "USD", vatThebe: 5000 }, [], "foreign currency lines are not checked against 14%");
expectCodes(
  { ...cleanInput(), supplyType: "imported_services", country: "Austria", vatThebe: 5000 },
  [],
  "imported services are not checked against 14%"
);

// --- duplicates -------------------------------------------------------------
expectCodes(cleanInput(), ["DUPLICATE_INVOICE"], "duplicate found by the service", ctx({ duplicateCount: 1 }));
expectCodes(cleanInput(), [], "no duplicates", ctx({ duplicateCount: 0 }));
eq(severityOf(cleanInput(), "DUPLICATE_INVOICE", ctx({ duplicateCount: 2 })), "blocker", "duplicate is a blocker");

// --- date against the period ------------------------------------------------
const dated = (iso) => ({ ...cleanInput(), invoiceDate: new Date(iso) });
expectCodes(dated("2026-10-01T00:00:00.000Z"), [], "first day of the period");
// (the clock is set after the period ends, otherwise 30 Nov would rightly count as a future date)
expectCodes(dated("2026-11-30T00:00:00.000Z"), [], "last day of the period", ctx({ now: new Date("2026-12-05T10:00:00.000Z") }));
expectCodes(dated("2026-09-30T00:00:00.000Z"), ["DATE_OUTSIDE_PERIOD"], "day before the period");
expectCodes(dated("2026-12-01T00:00:00.000Z"), ["DATE_OUTSIDE_PERIOD"], "day after the period (and not yet future)", ctx({ now: new Date("2026-12-05T10:00:00.000Z") }));
eq(severityOf(dated("2026-09-30T00:00:00.000Z"), "DATE_OUTSIDE_PERIOD"), "warning", "late claim is a warning by default");

const strict = ctx({ profile: { ratePercent: 14, lateClaimPolicy: "block" } });
eq(severityOf(dated("2026-09-30T00:00:00.000Z"), "DATE_OUTSIDE_PERIOD", strict), "blocker", "late purchase blocks when the business says so");
eq(
  severityOf({ ...cleanOutput(), invoiceDate: new Date("2026-09-30T00:00:00.000Z") }, "DATE_OUTSIDE_PERIOD", strict),
  "warning",
  "the late-claim policy only applies to purchases"
);

const late = checkLine(dated("2026-09-30T00:00:00.000Z"), ctx())[0];
assert.ok(late.message.includes("2026-09-30") && late.message.includes("2026-10-01") && late.message.includes("2026-11-30"));
count += 1;

// --- future dates (compared by local calendar day) --------------------------
expectCodes(dated("2026-11-03T00:00:00.000Z"), ["FUTURE_DATE"], "tomorrow");
expectCodes(dated("2026-11-02T00:00:00.000Z"), [], "today");
// 00:30 on 2 Nov in Botswana is still 1 Nov 22:30 UTC: an invoice dated 2 Nov is not in the future.
expectCodes(dated("2026-11-02T00:00:00.000Z"), [], "dated today, just after local midnight", ctx({ now: new Date("2026-11-01T22:30:00.000Z") }));
expectCodes(dated("2026-11-03T00:00:00.000Z"), ["FUTURE_DATE"], "dated tomorrow, just after local midnight", ctx({ now: new Date("2026-11-01T22:30:00.000Z") }));

// --- imports ----------------------------------------------------------------
const importedGoods = (extra) => ({ ...cleanInput(), supplyType: "imported_goods", country: "South Africa", amountExclThebe: 100000, vatThebe: 14000, ...extra });
expectCodes(importedGoods(), ["IMPORT_VAT_ESTIMATED"], "imported goods still on the 14% estimate");
expectCodes(importedGoods({ vatThebe: 13500 }), [], "imported goods with a customs figure");
expectCodes(importedGoods({ country: undefined, vatThebe: 13500 }), ["IMPORT_NO_COUNTRY"], "imported goods without a country");
expectCodes(importedGoods({ country: undefined }), ["IMPORT_NO_COUNTRY", "IMPORT_VAT_ESTIMATED"], "both import flags, in a fixed order");
expectCodes({ ...importedGoods(), supplyType: "imported_services" }, [], "imported services at 14% is the rule, so no estimate warning");
expectCodes({ ...importedGoods(), supplyType: "imported_services", country: "" }, ["IMPORT_NO_COUNTRY"], "imported services without a country");
expectCodes({ ...importedGoods(), vatClass: "zero", vatThebe: 0 }, [], "zero-rated import");
eq(severityOf(importedGoods(), "IMPORT_VAT_ESTIMATED"), "warning", "estimate is a warning");

// --- rejected lines raise nothing -------------------------------------------
expectCodes(
  { reviewStatus: "rejected", direction: "input", amountExclThebe: 1, vatThebe: 999 },
  [],
  "rejected lines are never checked",
  ctx({ duplicateCount: 3 })
);

// --- several problems at once, in a fixed order -----------------------------
expectCodes(
  { ...cleanInput(), invoiceNumber: undefined, invoiceDate: undefined, counterpartyTin: undefined, vatThebe: 0 },
  ["MISSING_INVOICE_NUMBER", "MISSING_DATE", "MISSING_TIN", "VAT_MISMATCH"],
  "everything wrong at once"
);

// --- the shape of a flag matches the model ----------------------------------
const flag = checkLine({ ...cleanInput(), vatThebe: 3880 }, ctx())[0];
assert.deepStrictEqual(Object.keys(flag).sort(), ["code", "message", "resolved", "severity"]);
eq(flag.resolved, false, "new flags start unresolved");
eq(typeof flag.message, "string", "message is text");

// --- the line is never changed ----------------------------------------------
const original = cleanInput();
const snapshot = JSON.stringify(original);
checkLine(original, ctx());
eq(JSON.stringify(original), snapshot, "the line is left untouched");

// --- works with no context at all (no period, no profile) -------------------
assert.doesNotThrow(() => checkLine(cleanInput()));
count += 1;

// --- mergeFlags: re-checking must not undo what a person did ---------------
const F = (code, extra = {}) => ({ code, severity: "blocker", message: `${code} message`, resolved: false, ...extra });

assert.deepStrictEqual(mergeFlags([], [F("A")]), [F("A")]);
assert.deepStrictEqual(mergeFlags(undefined, [F("A")]), [F("A")]);
assert.deepStrictEqual(mergeFlags([F("A", { _id: "x" })], []), []);
assert.deepStrictEqual(mergeFlags([], []), []);
count += 4;

// a flag that still applies keeps its _id
let merged = mergeFlags([F("A", { _id: "id-1" })], [F("A")]);
eq(merged[0]._id, "id-1", "the id is kept");
eq(merged[0].resolved, false, "still unresolved");

// a resolved flag stays resolved, with who and when, if the facts are the same
const when = new Date("2026-11-02T10:00:00Z");
merged = mergeFlags([F("A", { _id: "id-1", resolved: true, resolvedBy: "u1", resolvedAt: when })], [F("A")]);
eq(merged[0].resolved, true, "resolution is kept");
eq(merged[0].resolvedBy, "u1", "who resolved it is kept");
eq(merged[0].resolvedAt, when, "when it was resolved is kept");
eq(merged[0]._id, "id-1", "id kept on a resolved flag");

// resolved, but the facts changed: it needs a fresh look
merged = mergeFlags([F("A", { _id: "id-1", resolved: true, resolvedBy: "u1" })], [F("A", { message: "different numbers now" })]);
eq(merged[0].resolved, false, "message changed: no longer resolved");
eq(merged[0]._id, "id-1", "but the id is still kept");
eq("resolvedBy" in merged[0], false, "and the old resolver is not copied over");

merged = mergeFlags([F("A", { _id: "id-1", resolved: true })], [F("A", { severity: "warning" })]);
eq(merged[0].resolved, false, "severity changed: no longer resolved");

// flags that stop applying disappear; new ones arrive unresolved
merged = mergeFlags([F("A", { _id: "a1" }), F("B", { _id: "b1", resolved: true })], [F("A"), F("C")]);
assert.deepStrictEqual(merged.map((f) => f.code), ["A", "C"]);
eq(merged[0]._id, "a1", "A keeps its id");
eq("_id" in merged[1], false, "C is new, so it has no id yet");
count += 1;

// the inputs are never changed
const existingBefore = [F("A", { _id: "id-1", resolved: true })];
const freshBefore = [F("A")];
const snapshotE = JSON.stringify(existingBefore);
const snapshotF = JSON.stringify(freshBefore);
mergeFlags(existingBefore, freshBefore);
eq(JSON.stringify(existingBefore), snapshotE, "existing flags untouched");
eq(JSON.stringify(freshBefore), snapshotF, "fresh flags untouched");

// --- unresolvedBlockers -----------------------------------------------------
const mixed = [
  F("B1"),
  F("B2", { resolved: true }),
  F("W1", { severity: "warning" }),
  F("W2", { severity: "warning", resolved: true }),
];
assert.deepStrictEqual(unresolvedBlockers(mixed).map((f) => f.code), ["B1"]);
assert.deepStrictEqual(unresolvedBlockers([]), []);
assert.deepStrictEqual(unresolvedBlockers(undefined), []);
count += 3;

// --- acknowledgeWarnings: what "confirm" does to the flags -------------------
const seen = new Date("2026-11-03T09:00:00Z");
const acknowledged = acknowledgeWarnings(mixed, "u9", seen);
eq(acknowledged.find((f) => f.code === "W1").resolved, true, "unresolved warning becomes resolved");
eq(acknowledged.find((f) => f.code === "W1").resolvedBy, "u9", "...by this person");
eq(acknowledged.find((f) => f.code === "W1").resolvedAt, seen, "...at this time");
eq(acknowledged.find((f) => f.code === "B1").resolved, false, "blockers are never resolved by confirming");
eq(acknowledged.find((f) => f.code === "B2").resolvedBy, undefined, "an already resolved blocker is left alone");
const oldWarning = [F("W", { severity: "warning", resolved: true, resolvedBy: "u1" })];
eq(acknowledgeWarnings(oldWarning, "u9", seen)[0].resolvedBy, "u1", "an already resolved warning keeps its original resolver");
assert.deepStrictEqual(acknowledgeWarnings(undefined, "u9", seen), []);
count += 1;
const mixedSnapshot = JSON.stringify(mixed);
acknowledgeWarnings(mixed, "u9", seen);
eq(JSON.stringify(mixed), mixedSnapshot, "the original flags are untouched");

console.log(`All ${count} verification checks passed`);