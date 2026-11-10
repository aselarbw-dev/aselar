// Taxation/services/reconcileCalc.js
//
// The reconciliation maths: from grouped line totals to "how much VAT is payable, or what
// credit is carried forward". Pure logic: no database, no Express, so it can be tested with
// plain node. reconcileService.js feeds it the grouped totals from the database.
//
// All money is whole thebe. The ONLY place anything is rounded to a whole pula is the
// `rounded` figures at the end (BURS wants the nearest pula). Everything else stays exact.
//
// A "row" is the total of all lines that share the same combination of:
//   { direction, supplyType, vatClass, claimable, reviewStatus }  ->  { base, vat, count }
// (base = amount before VAT, vat = VAT, count = how many lines). Rejected lines are never
// included: the caller leaves them out.

const { divRound } = require("../utils/Money");

// Nearest whole pula, with exactly half a pula rounding away from zero (P0.50 -> P1).
const roundToPula = (thebe) => divRound(thebe, 100);

const emptyBucket = () => ({ base: 0, vat: 0, count: 0 });
const addTo = (bucket, row) => {
  bucket.base += row.base;
  bucket.vat += row.vat;
  bucket.count += row.count;
};

// Adds up one period's rows into the pieces the return is built from.
function summarizeRows(rows = []) {
  const output = { standard: emptyBucket(), zeroRated: emptyBucket(), exempt: emptyBucket() };
  const input = {
    local: emptyBucket(),
    importedGoods: emptyBucket(),
    importedServices: emptyBucket(),
    notClaimed: emptyBucket(), // purchases marked as not claimable: listed, but no VAT is claimed
  };
  // Reverse charge: for services bought from abroad the business declares the VAT on itself
  // as OUTPUT tax, and (if it can claim it) takes the same amount back as INPUT tax. It is
  // declared whether or not the input VAT can be claimed.
  const reverseCharge = emptyBucket();

  let lines = 0;
  let pendingLines = 0;

  for (const row of rows) {
    lines += row.count;
    if (row.reviewStatus === "pending") pendingLines += row.count;

    if (row.direction === "output") {
      const bucket =
        row.vatClass === "zero" ? output.zeroRated : row.vatClass === "exempt" ? output.exempt : output.standard;
      addTo(bucket, row);
      continue;
    }

    // purchases
    if (row.supplyType === "imported_services") addTo(reverseCharge, row);

    if (row.claimable === false) {
      addTo(input.notClaimed, row);
      continue;
    }
    const bucket =
      row.supplyType === "imported_goods"
        ? input.importedGoods
        : row.supplyType === "imported_services"
        ? input.importedServices
        : input.local;
    addTo(bucket, row);
  }

  const totals = {
    outputBase: output.standard.base + output.zeroRated.base + output.exempt.base,
    outputVat: output.standard.vat + reverseCharge.vat,
    inputBase: input.local.base + input.importedGoods.base + input.importedServices.base,
    inputVat: input.local.vat + input.importedGoods.vat + input.importedServices.vat,
  };

  return { lines, pendingLines, breakdown: { output, reverseCharge, input }, totals };
}

// Turns a period's summary into the return figures, given the credit brought forward.
//   net = output VAT - input VAT - credit brought forward
//   net above zero  -> payable;   net below zero -> a credit, carried forward
function finalize(summary, openingCredit = 0) {
  const { totals, breakdown } = summary;

  const netBeforeCredit = totals.outputVat - totals.inputVat;
  const net = netBeforeCredit - openingCredit;

  const exact = {
    outputBase: totals.outputBase,
    outputVat: totals.outputVat,
    inputBase: totals.inputBase,
    inputVat: totals.inputVat,
    openingCredit,
    netBeforeCredit,
    net, // positive = pay, negative = credit
    payable: Math.max(net, 0),
    closingCredit: Math.max(-net, 0),
  };

  // The figures for the return, in whole pula. Each BOX is rounded once from the exact figure,
  // and the net is the difference of the rounded boxes, so the form always adds up. The detail
  // rows are rounded on their own, so they may differ from their total by a pula.
  const outputVat = roundToPula(totals.outputVat);
  const inputVat = roundToPula(totals.inputVat);
  const openingCreditPula = roundToPula(openingCredit);
  const netPula = outputVat - inputVat - openingCreditPula;

  const rounded = {
    outputVat,
    inputVat,
    openingCredit: openingCreditPula,
    net: netPula,
    payable: Math.max(netPula, 0),
    credit: Math.max(-netPula, 0),
    detail: {
      outputStandardVat: roundToPula(breakdown.output.standard.vat),
      reverseChargeVat: roundToPula(breakdown.reverseCharge.vat),
      localInputVat: roundToPula(breakdown.input.local.vat),
      importedGoodsVat: roundToPula(breakdown.input.importedGoods.vat),
      importedServicesVat: roundToPula(breakdown.input.importedServices.vat),
    },
  };

  return { exact, rounded };
}

// Reconciles a run of consecutive periods, oldest first, carrying each period's closing credit
// into the next. rowsByPeriod is a Map from period id (as text) to that period's rows.
// Also counts how many periods in a row have ended with a credit, because a refund may only be
// claimable after two (to be confirmed with a practitioner).
function reconcileChain(periodIds, rowsByPeriod, firstOpeningCredit = 0) {
  const results = [];
  let opening = firstOpeningCredit;
  let consecutive = 0;

  for (const id of periodIds) {
    const summary = summarizeRows(rowsByPeriod.get(String(id)) || []);
    const { exact, rounded } = finalize(summary, opening);

    consecutive = exact.closingCredit > 0 ? consecutive + 1 : 0;

    results.push({
      periodId: id,
      lines: summary.lines,
      pendingLines: summary.pendingLines,
      breakdown: summary.breakdown,
      exact,
      rounded,
      refund: { consecutiveCreditPeriods: consecutive, maybeClaimable: consecutive >= 2 },
    });
    opening = exact.closingCredit;
  }
  return results;
}

module.exports = { roundToPula, summarizeRows, finalize, reconcileChain };