// Taxation/services/verificationService.js
// The database side of verification. The rules themselves live in verificationRules.js (pure
// logic); this file looks up what the rules cannot know on their own (duplicates), runs them
// on lines, and stores the resulting flags.

const { VatProfile, VatPeriod, VatLine } = require("../models/vatModels");
const { ServiceError, readinessCheck } = require("./periodService");
const { checkLine, mergeFlags } = require("./verificationRules");

const MAX_ISSUES = 200; // how many flagged lines one response will list

// Two lines are "the same invoice" when direction, document type, invoice number and the
// counterparty's TIN all match.
const keyOf = (l) =>
  [l.direction, l.docType || "invoice", l.invoiceNumber, l.counterpartyTin || ""].join("|");

const hasNumber = (l) => typeof l.invoiceNumber === "string" && l.invoiceNumber.trim() !== "";

// One database query finds every non-rejected line (in ANY period of this business) that
// shares an invoice number with the given lines. Grouped by key for quick lookups.
async function loadDuplicateIndex(business, lines) {
  const index = new Map();
  const numbers = [...new Set(lines.filter(hasNumber).map((l) => l.invoiceNumber))];
  if (numbers.length === 0) return index;

  const candidates = await VatLine.find({
    business,
    reviewStatus: { $ne: "rejected" },
    invoiceNumber: { $in: numbers },
  })
    .select("_id direction docType invoiceNumber counterpartyTin")
    .lean();

  for (const c of candidates) {
    const key = keyOf(c);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(String(c._id));
  }
  return index;
}

// How many OTHER lines are the same invoice as this one.
const duplicatesOf = (index, line) => {
  if (!hasNumber(line)) return 0;
  const ids = index.get(keyOf(line)) || [];
  return ids.filter((id) => id !== String(line._id)).length;
};

// Flags for a line that has not been saved yet. (Nothing to exclude: it isn't in the database.)
async function flagsForNewLine({ business, line, profile, period }) {
  const index = await loadDuplicateIndex(business, [line]);
  return checkLine(
    { ...line, reviewStatus: "pending" },
    { profile, period, duplicateCount: duplicatesOf(index, line) }
  );
}

// Flags for a line that is already saved (it is being edited, confirmed or reopened). Differs
// from a new line in two ways: the line's own record is not counted as its own duplicate, and
// the result is merged with the flags it already has, so earlier resolutions and ids survive.
// `line` must carry its _id and its current `flags`.
async function flagsForExistingLine({ business, line, profile, period }) {
  const index = await loadDuplicateIndex(business, [line]);
  const fresh = checkLine(line, { profile, period, duplicateCount: duplicatesOf(index, line) });
  return mergeFlags(line.flags, fresh);
}

// A comparable summary of a flag list, to see whether anything actually changed.
const signature = (flags = []) =>
  JSON.stringify(flags.map((f) => [String(f._id || ""), f.code, f.severity, f.message, Boolean(f.resolved)]));

// Re-checks every non-rejected line in a period and stores the flags that changed.
// Flags a person already resolved stay resolved as long as the facts are the same.
async function verifyPeriod({ business, periodId }) {
  const period = await VatPeriod.findOne({ _id: periodId, business });
  if (!period) throw new ServiceError("Period not found", 404);

  // An exported or filed period is a frozen record; reopen it before re-checking.
  if (period.status === "exported" || period.status === "filed") {
    throw new ServiceError(`This period is "${period.status}". Reopen it before re-checking.`, 409);
  }

  const profile = await VatProfile.findOne({ business });
  if (!profile) throw new ServiceError("Set up your VAT profile first", 409);

  const lines = await VatLine.find({
    business,
    period: period._id,
    reviewStatus: { $ne: "rejected" },
  }).lean();
  const index = await loadDuplicateIndex(business, lines);

  const ops = [];
  const issues = [];
  const byCode = {};
  let blockers = 0;
  let warnings = 0;

  for (const line of lines) {
    const fresh = checkLine(line, { profile, period, duplicateCount: duplicatesOf(index, line) });
    const merged = mergeFlags(line.flags, fresh);

    if (signature(line.flags) !== signature(merged)) {
      ops.push({ updateOne: { filter: { _id: line._id, business }, update: { $set: { flags: merged } } } });
    }

    if (merged.length) {
      for (const f of merged) {
        if (f.resolved) continue; // resolved flags no longer count
        byCode[f.code] = (byCode[f.code] || 0) + 1;
        if (f.severity === "blocker") blockers += 1;
        else warnings += 1;
      }
      issues.push({
        lineId: line._id,
        direction: line.direction,
        invoiceNumber: line.invoiceNumber,
        counterpartyName: line.counterpartyName,
        flags: merged,
      });
    }
  }

  if (ops.length) await VatLine.bulkWrite(ops);

  return {
    checked: lines.length,
    updated: ops.length,
    blockers, // unresolved blocker flags
    warnings, // unresolved warning flags
    byCode,
    issues: issues.slice(0, MAX_ISSUES),
    truncated: issues.length > MAX_ISSUES,
    readiness: await readinessCheck(business, period._id),
  };
}

module.exports = { flagsForNewLine, flagsForExistingLine, verifyPeriod };