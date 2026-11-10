// Taxation/services/lineBuilder.test.js
// Run from the Taxation folder:  node services/lineBuilder.test.js
// Uses Node's built-in assert, so no packages are needed.

const assert = require("assert");
const { buildLine } = require("./lineBuilder");

const exclusiveProfile = { ratePercent: 14, pricesInclusive: false };
const inclusiveProfile = { ratePercent: 14, pricesInclusive: true };

let count = 0;
const eq = (actual, expected, label) => {
  assert.strictEqual(actual, expected, `${label}: expected ${expected}, got ${actual}`);
  count += 1;
};

// Builds a line that must succeed, and returns it.
const good = (input, profile = exclusiveProfile) => {
  const r = buildLine(input, { profile });
  assert.ok(r.ok, `expected success but got: ${JSON.stringify(r.errors)}`);
  count += 1;
  return r.line;
};

// Builds a line that must fail, and checks exactly which fields were reported as wrong
// (in the order they are checked: choices, then amounts, then the other fields).
const refuses = (input, expectedFields, profile = exclusiveProfile) => {
  const r = buildLine(input, { profile });
  assert.ok(!r.ok, "expected failure but it succeeded: " + JSON.stringify(input));
  assert.deepStrictEqual(
    r.errors.map((e) => e.field),
    expectedFields,
    "wrong fields reported for " + JSON.stringify(input)
  );
  count += 1;
};

// --- the basics -------------------------------------------------------------
let l = good({ direction: "output", amount: 1850 });
eq(l.amountExclThebe, 185000, "P1,850.00 excl");
eq(l.vatThebe, 25900, "VAT on P1,850.00 is P259.00 (your sample schedule)");
eq(l.docType, "invoice", "docType defaults to invoice");
eq(l.vatClass, "standard", "vatClass defaults to standard");
eq(l.supplyType, "local", "supplyType defaults to local");
eq(l.currency, "BWP", "currency is BWP");
eq(l.claimable, true, "claimable defaults to true");

l = good({ direction: "input", amount: "276.32" });
eq(l.amountExclThebe, 27632, "text amount");
eq(l.vatThebe, 3868, "P276.32 -> P38.68");

// --- VAT included in the amount --------------------------------------------
l = good({ direction: "input", amount: 114 }, inclusiveProfile);
eq(l.amountExclThebe, 10000, "profile says inclusive: P114 -> P100 excl");
eq(l.vatThebe, 1400, "profile says inclusive: P14 VAT");

l = good({ direction: "input", amount: 114, amountIncludesVat: false }, inclusiveProfile);
eq(l.amountExclThebe, 11400, "the line overrides the profile (exclusive)");
eq(l.vatThebe, 1596, "VAT added on top: 14% of P114 = P15.96");

// --- VAT printed on the supplier invoice -----------------------------------
l = good({ direction: "input", amount: 276.32, vatAmount: 38.69 });
eq(l.vatThebe, 3869, "uses the printed VAT, not our own calculation");
eq(l.amountExclThebe, 27632, "printed VAT, exclusive amount");

l = good({ direction: "input", amount: 315, vatAmount: 38.69, amountIncludesVat: true });
eq(l.amountExclThebe, 27631, "printed VAT, inclusive: P315.00 - P38.69");
eq(l.vatThebe, 3869, "printed VAT, inclusive");

// --- zero-rated and exempt --------------------------------------------------
l = good({ direction: "output", amount: 500, vatClass: "zero" });
eq(l.vatThebe, 0, "zero-rated carries no VAT");
eq(l.amountExclThebe, 50000, "zero-rated keeps the full amount");
l = good({ direction: "output", amount: 500, vatClass: "exempt" });
eq(l.vatThebe, 0, "exempt carries no VAT");
refuses({ direction: "output", amount: 500, vatClass: "zero", vatAmount: 5 }, ["vatAmount"]);

// --- credit notes are stored as negatives -----------------------------------
l = good({ direction: "output", amount: 100, docType: "credit_note" });
eq(l.amountExclThebe, -10000, "credit note excl is negative");
eq(l.vatThebe, -1400, "credit note VAT is negative");
l = good({ direction: "output", amount: 100, docType: "credit_note", vatClass: "zero" });
eq(Object.is(l.vatThebe, 0), true, "a zero-rated credit note has plain 0 VAT, not -0");
refuses({ direction: "output", amount: -100, docType: "credit_note" }, ["amount"]);
refuses({ direction: "output", amount: -100 }, ["amount"]);

// --- outputs and imports ----------------------------------------------------
l = good({ direction: "output", amount: 100, supplyType: "imported_goods", claimable: false });
eq(l.supplyType, "local", "a sale is always a local supply");
eq(l.claimable, true, "claimable only applies to purchases");

l = good({ direction: "input", amount: 1000, supplyType: "imported_goods", country: "South Africa" });
eq(l.supplyType, "imported_goods", "imported purchase");
eq(l.country, "South Africa", "country kept");
eq(l.vatThebe, 14000, "import VAT estimated at 14% when none is given");

l = good({ direction: "input", amount: 100, claimable: false });
eq(l.claimable, false, "a disallowed purchase");

// --- dates ------------------------------------------------------------------
l = good({ direction: "input", amount: 10, invoiceDate: "2026-10-31" });
eq(l.invoiceDate.toISOString(), "2026-10-31T00:00:00.000Z", "date-only is stored as midnight UTC");
l = good({ direction: "input", amount: 10 });
eq(l.invoiceDate, undefined, "no date is allowed here (verification warns later)");
refuses({ direction: "input", amount: 10, invoiceDate: "31/10/2026" }, ["invoiceDate"]);
refuses({ direction: "input", amount: 10, invoiceDate: "07/11/2023" }, ["invoiceDate"]);
refuses({ direction: "input", amount: 10, invoiceDate: "2026-02-30" }, ["invoiceDate"]);
refuses({ direction: "input", amount: 10, invoiceDate: "1850-01-01" }, ["invoiceDate"]);

// --- tidy text --------------------------------------------------------------
l = good({ direction: "input", amount: 10, counterpartyTin: "  c066 19801113 ", invoiceNumber: " INV-7 " });
eq(l.counterpartyTin, "C06619801113", "TIN: spaces removed, upper case");
eq(l.invoiceNumber, "INV-7", "invoice number trimmed");

// --- foreign currency -------------------------------------------------------
l = good({ direction: "input", amount: 1000, currency: "USD", fxRate: 13.5, supplyType: "imported_services" });
eq(l.amountExclThebe, 1350000, "USD 1,000 at 13.5 -> P13,500.00");
eq(l.vatThebe, 189000, "VAT is 14% of the pula value: P1,890.00");
eq(l.originalAmountMinor, 100000, "the original USD amount is kept (in cents)");
eq(l.currency, "USD", "currency kept");
eq(l.fxRate, 13.5, "rate kept");

l = good({ direction: "input", amount: 500, currency: "USD", fxRate: 13.5, supplyType: "imported_goods", vatAmount: 945.5 });
eq(l.amountExclThebe, 675000, "USD 500 at 13.5 -> P6,750.00");
eq(l.vatThebe, 94550, "the customs VAT (in pula) is used as given");

l = good({ direction: "input", amount: "250", currency: "usd", fxRate: "18.25" });
eq(l.currency, "USD", "currency code is upper-cased");
eq(l.fxRate, 18.25, "text rate is read as a number");
eq(l.amountExclThebe, 456250, "USD 250 at 18.25 -> P4,562.50");

l = good({ direction: "input", amount: 100, currency: "BWP", fxRate: 99 });
eq(l.fxRate, 1, "a rate sent with BWP is ignored");
eq(l.originalAmountMinor, undefined, "no original amount for pula lines");

l = good({ direction: "input", amount: 1000, currency: "USD", fxRate: 13.5, docType: "credit_note" });
eq(l.originalAmountMinor, -100000, "foreign credit note keeps the sign on the original amount");
eq(l.amountExclThebe, -1350000, "foreign credit note, pula");
eq(l.vatThebe, -189000, "foreign credit note, VAT");

l = good({ direction: "input", amount: 1000, currency: "USD", fxRate: 13.5, vatClass: "zero" });
eq(l.vatThebe, 0, "zero-rated foreign line carries no VAT");

refuses({ direction: "input", amount: 100, currency: "USD" }, ["fxRate"]);
refuses({ direction: "input", amount: 100, currency: "USD", fxRate: 0 }, ["fxRate"]);
refuses({ direction: "input", amount: 100, currency: "USD", fxRate: -2 }, ["fxRate"]);
refuses({ direction: "input", amount: 100, currency: "USD", fxRate: "abc" }, ["fxRate"]);
refuses({ direction: "input", amount: 100, currency: "USD", fxRate: true }, ["fxRate"]);
refuses({ direction: "input", amount: 100, currency: "dollars", fxRate: 13.5 }, ["currency"]);
refuses({ direction: "input", amount: 100, currency: "US", fxRate: 13.5 }, ["currency"]);
refuses({ direction: "input", amount: 100, currency: "USD", fxRate: 13.5, amountIncludesVat: true }, ["amountIncludesVat"]);
refuses({ direction: "input", amount: 100, currency: "USD", fxRate: 13.5, vatClass: "zero", vatAmount: 5 }, ["vatAmount"]);
refuses({ direction: "input", amount: 9000000000, currency: "USD", fxRate: 1000 }, ["amount"]);
refuses({ direction: "input", amount: 0.01, currency: "USD", fxRate: 0.0001 }, ["amount"]);

// --- things that must be refused --------------------------------------------
refuses({ amount: 10 }, ["direction"]);
refuses({ direction: "sideways", amount: 10 }, ["direction"]);
refuses({ direction: "input" }, ["amount"]);
refuses({ direction: "input", amount: "abc" }, ["amount"]);
refuses({ direction: "input", amount: 0 }, ["amount"]);
refuses({ direction: "input", amount: 1e13 }, ["amount"]);
refuses({ direction: "input", amount: 10, vatAmount: -1 }, ["vatAmount"]);
refuses({ direction: "input", amount: 10, vatAmount: 20, amountIncludesVat: true }, ["vatAmount"]);
refuses({ direction: "input", amount: 10, invoiceNumber: 12345 }, ["invoiceNumber"]);
refuses({ direction: "input", amount: 10, docType: "receipt" }, ["docType"]);
refuses({ direction: "input", amount: 10, amountIncludesVat: "yes" }, ["amountIncludesVat"]);
refuses({ direction: "input", amount: 10, counterpartyName: "x".repeat(151) }, ["counterpartyName"]);

// All problems are reported at once, not one at a time.
refuses({ direction: "nope", amount: "abc", invoiceDate: "tomorrow" }, ["direction", "amount", "invoiceDate"]);

// The input object is never changed.
const original = { direction: "input", amount: "276.32", counterpartyTin: " c1 " };
const copy = JSON.stringify(original);
good(original);
eq(JSON.stringify(original), copy, "input is left untouched");

console.log(`All ${count} line builder checks passed`);