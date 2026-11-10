// Taxation/utils/money.test.js
// Run from the Taxation folder:  node utils/money.test.js
// Uses Node's built-in assert, so no packages are needed. It prints a line only if
// something is wrong; otherwise it ends with "All N money checks passed".

const assert = require("assert");
const { parsePula, thebeToPula, divRound, convertCurrency, vatOnExclusive, splitInclusive } = require("./Money");

let count = 0;
const eq = (actual, expected, label) => {
  assert.strictEqual(actual, expected, `${label}: expected ${expected}, got ${actual}`);
  count += 1;
};

// --- parsePula: text or numbers in, whole thebe out -------------------------
eq(parsePula(19.99), 1999, "19.99 (the float trap: 19.99 * 100 is 1998.999...)");
eq(parsePula(1.005), 101, "1.005 rounds up on the third decimal");
eq(parsePula(0.1 + 0.2), 30, "0.1 + 0.2 (0.30000000000000004 as a float)");
eq(parsePula(1.1 + 2.2), 330, "1.1 + 2.2");
eq(parsePula(100), 10000, "whole number");
eq(parsePula("276.32"), 27632, "plain string");
eq(parsePula(" P1,234.50 "), 123450, "P prefix, spaces and commas");
eq(parsePula(".5"), 50, "no digit before the dot");
eq(parsePula("0.004"), 0, "rounds down below half a thebe");
eq(parsePula("0.005"), 1, "rounds up at half a thebe");
eq(parsePula(-2.5), -250, "negative (credit note)");
eq(parsePula("-0.001"), 0, "tiny negative is plain 0, not -0");
eq(parsePula(""), null, "empty string");
eq(parsePula("abc"), null, "letters");
eq(parsePula("12.3.4"), null, "two dots");
eq(parsePula("-"), null, "just a minus");
eq(parsePula("."), null, "just a dot");
eq(parsePula(undefined), null, "undefined");
eq(parsePula(null), null, "null");
eq(parsePula(NaN), null, "NaN");
eq(parsePula(1e21), null, "too large to store safely");

// --- thebeToPula ------------------------------------------------------------
eq(thebeToPula(1999), 19.99, "1999 thebe is P19.99");

// --- divRound: .5 rounds away from zero -------------------------------------
eq(divRound(7, 2), 4, "3.5 -> 4");
eq(divRound(-7, 2), -4, "-3.5 -> -4");
eq(divRound(5, 2), 3, "2.5 -> 3");
eq(divRound(4, 3), 1, "1.33 -> 1");
eq(divRound(5, 3), 2, "1.67 -> 2");
eq(divRound(0, 5), 0, "zero");
eq(divRound(-1, 10000), 0, "tiny negative gives plain 0");

// --- vatOnExclusive: VAT on amounts that exclude VAT ------------------------
eq(vatOnExclusive(185000, 14), 25900, "P1,850.00 -> P259.00 (matches your sample schedule)");
eq(vatOnExclusive(27632, 14), 3868, "P276.32 -> P38.68 (sample shows 38.6848)");
eq(vatOnExclusive(-27632, 14), -3868, "credit note mirrors the invoice");
eq(vatOnExclusive(25, 14), 4, "3.5 thebe rounds up");
eq(vatOnExclusive(-25, 14), -4, "-3.5 thebe rounds away from zero");
eq(vatOnExclusive(3, 14), 0, "0.42 thebe rounds down");
eq(vatOnExclusive(0, 14), 0, "zero");
eq(vatOnExclusive(10000, 7.5), 750, "a fractional rate (7.5%)");
assert.throws(() => vatOnExclusive(10.5, 14), TypeError);
count += 1;

// --- splitInclusive: amounts that include VAT -------------------------------
let r = splitInclusive(11400, 14);
eq(r.excl, 10000, "P114.00 -> P100.00 excl");
eq(r.vat, 1400, "P114.00 -> P14.00 VAT");
r = splitInclusive(10000, 14);
eq(r.vat, 1228, "P100.00 incl -> P12.28 VAT");
eq(r.excl, 8772, "P100.00 incl -> P87.72 excl");
eq(r.excl + r.vat, 10000, "the two parts always add back to the original");
r = splitInclusive(-11400, 14);
eq(r.vat, -1400, "credit note VAT");
eq(r.excl, -10000, "credit note excl");

// --- convertCurrency: foreign amounts to thebe ------------------------------
eq(convertCurrency(100000, 13.5), 1350000, "USD 1,000.00 at 13.5 -> P13,500.00");
eq(convertCurrency(1, 13.5), 14, "13.5 thebe rounds up");
eq(convertCurrency(-1, 13.5), -14, "negative mirrors positive");
eq(convertCurrency(0, 13.5), 0, "zero");
eq(Object.is(convertCurrency(-1, 0.001), 0), true, "tiny negative gives plain 0, not -0");
eq(convertCurrency(333, 17.3125), 5765, "5765.0625 -> 5765");
assert.throws(() => convertCurrency(10.5, 13.5), TypeError);
assert.throws(() => convertCurrency(100, 0), TypeError);
assert.throws(() => convertCurrency(100, "13.5"), TypeError);
assert.throws(() => convertCurrency(100, NaN), TypeError);
count += 4;

console.log(`All ${count} money checks passed`);