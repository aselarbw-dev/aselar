// Taxation/services/lineBuilder.js
//
// Turns what a client sends for ONE sale or purchase into a clean line we can store,
// or a list of everything that is wrong with it. Pure logic: no database, no Express,
// so it can be tested with plain node.
//
// What it does NOT do: judge whether a line is a good line (missing TIN, duplicate invoice,
// date outside the period...). Those are the verification rules, which come next. This file
// only decides "can this be a line at all?", and works out the amounts.
//
// Foreign currency: set `currency` (for example "USD") and `fxRate` (the pula value of 1 unit,
// for example 13.5). Then `amount` is in that currency, and `vatAmount` (if given) is the
// BOTSWANA VAT in PULA, for example the figure from the customs paperwork. Without it, VAT is
// calculated at the profile's rate on the pula value. A foreign amount never includes
// Botswana VAT.
//
// Input (all optional unless marked):
//   direction*          "output" (a sale) or "input" (a purchase)
//   amount*             in pula, e.g. 1850 or "276.32". Always positive, even for credit notes.
//   docType             "invoice" (default) or "credit_note"
//   amountIncludesVat   true/false. Defaults to the business's pricesInclusive setting.
//   vatAmount           VAT printed on the supplier's tax invoice, in pula. If given we use it;
//                       otherwise we calculate it at the profile's rate.
//   currency, fxRate    "BWP" (default), or a 3-letter code with its exchange rate (see above)
//   vatClass            "standard" (default), "zero" or "exempt". Zero and exempt carry no VAT.
//   supplyType          inputs only: "local" (default), "imported_goods", "imported_services"
//   invoiceNumber, invoiceDate (YYYY-MM-DD), counterpartyName, counterpartyTin,
//   description, country, claimable (inputs only, default true)

const { parsePula, convertCurrency, vatOnExclusive, splitInclusive } = require("../utils/Money");

const DIRECTIONS = ["output", "input"];
const DOC_TYPES = ["invoice", "credit_note"];
const SUPPLY_TYPES = ["local", "imported_goods", "imported_services"];
const VAT_CLASSES = ["standard", "zero", "exempt"];

// Largest amount we accept, in thebe (P10 billion). Keeps all later maths exact.
const MAX_THEBE = 1e12;

// A date the user typed as YYYY-MM-DD (or a full ISO date-time, or a Date).
// Date-only values are stored as midnight UTC, which is the same calendar day in every
// time zone from UTC+0 to UTC+14. We refuse formats like 07/11/2023 on purpose: nobody can
// tell whether that is 7 November or 11 July (the same problem as in the sample schedules).
function parseDate(value, field, bad) {
  if (value === undefined || value === null || value === "") return undefined;

  const inRange = (d) => d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100;

  if (value instanceof Date) {
    if (!isNaN(value.getTime()) && inRange(value)) return value;
  } else if (typeof value === "string") {
    const s = value.trim();
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (dateOnly) {
      const y = Number(dateOnly[1]);
      const m = Number(dateOnly[2]);
      const d = Number(dateOnly[3]);
      const date = new Date(Date.UTC(y, m - 1, d));
      // Rejects impossible dates such as 2026-02-30 (JavaScript would roll it into March).
      const isReal =
        date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
      if (isReal && inRange(date)) return date;
    } else if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
      const date = new Date(s);
      if (!isNaN(date.getTime()) && inRange(date)) return date;
    }
  }

  bad(field, `${field} must be a real date written as YYYY-MM-DD`);
  return undefined;
}

// Builds one line. `profile` supplies ratePercent and pricesInclusive.
// Returns { ok: true, line } or { ok: false, errors: [{ field, message }, ...] }.
function buildLine(input, { profile }) {
  const errors = [];
  const bad = (field, message) => errors.push({ field, message });
  const src = input || {};

  // Optional text. Trimmed, must be text, and not absurdly long.
  const text = (field, max) => {
    const v = src[field];
    if (v === undefined || v === null || v === "") return undefined;
    if (typeof v !== "string") {
      bad(field, `${field} must be text`);
      return undefined;
    }
    const t = v.trim();
    if (t.length > max) {
      bad(field, `${field} is too long (maximum ${max} characters)`);
      return undefined;
    }
    return t;
  };

  // ---- choices -------------------------------------------------------------
  const direction = src.direction;
  if (!DIRECTIONS.includes(direction)) bad("direction", 'direction must be "output" or "input"');

  const docType = src.docType === undefined ? "invoice" : src.docType;
  if (!DOC_TYPES.includes(docType)) bad("docType", 'docType must be "invoice" or "credit_note"');

  const vatClass = src.vatClass === undefined ? "standard" : src.vatClass;
  if (!VAT_CLASSES.includes(vatClass)) bad("vatClass", 'vatClass must be "standard", "zero" or "exempt"');

  let supplyType = src.supplyType === undefined ? "local" : src.supplyType;
  if (!SUPPLY_TYPES.includes(supplyType)) {
    bad("supplyType", 'supplyType must be "local", "imported_goods" or "imported_services"');
  }
  if (direction === "output") supplyType = "local"; // only purchases can be imported

  // Currency. Anything other than BWP is a foreign currency and needs an exchange rate.
  const currency =
    src.currency === undefined ? "BWP" : typeof src.currency === "string" ? src.currency.trim().toUpperCase() : "";
  const validCurrency = /^[A-Z]{3}$/.test(currency);
  if (!validCurrency) bad("currency", "currency must be a 3-letter code such as BWP, USD or ZAR");
  const foreign = validCurrency && currency !== "BWP";

  let fxRate = 1; // the pula value of 1 unit of the currency
  if (foreign) {
    const raw = src.fxRate;
    fxRate = typeof raw === "number" || typeof raw === "string" ? Number(raw) : NaN;
    if (!Number.isFinite(fxRate) || fxRate <= 0 || fxRate > 1e6) {
      bad("fxRate", `fxRate must be a number above 0: the pula value of 1 ${currency}`);
    }
  }

  if (src.amountIncludesVat !== undefined && typeof src.amountIncludesVat !== "boolean") {
    bad("amountIncludesVat", "amountIncludesVat must be true or false");
  }
  if (foreign && src.amountIncludesVat === true) {
    bad("amountIncludesVat", "a foreign currency amount cannot include Botswana VAT");
  }
  const inclusive = foreign
    ? false
    : typeof src.amountIncludesVat === "boolean"
    ? src.amountIncludesVat
    : Boolean(profile.pricesInclusive);

  if (src.claimable !== undefined && typeof src.claimable !== "boolean") {
    bad("claimable", "claimable must be true or false");
  }
  const claimable = direction === "input" && typeof src.claimable === "boolean" ? src.claimable : true;

  // ---- amounts -------------------------------------------------------------
  const amountMinor = parsePula(src.amount);
  if (amountMinor === null) {
    bad("amount", "amount must be a number such as 1850 or 276.32");
  } else if (amountMinor === 0) {
    bad("amount", "amount must not be zero");
  } else if (amountMinor < 0) {
    bad(
      "amount",
      docType === "credit_note"
        ? "enter credit note amounts as positive numbers; they are stored as negative"
        : 'amount must be positive. For a credit note set docType to "credit_note"'
    );
  } else if (amountMinor > MAX_THEBE) {
    bad("amount", "amount is too large");
  }

  let printedVat = null;
  if (src.vatAmount !== undefined && src.vatAmount !== null && src.vatAmount !== "") {
    printedVat = parsePula(src.vatAmount);
    if (printedVat === null || printedVat < 0 || printedVat > MAX_THEBE) {
      bad("vatAmount", "vatAmount must be zero or a positive number");
      printedVat = null;
    }
  }

  // ---- other fields --------------------------------------------------------
  const invoiceDate = parseDate(src.invoiceDate, "invoiceDate", bad);
  const invoiceNumber = text("invoiceNumber", 60);
  const counterpartyName = text("counterpartyName", 150);
  const description = text("description", 500);
  const country = text("country", 80);

  // TINs are written in many ways (see the sample schedules). Tidy them so the same TIN
  // always looks the same, which is what makes duplicate checks work.
  const rawTin = text("counterpartyTin", 40);
  const counterpartyTin = rawTin ? rawTin.replace(/\s+/g, "").toUpperCase() : undefined;

  if (errors.length) return { ok: false, errors };

  // ---- the VAT maths, all in whole thebe -----------------------------------
  const rate = profile.ratePercent === undefined ? 14 : profile.ratePercent;
  let excl;
  let vat;

  if (foreign) {
    // Convert to pula first. VAT is then worked out on the pula value.
    excl = convertCurrency(amountMinor, fxRate);
    if (excl === 0) {
      return { ok: false, errors: [{ field: "amount", message: "amount is too small once converted to pula" }] };
    }
    if (excl > MAX_THEBE) {
      return { ok: false, errors: [{ field: "amount", message: "amount is too large once converted to pula" }] };
    }
    if (vatClass !== "standard") {
      if (printedVat) {
        return { ok: false, errors: [{ field: "vatAmount", message: `a ${vatClass} line cannot carry VAT` }] };
      }
      vat = 0;
    } else {
      // Botswana VAT in pula (e.g. from customs paperwork), or the profile's rate on the pula value.
      vat = printedVat !== null ? printedVat : vatOnExclusive(excl, rate);
    }
  } else if (vatClass !== "standard") {
    // Zero-rated and exempt lines carry no VAT.
    if (printedVat) {
      return { ok: false, errors: [{ field: "vatAmount", message: `a ${vatClass} line cannot carry VAT` }] };
    }
    excl = amountMinor;
    vat = 0;
  } else if (printedVat !== null) {
    // The tax invoice states the VAT: use that figure.
    if (inclusive && printedVat > amountMinor) {
      return { ok: false, errors: [{ field: "vatAmount", message: "vatAmount cannot be more than the amount" }] };
    }
    excl = inclusive ? amountMinor - printedVat : amountMinor;
    vat = printedVat;
  } else if (inclusive) {
    ({ excl, vat } = splitInclusive(amountMinor, rate));
  } else {
    excl = amountMinor;
    vat = vatOnExclusive(excl, rate);
  }

  // Credit notes are stored as negatives so totals simply add up. (Avoids -0.)
  const sign = docType === "credit_note" ? -1 : 1;
  const signed = (n) => (n === 0 ? 0 : sign * n);

  const line = {
    direction,
    docType,
    invoiceNumber,
    invoiceDate,
    counterpartyName,
    counterpartyTin,
    description,
    supplyType,
    country,
    currency,
    fxRate,
    originalAmountMinor: foreign ? signed(amountMinor) : undefined,
    amountExclThebe: signed(excl),
    vatThebe: signed(vat),
    vatClass,
    claimable,
  };

  return { ok: true, line };
}

module.exports = { buildLine };