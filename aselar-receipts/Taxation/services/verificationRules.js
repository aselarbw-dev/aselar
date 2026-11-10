// Taxation/services/verificationRules.js
//
// The verification rules for ONE line. Pure logic: no database, no Express, so it can be
// tested with plain node. The service (next step) gathers the facts that need the database
// (is this invoice a duplicate?) and passes them in.
//
// Two severities:
//   blocker  the period cannot become "ready" until it is fixed (or deliberately resolved)
//   warning  worth a look; the person reviewing the line decides
//
// Each flag has the same shape the VatLine model stores:
//   { code, severity, message, resolved: false }
//
// checkLine(line, context)
//   line     the fields of a VatLine (the builder's output or a saved document)
//   context  {
//     profile         the VAT profile (ratePercent, lateClaimPolicy)
//     period          { periodStart, periodEnd } of the period the line is claimed in
//     duplicateCount  how many OTHER non-rejected lines have the same direction, document type,
//                     invoice number and counterparty TIN (looked up by the service)
//     now             the current time (default: now; passed in so tests are repeatable)
//     tzOffsetMs      local time zone offset (default: Botswana, UTC+2)
//   }

const { vatOnExclusive } = require("../utils/Money");

// How far (in thebe) the VAT may differ from our own calculation before we call it a mismatch.
// Suppliers round differently from us, so exact equality would raise false alarms.
const VAT_TOLERANCE_THEBE = 2;

const DEFAULT_TZ_OFFSET_MS = 2 * 60 * 60 * 1000;

const pula = (thebe) => `${thebe < 0 ? "-" : ""}P${(Math.abs(thebe) / 100).toFixed(2)}`;

const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";

// YYYY-MM-DD of an instant, in local time.
const localDate = (instant, tzOffsetMs) =>
  new Date(new Date(instant).getTime() + tzOffsetMs).toISOString().slice(0, 10);

function checkLine(line, context = {}) {
  // A rejected line is left out of the return, so nothing about it matters.
  if (line.reviewStatus === "rejected") return [];

  const {
    profile = {},
    period,
    duplicateCount = 0,
    now = new Date(),
    tzOffsetMs = DEFAULT_TZ_OFFSET_MS,
  } = context;

  const rate = profile.ratePercent === undefined ? 14 : profile.ratePercent;
  const flags = [];
  const add = (code, severity, message) => flags.push({ code, severity, message, resolved: false });

  const isInput = line.direction === "input";
  const currency = line.currency || "BWP";

  // 1. Every line needs an invoice number: it is how the line is found again, and it is
  //    required on the schedule.
  if (isBlank(line.invoiceNumber)) {
    add("MISSING_INVOICE_NUMBER", "blocker", "This line has no invoice number.");
  }

  // 2. Every line needs a date: it decides whether the line belongs in this period.
  if (!line.invoiceDate) {
    add("MISSING_DATE", "blocker", "This line has no invoice date.");
  }

  // 3. A purchase needs the supplier's TIN (or tax ID, for a foreign supplier) to be claimed.
  //    Sales to consumers have no TIN, so sales are not checked. A purchase marked as not
  //    claimable is not going to be claimed, so it is not checked either.
  if (isInput && line.claimable !== false && isBlank(line.counterpartyTin)) {
    add("MISSING_TIN", "blocker", "This purchase has no supplier TIN, so the VAT cannot be claimed.");
  }

  // 4. VAT should be close to the standard rate on the amount. Only checked where the rate
  //    applies directly: standard-rated, local, in pula. (Imports and foreign currency lines
  //    take their VAT from the customs figure or the pula value.)
  if (line.vatClass === "standard" && line.supplyType === "local" && currency === "BWP") {
    const expected = vatOnExclusive(line.amountExclThebe, rate);
    if (Math.abs(line.vatThebe - expected) > VAT_TOLERANCE_THEBE) {
      add(
        "VAT_MISMATCH",
        "blocker",
        `VAT is ${pula(line.vatThebe)} but ${rate}% of ${pula(line.amountExclThebe)} is ${pula(expected)}.`
      );
    }
  }

  // 5. The same invoice recorded twice would be claimed (or declared) twice.
  if (duplicateCount > 0) {
    add(
      "DUPLICATE_INVOICE",
      "blocker",
      "Another line already has this invoice number for the same supplier or customer."
    );
  }

  // 6. A date outside the period usually means a late claim, or a typo. For purchases the
  //    business can choose (profile.lateClaimPolicy) to treat it as a blocker.
  if (line.invoiceDate && period) {
    const d = new Date(line.invoiceDate);
    if (d < new Date(period.periodStart) || d > new Date(period.periodEnd)) {
      const severity = isInput && profile.lateClaimPolicy === "block" ? "blocker" : "warning";
      add(
        "DATE_OUTSIDE_PERIOD",
        severity,
        `Invoice dated ${d.toISOString().slice(0, 10)} is outside this period ` +
          `(${localDate(period.periodStart, tzOffsetMs)} to ${localDate(period.periodEnd, tzOffsetMs)})` +
          (isInput ? ". Is this a late claim?" : ".")
      );
    }
  }

  // 7. A date in the future is almost certainly a typo. Compared by local calendar day, so an
  //    invoice dated "today" never trips this just after local midnight.
  if (line.invoiceDate) {
    const invoiceDay = new Date(line.invoiceDate).toISOString().slice(0, 10);
    if (invoiceDay > localDate(now, tzOffsetMs)) {
      add("FUTURE_DATE", "warning", `Invoice date ${invoiceDay} is in the future.`);
    }
  }

  // 8 and 9. Imports.
  if (line.supplyType === "imported_goods" || line.supplyType === "imported_services") {
    if (isBlank(line.country)) {
      add("IMPORT_NO_COUNTRY", "warning", "This imported purchase has no country of origin.");
    }
  }
  if (line.supplyType === "imported_goods" && line.vatClass === "standard") {
    // If the VAT equals our 14% estimate, nobody has entered the customs figure yet.
    const estimate = vatOnExclusive(line.amountExclThebe, rate);
    if (Math.abs(line.vatThebe - estimate) <= VAT_TOLERANCE_THEBE) {
      add(
        "IMPORT_VAT_ESTIMATED",
        "warning",
        `Import VAT is ${pula(line.vatThebe)}, the ${rate}% estimate. If you have the customs figure, enter it.`
      );
    }
  }

  return flags;
}

// Combines freshly calculated flags with the flags already stored on a line, so that
// re-checking a line never undoes what a person has done:
//   - a flag that still applies keeps its _id, so it can be referred to later
//   - if it was already resolved and the facts are unchanged (same message and severity),
//     it stays resolved, with who resolved it and when
//   - flags that no longer apply disappear
function mergeFlags(existing = [], fresh = []) {
  return fresh.map((flag) => {
    const old = existing.find((e) => e.code === flag.code);
    if (!old) return flag;

    const merged = { ...flag };
    if (old._id !== undefined) merged._id = old._id;
    if (old.resolved && old.message === flag.message && old.severity === flag.severity) {
      merged.resolved = true;
      if (old.resolvedBy !== undefined) merged.resolvedBy = old.resolvedBy;
      if (old.resolvedAt !== undefined) merged.resolvedAt = old.resolvedAt;
    }
    return merged;
  });
}

// The blockers on a line that nobody has fixed or resolved.
const unresolvedBlockers = (flags = []) => flags.filter((f) => f.severity === "blocker" && !f.resolved);

// "Confirm" means a person looked at the line, so its unresolved WARNINGS are marked as seen
// by that person. Blockers are never touched here: they must be fixed or resolved on purpose.
// Returns new flag objects and leaves the originals alone.
function acknowledgeWarnings(flags = [], userId, when = new Date()) {
  return flags.map((f) =>
    f.severity === "warning" && !f.resolved ? { ...f, resolved: true, resolvedBy: userId, resolvedAt: when } : f
  );
}

module.exports = { checkLine, mergeFlags, unresolvedBlockers, acknowledgeWarnings, VAT_TOLERANCE_THEBE };