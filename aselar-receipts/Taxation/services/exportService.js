// Taxation/services/exportService.js
// Turning a "ready" period into an export, and finding exports again.
//
// An export is a FROZEN SNAPSHOT: the period's lines and figures as they are at that moment.
// The Excel files are built from the snapshot whenever they are downloaded, so they always
// match what was exported, even if anything changes in the period afterwards.
// (A change after export means reopening the period, which creates a new version.)

const { VatProfile, VatPeriod, VatLine, VatExport } = require("../models/vatModels");
const { ServiceError, readinessCheck, markExported } = require("./periodService");
const { reconcilePeriod } = require("./reconcileService");

const HOUR_MS = 60 * 60 * 1000;

// Period boundaries are local midnights, so shifting by 12 hours lands on the right local
// calendar day for any time zone from UTC-12 to UTC+12.
const localDayOfStart = (d) => new Date(new Date(d).getTime() + 12 * HOUR_MS).toISOString().slice(0, 10);
const localDayOfEnd = (d) => new Date(new Date(d).getTime() - 12 * HOUR_MS).toISOString().slice(0, 10);

// The line fields that are kept in the snapshot (the flags are kept for the review trail).
const FROZEN_FIELDS = [
  "direction",
  "docType",
  "invoiceNumber",
  "invoiceDate",
  "counterpartyName",
  "counterpartyTin",
  "description",
  "supplyType",
  "country",
  "currency",
  "fxRate",
  "originalAmountMinor",
  "amountExclThebe",
  "vatThebe",
  "vatClass",
  "claimable",
  "source",
  "reviewStatus",
  "reviewedAt",
];

function freezeLine(line) {
  const frozen = { lineId: line._id };
  for (const field of FROZEN_FIELDS) {
    if (line[field] !== undefined) frozen[field] = line[field];
  }
  frozen.flags = (line.flags || []).map((f) => ({
    code: f.code,
    severity: f.severity,
    message: f.message,
    resolved: Boolean(f.resolved),
    resolvedAt: f.resolvedAt,
  }));
  return frozen;
}

// Freezes a ready period: checks it again, records the snapshot, then marks the period exported.
async function createExport({ business, businessName, periodId, userId }) {
  const period = await VatPeriod.findOne({ _id: periodId, business }).lean();
  if (!period) throw new ServiceError("Period not found", 404);

  if (period.status !== "ready") {
    throw new ServiceError(`Only a "ready" period can be exported. This one is "${period.status}".`, 409);
  }

  // The same check as moving to "ready", repeated: nothing may be pending or blocked.
  const readiness = await readinessCheck(business, period._id);
  if (!readiness.canMarkReady) {
    throw new ServiceError("Review pending lines and resolve blockers first", 409, {
      pendingLines: readiness.pendingLines,
      blockerLines: readiness.blockerLines,
    });
  }

  const profile = await VatProfile.findOne({ business }).lean();
  if (!profile) throw new ServiceError("Set up your VAT profile first", 409);

  // Fresh figures (this also refreshes the totals cached on the period).
  const { period: ignored, ...reconciliation } = await reconcilePeriod({ business, periodId: period._id }); // eslint-disable-line no-unused-vars

  const lines = await VatLine.find({ business, period: period._id, reviewStatus: { $ne: "rejected" } })
    .sort({ invoiceDate: 1, createdAt: 1 })
    .lean();

  const snapshot = {
    lines: lines.map(freezeLine),
    totals: {
      meta: {
        businessName: businessName || "",
        vatNumber: profile.vatNumber || "",
        countryCode: profile.countryCode,
        ratePercent: profile.ratePercent,
        periodStart: localDayOfStart(period.periodStart),
        periodEnd: localDayOfEnd(period.periodEnd),
        dueDate: localDayOfEnd(period.dueDate),
        periodVersion: period.version,
        generatedAt: new Date().toISOString(),
      },
      reconciliation,
    },
  };

  let record;
  try {
    record = await VatExport.create({
      business,
      period: period._id,
      version: period.version,
      snapshot,
      createdBy: userId,
    });
  } catch (err) {
    // The (period, version) pair is unique, so a second export of the same version is refused.
    if (err.code === 11000) {
      throw new ServiceError("This version of the period has already been exported.", 409);
    }
    throw err;
  }

  // Mark the period exported. If that fails, take the snapshot back so nothing is left half done.
  try {
    await markExported(business, period._id, userId);
  } catch (err) {
    await VatExport.deleteOne({ _id: record._id });
    throw err;
  }

  return {
    export: { _id: record._id, version: record.version, createdAt: record.createdAt },
    figures: { exact: reconciliation.exact, rounded: reconciliation.rounded },
  };
}

// The exports of one period, newest first (without the snapshots, which can be large).
async function listExports({ business, periodId }) {
  const period = await VatPeriod.findOne({ _id: periodId, business }).lean();
  if (!period) throw new ServiceError("Period not found", 404);

  const exports = await VatExport.find({ business, period: period._id })
    .sort({ version: -1 })
    .select("version createdAt createdBy")
    .lean();
  return { exports };
}

// One export with its snapshot, for building the files.
async function getExport({ business, exportId }) {
  const record = await VatExport.findOne({ _id: exportId, business }).lean();
  if (!record) throw new ServiceError("Export not found", 404);
  return record;
}

module.exports = { createExport, listExports, getExport };