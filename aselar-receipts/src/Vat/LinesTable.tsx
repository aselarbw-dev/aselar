// src/Vat/LinesTable.tsx
// The table of sales and purchases in a period. Each row can be opened to show its flags and
// details. Actions only appear while the period can still be changed.

import { Fragment, useState } from "react";
import s from "./Vat.module.css";
import type { Flag, Line } from "./types";
import { REVIEW_LABEL, SEVERITY_LABEL, SUPPLY_LABEL, dateOnly, flagTitle, pula, thebeToInput } from "./format";
import { Badge, type BadgeTone } from "./Ui";

interface Props {
  lines: Line[];
  editable: boolean;
  /** The line an action is running on (its buttons are switched off). */
  busyId: string | null;
  onConfirm: (line: Line) => void;
  onReject: (line: Line) => void;
  onReopen: (line: Line) => void;
  onEdit: (line: Line) => void;
  onResolve: (line: Line, flag: Flag) => void;
}

const REVIEW_TONE: Record<Line["reviewStatus"], BadgeTone> = {
  pending: "warn",
  confirmed: "good",
  rejected: "muted",
};

export default function LinesTable({ lines, editable, busyId, onConfirm, onReject, onReopen, onEdit, onResolve }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (lines.length === 0) {
    return <div className={`${s.tableWrap} ${s.empty}`}>No lines to show. Add a sale or a purchase, or import a file.</div>;
  }

  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead>
          <tr>
            <th>Type</th>
            <th>Date</th>
            <th>Invoice</th>
            <th>Name</th>
            <th className={s.right}>Amount</th>
            <th className={s.right}>VAT</th>
            <th>Status</th>
            <th>Issues</th>
            <th>
              <span className={s.muted}>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const open = openId === line._id;
            const busy = busyId === line._id;
            const blockers = line.flags.filter((f) => f.severity === "blocker" && !f.resolved).length;
            const warnings = line.flags.filter((f) => f.severity === "warning" && !f.resolved).length;

            return (
              <Fragment key={line._id}>
                <tr>
                  <td>
                    <Badge tone={line.direction === "output" ? "info" : "muted"}>{line.direction === "output" ? "Sale" : "Purchase"}</Badge>
                    {line.docType === "credit_note" && (
                      <>
                        {" "}
                        <Badge tone="warn">Credit note</Badge>
                      </>
                    )}
                  </td>
                  <td className={s.num}>{dateOnly(line.invoiceDate) || "–"}</td>
                  <td className={s.cell} title={line.invoiceNumber}>
                    {line.invoiceNumber || <span className={s.muted}>none</span>}
                  </td>
                  <td className={s.cell} title={line.counterpartyName}>
                    {line.counterpartyName || <span className={s.muted}>–</span>}
                  </td>
                  <td className={s.num}>{pula(line.amountExclThebe)}</td>
                  <td className={s.num}>{pula(line.vatThebe)}</td>
                  <td>
                    <Badge tone={REVIEW_TONE[line.reviewStatus]}>{REVIEW_LABEL[line.reviewStatus]}</Badge>
                  </td>
                  <td>
                    {blockers > 0 && (
                      <Badge tone="bad">
                        {blockers} {SEVERITY_LABEL.blocker.toLowerCase()}
                      </Badge>
                    )}{" "}
                    {warnings > 0 && (
                      <Badge tone="warn">
                        {warnings} {SEVERITY_LABEL.warning.toLowerCase()}
                      </Badge>
                    )}
                    {blockers === 0 && warnings === 0 && <span className={s.muted}>–</span>}
                  </td>
                  <td>
                    <div className={s.row} style={{ gap: 6 }}>
                      <button
                        type="button"
                        className={`${s.button} ${s.buttonSmall}`}
                        aria-expanded={open}
                        onClick={() => setOpenId(open ? null : line._id)}
                      >
                        {open ? "Hide" : "Details"}
                      </button>
                      {editable && line.reviewStatus === "pending" && (
                        <>
                          <button type="button" className={`${s.button} ${s.buttonSmall} ${s.buttonPrimary}`} disabled={busy} onClick={() => onConfirm(line)}>
                            Confirm
                          </button>
                          <button type="button" className={`${s.button} ${s.buttonSmall}`} disabled={busy} onClick={() => onEdit(line)}>
                            Edit
                          </button>
                          <button type="button" className={`${s.button} ${s.buttonSmall} ${s.buttonDanger}`} disabled={busy} onClick={() => onReject(line)}>
                            Reject
                          </button>
                        </>
                      )}
                      {editable && line.reviewStatus === "confirmed" && (
                        <>
                          <button type="button" className={`${s.button} ${s.buttonSmall}`} disabled={busy} onClick={() => onReopen(line)}>
                            Reopen
                          </button>
                          <button type="button" className={`${s.button} ${s.buttonSmall}`} disabled={busy} onClick={() => onEdit(line)}>
                            Edit
                          </button>
                        </>
                      )}
                      {editable && line.reviewStatus === "rejected" && (
                        <button type="button" className={`${s.button} ${s.buttonSmall}`} disabled={busy} onClick={() => onReopen(line)}>
                          Reopen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {open && (
                  <tr className={s.detailRow}>
                    <td colSpan={9}>
                      <div className={s.detailGrid}>
                        <Detail label={line.direction === "output" ? "Customer TIN" : "Supplier TIN"} value={line.counterpartyTin} />
                        <Detail label="Description" value={line.description} />
                        <Detail label="Supply" value={SUPPLY_LABEL[line.supplyType] + (line.country ? ` (${line.country})` : "")} />
                        <Detail label="VAT class" value={line.vatClass === "standard" ? "Standard-rated" : line.vatClass === "zero" ? "Zero-rated" : "Exempt"} />
                        {line.currency !== "BWP" && (
                          <Detail
                            label="Original amount"
                            value={`${line.currency} ${thebeToInput(line.originalAmountMinor ?? 0)} at ${line.fxRate}`}
                          />
                        )}
                        {line.direction === "input" && <Detail label="Claimed" value={line.claimable ? "Yes" : "No, not claimed"} />}
                        <Detail label="Added by" value={line.source === "import" ? "File import" : line.source === "ocr" ? "Invoice scan" : line.source === "aselar" ? "Aselar" : "Typed in"} />
                      </div>

                      {line.flags.length === 0 ? (
                        <p className={s.muted}>No issues were found on this line.</p>
                      ) : (
                        <div>
                          <h3>Issues</h3>
                          {line.flags.map((flag, index) => (
                            <div key={flag._id ?? `${flag.code}-${index}`} className={s.flagItem}>
                              <Badge tone={flag.resolved ? "muted" : flag.severity === "blocker" ? "bad" : "warn"}>{flagTitle(flag.code)}</Badge>
                              <span className={flag.resolved ? s.flagResolved : undefined}>{flag.message}</span>
                              {flag.resolved && <span className={s.muted}>(accepted)</span>}
                              {!flag.resolved && editable && line.reviewStatus !== "rejected" && flag._id && (
                                <button
                                  type="button"
                                  className={`${s.button} ${s.buttonSmall}`}
                                  disabled={busy}
                                  onClick={() => onResolve(line, flag)}
                                  title="Accept this issue on purpose, for example two different invoices with the same number"
                                >
                                  Accept
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className={s.detailLabel}>{label}</div>
      <div>{value || <span className={s.muted}>–</span>}</div>
    </div>
  );
}