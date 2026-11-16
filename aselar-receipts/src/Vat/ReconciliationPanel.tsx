// src/Vat/ReconciliationPanel.tsx
// The VAT figures for a period, laid out like the reconciliation report: output VAT, input VAT
// claimed, and the result. The right-hand column is rounded to the nearest pula, as BURS asks.

import s from "./Vat.module.css";
import type { Reconciliation } from "./types";
import { pula, pulaWhole } from "./format";
import { Loading } from "./Ui";

interface Row {
  heading?: string;
  label?: string;
  exact?: number;
  rounded?: number;
  total?: boolean;
}

export default function ReconciliationPanel({ rec, loading }: { rec: Reconciliation | undefined; loading: boolean }) {
  if (!rec) return loading ? <Loading text="Working out the figures…" /> : null;

  const { breakdown: b, exact: e, rounded: r } = rec;

  const rows: Row[] = [
    { heading: "Output VAT" },
    { label: "Standard-rated sales", exact: b.output.standard.vat, rounded: r.detail.outputStandardVat },
    { label: "Reverse charge on imported services", exact: b.reverseCharge.vat, rounded: r.detail.reverseChargeVat },
    { label: "Total output VAT", exact: e.outputVat, rounded: r.outputVat, total: true },
    { heading: "Input VAT claimed" },
    { label: "Local purchases and expenses", exact: b.input.local.vat, rounded: r.detail.localInputVat },
    { label: "Imported goods", exact: b.input.importedGoods.vat, rounded: r.detail.importedGoodsVat },
    { label: "Imported services", exact: b.input.importedServices.vat, rounded: r.detail.importedServicesVat },
    { label: "Total input VAT", exact: e.inputVat, rounded: r.inputVat, total: true },
    { heading: "Result" },
    { label: "Output VAT less input VAT", exact: e.netBeforeCredit, rounded: r.outputVat - r.inputVat },
    { label: "Credit brought forward", exact: e.openingCredit, rounded: r.openingCredit },
    { label: "Net VAT: payable (+) or credit (−)", exact: e.net, rounded: r.net, total: true },
    { label: "VAT payable", exact: e.payable, rounded: r.payable },
    { label: "Credit carried forward", exact: e.closingCredit, rounded: r.credit },
  ];

  const payable = r.payable > 0;

  return (
    <div className={s.stack}>
      <div className={s.spread}>
        <div>
          <div className={s.statLabel}>{payable ? "VAT payable for this period" : "Credit carried forward"}</div>
          <div className={s.statValue} data-testid="headline">
            {pulaWhole(payable ? r.payable : r.credit)}
          </div>
          <div className={s.statNote}>Exact: {pula(payable ? e.payable : e.closingCredit)}</div>
        </div>
      </div>

      {rec.pendingLines > 0 && (
        <div className={`${s.notice} ${s.noticeInfo}`} style={{ margin: 0 }}>
          These figures are provisional: {rec.pendingLines} line{rec.pendingLines === 1 ? " is" : "s are"} still to review.
        </div>
      )}

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Description</th>
              <th className={s.right}>Exact</th>
              <th className={s.right}>Rounded to the nearest pula</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) =>
              row.heading ? (
                <tr key={`h-${index}`}>
                  <td colSpan={3}>
                    <strong>{row.heading}</strong>
                  </td>
                </tr>
              ) : (
                <tr key={`r-${index}`} className={row.total ? s.totalRow : undefined}>
                  <td>{row.label}</td>
                  <td className={s.num}>{pula(row.exact)}</td>
                  <td className={s.num}>{pulaWhole(row.rounded)}</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {rec.refund.maybeClaimable && (
        <div className={`${s.notice} ${s.noticeInfo}`} style={{ margin: 0 }}>
          This is credit period number {rec.refund.consecutiveCreditPeriods} in a row. A refund may be claimable: confirm the rules with your tax adviser.
        </div>
      )}

      <p className={s.muted} style={{ margin: 0 }}>
        Each total is rounded once from its exact figure, so the form adds up. The detail rows are rounded separately and can differ from their total by a pula. Reverse charge: VAT on services bought from abroad is
        declared as output tax and claimed back as input tax.
      </p>
    </div>
  );
}