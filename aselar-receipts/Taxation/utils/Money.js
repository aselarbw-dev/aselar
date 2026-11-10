// Taxation/utils/money.js
//
// Money helpers for the VAT service. Pure functions: no database, no Express.
//
// The rule: money is stored as WHOLE THEBE (P1.00 = 100 thebe). Computers can't store most
// decimals exactly (19.99 * 100 gives 1998.9999999999998), so we convert to an integer the
// moment an amount enters the system, do every calculation on integers, and only convert
// back to pula for display or for the Excel export.

// Divide two whole numbers and round to the nearest whole number. A result of exactly .5
// rounds AWAY from zero, so 2.5 -> 3 and -2.5 -> -3 (credit notes behave like invoices).
// `den` must be a positive whole number.
function divRound(num, den) {
  const sign = num < 0 ? -1 : 1;
  const n = Math.abs(num);

  let q = Math.floor(n / den);
  let r = n - q * den; // the remainder
  // Float division can land a hair above or below the true value; correct it.
  if (r < 0) {
    q -= 1;
    r += den;
  }
  if (r >= den) {
    q += 1;
    r -= den;
  }

  const out = r * 2 >= den ? q + 1 : q;
  return out === 0 ? 0 : sign * out; // avoid returning -0
}

// Turns what a person typed or a file contained into whole thebe.
//   1234.5      -> 123450      "P1,234.50" -> 123450      "276.32" -> 27632
// Returns null if it isn't a usable amount, so the caller decides what error to show.
// Anything past two decimals is rounded half away from zero ("0.005" -> 1 thebe).
function parsePula(input) {
  let s;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    // toFixed(10) writes the number out as plain decimal text, which we then read exactly
    // (digit by digit) instead of multiplying floats.
    s = input.toFixed(10);
  } else if (typeof input === "string") {
    s = input.replace(/[P\s,]/gi, ""); // drop a "P" prefix, spaces and thousands commas
  } else {
    return null;
  }

  // optional minus, digits, optional dot and more digits
  const m = /^(-?)(\d*)(?:\.(\d*))?$/.exec(s);
  if (!m) return null;
  const neg = m[1] === "-";
  const whole = m[2];
  const frac = m[3] || "";
  if (whole === "" && frac === "") return null; // just "-" or "." or ""

  const padded = (frac + "000").slice(0, 3); // first three decimal digits
  let thebe = Number(whole || "0") * 100 + Number(padded.slice(0, 2));
  if (Number(padded[2]) >= 5) thebe += 1; // round on the third decimal

  if (!Number.isSafeInteger(thebe)) return null;
  if (thebe === 0) return 0;
  return neg ? -thebe : thebe;
}

// Whole thebe back to a pula number (for the UI and Excel cells), e.g. 1999 -> 19.99
const thebeToPula = (thebe) => thebe / 100;

// 14 -> 1400. Working in basis points (hundredths of a percent) keeps the maths whole-number,
// and also copes with rates like 7.5 or 15.5.
const rateToBp = (ratePercent) => Math.round(ratePercent * 100);

const assertWholeThebe = (value) => {
  if (!Number.isInteger(value)) {
    throw new TypeError("Amount must be a whole number of thebe");
  }
};

// Converts an amount in a foreign currency to whole thebe.
//   minor  = the foreign amount in its smallest unit (US cents, SA cents...), a whole number
//   fxRate = pula for 1 unit of that currency (13.5 means 1 USD = P13.50)
// Rounds half away from zero, like divRound. 1000.00 USD at 13.5 -> 1350000 thebe (P13,500.00)
function convertCurrency(minor, fxRate) {
  if (!Number.isInteger(minor)) {
    throw new TypeError("Amount must be a whole number of minor units (cents, thebe...)");
  }
  if (typeof fxRate !== "number" || !Number.isFinite(fxRate) || fxRate <= 0) {
    throw new TypeError("fxRate must be a number above 0");
  }
  const out = Math.round(Math.abs(minor) * fxRate);
  if (out === 0) return 0; // avoid -0
  return minor < 0 ? -out : out;
}

// VAT on an amount that does NOT include VAT.  P276.32 at 14% -> 3868 (P38.68)
function vatOnExclusive(exclThebe, ratePercent) {
  assertWholeThebe(exclThebe);
  return divRound(exclThebe * rateToBp(ratePercent), 10000);
}

// Splits an amount that DOES include VAT into { excl, vat }.  P114.00 at 14% -> P100.00 + P14.00
// The VAT is rounded, and the excluded amount is what is left, so excl + vat always equals
// the amount you started with.
function splitInclusive(inclThebe, ratePercent) {
  assertWholeThebe(inclThebe);
  const bp = rateToBp(ratePercent);
  const vat = divRound(inclThebe * bp, 10000 + bp);
  return { excl: inclThebe - vat, vat };
}

module.exports = {
  divRound,
  parsePula,
  thebeToPula,
  rateToBp,
  convertCurrency,
  vatOnExclusive,
  splitInclusive,
};