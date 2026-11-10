// Taxation/services/reconcileService.js
// The database side of reconciliation. The maths lives in reconcileCalc.js (pure logic); this
// file fetches the grouped line totals, works out the whole run of periods up to the one asked
// for (so credit carried forward is always right), and caches the result on the period.

const { VatPeriod, VatLine } = require("../models/vatModels");
const { ServiceError, withDueInfo } = require("./periodService");
const { reconcileChain } = require("./reconcileCalc");

// Exported and filed periods are frozen records: they are calculated but never rewritten.
const CACHEABLE_STATUSES = ["open", "in_review", "ready"];

async function reconcilePeriod({ business, periodId }) {
  // Every period up to and including this one, oldest first. (At most a few dozen.)
  const periods = await VatPeriod.find({ business }).sort({ periodStart: 1 }).lean();
  const index = periods.findIndex((p) => String(p._id) === String(periodId));
  if (index === -1) throw new ServiceError("Period not found", 404);
  const run = periods.slice(0, index + 1);
  const period = run[index];

  // One database query adds up all the lines of the whole run, grouped by what matters for the
  // return. Rejected lines are left out; pending ones are included (and counted) so the figures
  // are visible while the review is still going on.
  const grouped = await VatLine.aggregate([
    {
      $match: {
        business,
        reviewStatus: { $ne: "rejected" },
        period: { $in: run.map((p) => p._id) },
      },
    },
    {
      $group: {
        _id: {
          period: "$period",
          direction: "$direction",
          supplyType: "$supplyType",
          vatClass: "$vatClass",
          claimable: "$claimable",
          reviewStatus: "$reviewStatus",
        },
        base: { $sum: "$amountExclThebe" },
        vat: { $sum: "$vatThebe" },
        count: { $sum: 1 },
      },
    },
  ]);

  const rowsByPeriod = new Map();
  for (const g of grouped) {
    const key = String(g._id.period);
    if (!rowsByPeriod.has(key)) rowsByPeriod.set(key, []);
    rowsByPeriod.get(key).push({
      direction: g._id.direction,
      supplyType: g._id.supplyType,
      vatClass: g._id.vatClass,
      claimable: g._id.claimable,
      reviewStatus: g._id.reviewStatus,
      base: g.base,
      vat: g.vat,
      count: g.count,
    });
  }

  // The first period's opening credit is the one set from the profile; every later period
  // takes the previous period's closing credit.
  const results = reconcileChain(
    run.map((p) => p._id),
    rowsByPeriod,
    run[0].openingCreditThebe || 0
  );
  const result = results[results.length - 1];

  // Keep the totals on the period, so lists can show them without recalculating.
  if (CACHEABLE_STATUSES.includes(period.status)) {
    const set = {
      totals: {
        outputBaseThebe: result.exact.outputBase,
        outputVatThebe: result.exact.outputVat,
        inputBaseThebe: result.exact.inputBase,
        inputVatThebe: result.exact.inputVat,
        netThebe: result.exact.net,
        closingCreditThebe: result.exact.closingCredit,
        computedAt: new Date(),
      },
    };
    if (index > 0) set.openingCreditThebe = result.exact.openingCredit;
    await VatPeriod.updateOne({ _id: period._id, business }, { $set: set });

    // Show the period as it is now, not as it was before this update.
    period.totals = set.totals;
    if (set.openingCreditThebe !== undefined) period.openingCreditThebe = set.openingCreditThebe;
  }

  const { periodId: ignored, ...figures } = result; // eslint-disable-line no-unused-vars
  return { period: withDueInfo(period), ...figures };
}

module.exports = { reconcilePeriod };