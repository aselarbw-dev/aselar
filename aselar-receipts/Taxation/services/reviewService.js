// Taxation/services/reviewService.js
// What a person does to a line after it exists: edit it, confirm it, reject it, reopen it,
// or deliberately resolve one of its flags.
//
// Rules in one place:
//   - lines only change while their period is open or in review
//   - confirming checks the line again first, and refuses while a blocker is unresolved
//   - confirming also marks the line's warnings as seen (that is what "I reviewed it" means)
//   - any edit puts the line back to "pending", because a changed line must be reviewed again
//   - every change is made against the status we just read, so two people cannot overwrite
//     each other without one of them being told

const { VatProfile, VatPeriod, VatLine } = require("../models/vatModels");
const { ServiceError, isEditable } = require("./periodService");
const { buildLine } = require("./lineBuilder");
const { unresolvedBlockers, acknowledgeWarnings } = require("./verificationRules");
const { flagsForExistingLine } = require("./verificationService");

// What each action turns the line's review status into.
const ACTIONS = { confirm: "confirmed", reject: "rejected", reopen: "pending" };

// Which moves are allowed from each status.
const REVIEW_TRANSITIONS = {
  pending: ["confirmed", "rejected"],
  confirmed: ["pending", "rejected"],
  rejected: ["pending"],
};

// Optional line fields. When an edit leaves one out, the stored value is removed.
const OPTIONAL_FIELDS = [
  "invoiceNumber",
  "invoiceDate",
  "counterpartyName",
  "counterpartyTin",
  "description",
  "country",
  "originalAmountMinor",
];

// The line must exist, belong to this business, and sit in a period that still accepts changes.
async function loadEditable(business, lineId) {
  const line = await VatLine.findOne({ _id: lineId, business }).lean();
  if (!line) throw new ServiceError("Line not found", 404);

  const period = await VatPeriod.findOne({ _id: line.period, business });
  if (!period) throw new ServiceError("Line not found", 404);

  if (!isEditable(period.status)) {
    throw new ServiceError(
      `This period is "${period.status}", so its lines can no longer be changed. Move it back to in_review first.`,
      409
    );
  }
  return { line, period };
}

async function loadProfile(business) {
  const profile = await VatProfile.findOne({ business });
  if (!profile) throw new ServiceError("Set up your VAT profile first", 409);
  return profile;
}

const changedByAnother = () =>
  new ServiceError("This line was changed by someone else. Please refresh and try again.", 409);

// Replaces the line's details. The client sends the line the way it does when creating one
// (see lineBuilder.js); anything optional that is left out is cleared. The direction cannot
// change: reject the line and add a new one instead.
async function updateLine({ business, lineId, input }) {
  const { line, period } = await loadEditable(business, lineId);

  if (line.reviewStatus === "rejected") {
    throw new ServiceError("This line is rejected. Reopen it before editing.", 409);
  }

  const src = input && typeof input === "object" && !Array.isArray(input) ? { ...input } : {};
  if (src.direction !== undefined && src.direction !== line.direction) {
    throw new ServiceError("A line's direction cannot be changed. Reject it and add a new line.", 400);
  }
  src.direction = line.direction;

  const profile = await loadProfile(business);
  const built = buildLine(src, { profile });
  if (!built.ok) throw new ServiceError("Some fields need fixing", 400, { errors: built.errors });

  // Re-check against the new values. Flags a person already resolved stay resolved only if the
  // facts behind them are unchanged.
  const flags = await flagsForExistingLine({
    business,
    line: { ...built.line, _id: line._id, flags: line.flags, reviewStatus: "pending" },
    profile,
    period,
  });

  const set = { reviewStatus: "pending", flags };
  const unset = { reviewedBy: 1, reviewedAt: 1 };
  for (const [key, value] of Object.entries(built.line)) {
    if (value !== undefined) set[key] = value;
    else if (OPTIONAL_FIELDS.includes(key)) unset[key] = 1;
  }

  const updated = await VatLine.findOneAndUpdate(
    { _id: line._id, business, reviewStatus: line.reviewStatus },
    { $set: set, $unset: unset },
    { new: true, runValidators: true }
  );
  if (!updated) throw changedByAnother();
  return updated;
}

// Confirm, reject or reopen a line.
async function reviewLine({ business, lineId, action, userId }) {
  const to = ACTIONS[action];
  if (!to) {
    throw new ServiceError(`action must be one of: ${Object.keys(ACTIONS).join(", ")}`, 400);
  }

  const { line, period } = await loadEditable(business, lineId);
  const from = line.reviewStatus;
  if (!REVIEW_TRANSITIONS[from].includes(to)) {
    throw new ServiceError(`A line that is "${from}" cannot be moved to "${to}"`, 409);
  }

  const now = new Date();
  const set = { reviewStatus: to };
  const unset = {};

  if (to === "rejected") {
    // A rejected line is left out of the return; its flags stop mattering.
    set.reviewedBy = userId;
    set.reviewedAt = now;
  } else {
    // Confirming and reopening both start from a fresh check: the stored flags could be out of
    // date (for example, a duplicate added after this line was last checked).
    const profile = await loadProfile(business);
    let flags = await flagsForExistingLine({
      business,
      line: { ...line, reviewStatus: "pending" },
      profile,
      period,
    });

    if (to === "confirmed") {
      const blockers = unresolvedBlockers(flags);
      if (blockers.length) {
        throw new ServiceError("Fix or resolve the blockers before confirming this line", 409, {
          blockers: blockers.map((f) => ({ _id: f._id, code: f.code, message: f.message })),
        });
      }
      flags = acknowledgeWarnings(flags, userId, now); // confirming = the warnings were seen
      set.reviewedBy = userId;
      set.reviewedAt = now;
    } else {
      unset.reviewedBy = 1; // reopened: no longer reviewed
      unset.reviewedAt = 1;
    }
    set.flags = flags;
  }

  const update = { $set: set };
  if (Object.keys(unset).length) update.$unset = unset;

  const updated = await VatLine.findOneAndUpdate(
    { _id: line._id, business, reviewStatus: from },
    update,
    { new: true }
  );
  if (!updated) throw changedByAnother();
  return updated;
}

// Deliberately accepts one flag, for example a duplicate invoice number that is genuinely
// two different invoices. Records who did it and when.
async function resolveFlag({ business, lineId, flagId, userId }) {
  const { line } = await loadEditable(business, lineId);

  if (line.reviewStatus === "rejected") {
    throw new ServiceError("This line is rejected, so its flags no longer matter.", 409);
  }

  const flag = (line.flags || []).find((f) => String(f._id) === String(flagId));
  if (!flag) throw new ServiceError("Flag not found", 404);
  if (flag.resolved) return line; // already done: nothing to change

  const updated = await VatLine.findOneAndUpdate(
    { _id: line._id, business, "flags._id": flagId },
    {
      $set: {
        "flags.$.resolved": true,
        "flags.$.resolvedBy": userId,
        "flags.$.resolvedAt": new Date(),
      },
    },
    { new: true }
  );
  if (!updated) throw changedByAnother();
  return updated;
}

module.exports = { updateLine, reviewLine, resolveFlag, ACTIONS, REVIEW_TRANSITIONS };