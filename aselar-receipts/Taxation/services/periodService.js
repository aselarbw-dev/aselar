// Taxation/services/periodService.js
// Business logic for VAT periods: which period a date falls in, generating periods from the
// VAT profile, readiness checks, and status transitions with guards and an audit trail.
//
// Period rules (Botswana, confirmed): Category A periods end Jan/Mar/May/Jul/Sep/Nov,
// Category B end Feb/Apr/Jun/Aug/Oct/Dec, Category C is monthly. Due date = period end +
// profile.deadlineDays (28). Period boundaries are local midnight, not UTC midnight, so a
// sale at 00:30 on the 1st lands in the right period.

const { VatPeriod, VatLine } = require("../models/vatModels");

// An error the controllers can turn into a clean HTTP response.
class ServiceError extends Error {
  constructor(message, status = 400, details) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
    this.details = details;
  }
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_PERIODS = 36; // safety cap when backfilling from firstPeriodStart

// Local time zone offsets (no daylight saving). Botswana is UTC+2 (CAT), which is also the
// default. Move this into the country pack when more countries are added.
const TZ_OFFSET_HOURS = { BW: 2 };
const DEFAULT_TZ_OFFSET_HOURS = 2;
const tzOffsetMs = (countryCode) =>
  (TZ_OFFSET_HOURS[countryCode] ?? DEFAULT_TZ_OFFSET_HOURS) * HOUR_MS;

// ---------------------------------------------------------------------------
// pure period maths
// ---------------------------------------------------------------------------

// The period (start, end) that contains `date` for the given category.
// start = local midnight on day 1; end = the last millisecond of the last local day.
function periodBounds(date, category, countryCode) {
  const off = tzOffsetMs(countryCode);
  const local = new Date(date.getTime() + off); // UTC getters now read local wall-clock time
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth(); // 0-11

  let startY = y;
  let startM = m;
  let endY = y;
  let endM = m;

  if (category === "A" || category === "B") {
    const month1 = m + 1; // 1-12
    const endsOnOdd = category === "A"; // A ends on odd months, B on even months
    const isEndMonth = (month1 % 2 === 1) === endsOnOdd;

    let end1 = isEndMonth ? month1 : month1 + 1;
    endY = y;
    if (end1 > 12) {
      end1 -= 12;
      endY = y + 1;
    }
    let start1 = end1 - 1;
    startY = endY;
    if (start1 < 1) {
      start1 = 12;
      startY = endY - 1;
    }
    startM = start1 - 1;
    endM = end1 - 1;
  }

  const start = new Date(Date.UTC(startY, startM, 1) - off);
  const end = new Date(Date.UTC(endY, endM + 1, 1) - off - 1);
  return { start, end };
}

// Due date = end of the last local day of the period + deadlineDays.
const dueDateFor = (periodEnd, deadlineDays) =>
  new Date(periodEnd.getTime() + deadlineDays * DAY_MS);

// Adds days-to-due information (handy for the "days left" banner).
function withDueInfo(period, now = new Date()) {
  const p = typeof period.toObject === "function" ? period.toObject() : period;
  const msLeft = new Date(p.dueDate).getTime() - now.getTime();
  return {
    ...p,
    daysToDue: Math.ceil(msLeft / DAY_MS),
    isOverdue: msLeft < 0 && p.status !== "filed",
  };
}

// Lines can only be added or edited while the period is open or in review.
const isEditable = (status) => status === "open" || status === "in_review";

// ---------------------------------------------------------------------------
// generating periods
// ---------------------------------------------------------------------------

// Makes sure every period from the profile's firstPeriodStart (or the current one, if unset)
// up to the period containing `now` exists. Safe to call repeatedly (also from the cron job).
// The first period receives the profile's opening credit; carrying credit forward between
// periods is handled when totals are reconciled.
async function syncPeriods(profile, now = new Date()) {
  const { business, category, countryCode, deadlineDays } = profile;
  const anchor = profile.firstPeriodStart || now;

  let cursor = periodBounds(anchor, category, countryCode);
  const target = periodBounds(now, category, countryCode);

  let index = 0;
  let created = 0;

  while (cursor.start <= target.start) {
    if (index >= MAX_PERIODS) {
      throw new ServiceError(
        `firstPeriodStart is too far back (limit is ${MAX_PERIODS} periods). Set a more recent start date.`,
        400
      );
    }

    try {
      const result = await VatPeriod.updateOne(
        { business, periodStart: cursor.start },
        {
          $setOnInsert: {
            periodEnd: cursor.end,
            dueDate: dueDateFor(cursor.end, deadlineDays),
            status: "open",
            version: 1,
            openingCreditThebe: index === 0 ? profile.openingCreditThebe || 0 : 0,
          },
        },
        { upsert: true }
      );
      if (result.upsertedCount) created += 1;
    } catch (err) {
      // Two requests created the same period at once: the unique index stopped one. Fine.
      if (err.code !== 11000) throw err;
    }

    cursor = periodBounds(new Date(cursor.end.getTime() + 1), category, countryCode);
    index += 1;
  }

  return { created };
}

// ---------------------------------------------------------------------------
// readiness and summary
// ---------------------------------------------------------------------------

// What stops a period becoming "ready": lines still to review, or unresolved blockers.
// Rejected lines are excluded from the return, so they never block it.
async function readinessCheck(business, periodId) {
  const notRejected = { business, period: periodId, reviewStatus: { $ne: "rejected" } };

  const [pendingLines, blockerLines] = await Promise.all([
    VatLine.countDocuments({ business, period: periodId, reviewStatus: "pending" }),
    VatLine.countDocuments({
      ...notRejected,
      flags: { $elemMatch: { severity: "blocker", resolved: false } },
    }),
  ]);

  return { pendingLines, blockerLines, canMarkReady: pendingLines === 0 && blockerLines === 0 };
}

// One period with its line counts and readiness, for the period screen.
async function getPeriodSummary(business, periodId) {
  const period = await VatPeriod.findOne({ _id: periodId, business });
  if (!period) throw new ServiceError("Period not found", 404);

  const grouped = await VatLine.aggregate([
    { $match: { business: period.business, period: period._id } },
    { $group: { _id: { direction: "$direction", status: "$reviewStatus" }, n: { $sum: 1 } } },
  ]);

  const lines = {
    output: { pending: 0, confirmed: 0, rejected: 0 },
    input: { pending: 0, confirmed: 0, rejected: 0 },
  };
  for (const g of grouped) {
    if (lines[g._id.direction] && g._id.status in lines[g._id.direction]) {
      lines[g._id.direction][g._id.status] += g.n;
    }
  }

  const readiness = await readinessCheck(period.business, period._id);
  return {
    period: withDueInfo(period),
    lines,
    readiness: { ...readiness, editable: isEditable(period.status) },
  };
}

// ---------------------------------------------------------------------------
// status transitions
// ---------------------------------------------------------------------------

// open -> in_review -> ready -> exported -> filed. Exported and filed periods can be reopened
// (back to in_review) with a reason, which bumps the version.
const TRANSITIONS = {
  open: ["in_review"],
  in_review: ["ready"],
  ready: ["in_review", "exported"],
  exported: ["filed", "in_review"],
  filed: ["in_review"],
};

async function transitionPeriod({ business, periodId, to, userId, note, internal = false }) {
  const period = await VatPeriod.findOne({ _id: periodId, business });
  if (!period) throw new ServiceError("Period not found", 404);

  const from = period.status;
  if (!(TRANSITIONS[from] || []).includes(to)) {
    throw new ServiceError(`A period that is "${from}" cannot move to "${to}"`, 409);
  }
  // "exported" is only set by the export flow, never directly by a client.
  if (to === "exported" && !internal) {
    throw new ServiceError("A period becomes exported when you create an export", 400);
  }

  const reopening = to === "in_review" && (from === "exported" || from === "filed");
  const cleanNote = typeof note === "string" ? note.trim().slice(0, 500) : "";
  if (reopening && !cleanNote) {
    throw new ServiceError("Please give a reason for reopening this period", 400);
  }

  if (to === "ready" || to === "exported") {
    const readiness = await readinessCheck(business, period._id);
    if (!readiness.canMarkReady) {
      throw new ServiceError("Review pending lines and resolve blockers first", 409, {
        pendingLines: readiness.pendingLines,
        blockerLines: readiness.blockerLines,
      });
    }
  }

  const entry = { at: new Date(), by: userId, action: reopening ? "reopen" : "transition", from, to };
  if (cleanNote) entry.note = cleanNote;

  const update = { $set: { status: to }, $push: { auditLog: entry } };
  if (to === "filed") update.$set.filedAt = new Date();
  if (reopening) {
    update.$inc = { version: 1 };
    if (from === "filed") update.$unset = { filedAt: 1 };
  }

  // Matching on the old status stops two requests racing each other.
  const updated = await VatPeriod.findOneAndUpdate(
    { _id: period._id, business, status: from },
    update,
    { new: true }
  );
  if (!updated) {
    throw new ServiceError("This period was changed by someone else. Please refresh and try again.", 409);
  }
  return withDueInfo(updated);
}

// For the export service to call once a snapshot has been created.
const markExported = (business, periodId, userId) =>
  transitionPeriod({ business, periodId, to: "exported", userId, internal: true });

module.exports = {
  ServiceError,
  TRANSITIONS,
  periodBounds,
  dueDateFor,
  withDueInfo,
  isEditable,
  syncPeriods,
  readinessCheck,
  getPeriodSummary,
  transitionPeriod,
  markExported,
};