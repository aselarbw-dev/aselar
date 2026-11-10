// Taxation/services/lineService.js
// Saving and listing VAT lines (the sales and purchases inside a period).
//
// The line builder decides what a valid line looks like; this file adds the database side:
// which period it goes into, whether that period still accepts lines, and who created it.
// Review actions (edit, confirm, reject) come in a later step.

const { VatProfile, VatPeriod, VatLine } = require("../models/vatModels");
const { ServiceError, isEditable } = require("./periodService");
const { buildLine } = require("./lineBuilder");
const { flagsForNewLine } = require("./verificationService");

const DIRECTIONS = ["output", "input"];
const REVIEW_STATUSES = ["pending", "confirmed", "rejected"];
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

// The period must exist AND belong to this business. Filtering on `business` is what stops
// one business from reading or writing another's data by guessing an id.
async function findPeriod(business, periodId) {
  const period = await VatPeriod.findOne({ _id: periodId, business });
  if (!period) throw new ServiceError("Period not found", 404);
  return period;
}

// Adds one line to a period.
// The client's input only supplies the line's own details. The server decides business,
// period, source, createdBy, review status and flags, so none of those can be set from outside.
async function createLine({ business, periodId, input, userId, source = "manual" }) {
  const period = await findPeriod(business, periodId);

  // Lines can only change while a period is open or in review. (If a period becomes "ready"
  // in the instant between this check and the save, the readiness check will still catch the
  // new pending line before the period can be exported.)
  if (!isEditable(period.status)) {
    throw new ServiceError(
      `This period is "${period.status}", so lines cannot be added. Move it back to in_review first.`,
      409
    );
  }

  const profile = await VatProfile.findOne({ business });
  if (!profile) throw new ServiceError("Set up your VAT profile first", 409);

  const built = buildLine(input, { profile });
  if (!built.ok) {
    throw new ServiceError("Some fields need fixing", 400, { errors: built.errors });
  }

  // Run the verification rules now, so the line is saved with its blockers and warnings.
  const flags = await flagsForNewLine({ business, line: built.line, profile, period });

  return VatLine.create({
    ...built.line,
    business,
    period: period._id,
    source,
    createdBy: userId,
    flags,
  });
}

// Lists a period's lines, optionally filtered, one page at a time.
// Filter values are checked against fixed lists; raw query text never goes into the database query.
async function listLines({ business, periodId, direction, reviewStatus, page, limit }) {
  const period = await findPeriod(business, periodId);

  const filter = { business, period: period._id };

  if (direction !== undefined) {
    if (!DIRECTIONS.includes(direction)) {
      throw new ServiceError('direction must be "output" or "input"', 400);
    }
    filter.direction = direction;
  }
  if (reviewStatus !== undefined) {
    if (!REVIEW_STATUSES.includes(reviewStatus)) {
      throw new ServiceError('reviewStatus must be "pending", "confirmed" or "rejected"', 400);
    }
    filter.reviewStatus = reviewStatus;
  }

  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit, 10) || DEFAULT_LIMIT));

  const [lines, total] = await Promise.all([
    VatLine.find(filter)
      .sort({ invoiceDate: 1, createdAt: 1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    VatLine.countDocuments(filter),
  ]);

  return { lines, total, page: pageNumber, limit: pageSize };
}

module.exports = { createLine, listLines };