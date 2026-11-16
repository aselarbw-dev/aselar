// src/Vat/PeriodActions.tsx
// The buttons for a period. Which ones appear depends on where the period is in its life:
//   open / in review  add lines, import, check, mark ready
//   ready             back to review, export
//   exported          download, mark as filed, reopen
//   filed             download, reopen
// Steps that are hard to undo ask first.

import { useState } from "react";
import s from "./Vat.module.css";
import type { Direction, ExportSummary, PeriodSummary } from "./types";
import { canEditLines } from "./format";
import { ConfirmDialog, Modal } from "./Ui";

interface Props {
  summary: PeriodSummary;
  /** The newest export, if there is one. */
  latestExport: ExportSummary | undefined;
  busy: boolean;
  onAdd: (direction: Direction) => void;
  onImport: () => void;
  onVerify: () => void;
  onMarkReady: () => void;
  onBackToReview: () => void;
  onExport: () => void;
  onMarkFiled: () => void;
  onReopen: (reason: string) => void;
  onDownload: (kind: "schedule" | "report") => void;
}

type Dialog = null | "export" | "filed" | "reopen";

/** Why the period cannot be marked ready yet, in words. */
function readinessHint(pending: number, blockers: number): string {
  const parts: string[] = [];
  if (pending > 0) parts.push(`${pending} line${pending === 1 ? " is" : "s are"} still to review`);
  if (blockers > 0) parts.push(`${blockers} line${blockers === 1 ? " has" : "s have"} issues to fix`);
  return parts.join(" and ");
}

export default function PeriodActions(props: Props) {
  const { summary, latestExport, busy } = props;
  const { period, readiness } = summary;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState("");

  const finish = (action: () => void) => {
    setDialog(null);
    action();
  };

  return (
    <div className={s.stack}>
      {canEditLines(period.status) && (
        <>
          <div className={s.row}>
            <button type="button" className={s.button} disabled={busy} onClick={() => props.onAdd("output")}>
              Add sale
            </button>
            <button type="button" className={s.button} disabled={busy} onClick={() => props.onAdd("input")}>
              Add purchase
            </button>
            <button type="button" className={s.button} disabled={busy} onClick={props.onImport}>
              Import from a file
            </button>
            <button type="button" className={s.button} disabled={busy} onClick={props.onVerify}>
              Check all lines
            </button>
            <span style={{ flex: 1 }} />
            <button type="button" className={`${s.button} ${s.buttonPrimary}`} disabled={busy || !readiness.canMarkReady} onClick={props.onMarkReady}>
              Mark ready
            </button>
          </div>
          {!readiness.canMarkReady && (
            <div className={`${s.muted} ${s.small}`}>Not ready yet: {readinessHint(readiness.pendingLines, readiness.blockerLines)}.</div>
          )}
        </>
      )}

      {period.status === "ready" && (
        <div className={s.row}>
          <span className={s.muted}>This period is ready. Exporting freezes its figures.</span>
          <span style={{ flex: 1 }} />
          <button type="button" className={s.button} disabled={busy} onClick={props.onBackToReview}>
            Back to review
          </button>
          <button type="button" className={`${s.button} ${s.buttonPrimary}`} disabled={busy} onClick={() => setDialog("export")}>
            Export
          </button>
        </div>
      )}

      {(period.status === "exported" || period.status === "filed") && (
        <div className={s.row}>
          <span className={s.muted}>
            {period.status === "filed" ? "Filed." : "Exported."}
            {latestExport ? ` Version ${latestExport.version}.` : ""}
          </span>
          <span style={{ flex: 1 }} />
          <button type="button" className={`${s.button} ${s.buttonPrimary}`} disabled={busy || !latestExport} onClick={() => props.onDownload("schedule")}>
            Download BURS schedule
          </button>
          <button type="button" className={s.button} disabled={busy || !latestExport} onClick={() => props.onDownload("report")}>
            Download reconciliation report
          </button>
          {period.status === "exported" && (
            <button type="button" className={s.button} disabled={busy} onClick={() => setDialog("filed")}>
              Mark as filed
            </button>
          )}
          <button type="button" className={s.button} disabled={busy} onClick={() => setDialog("reopen")}>
            Reopen…
          </button>
        </div>
      )}

      {dialog === "export" && (
        <ConfirmDialog
          title="Export this period?"
          message="Exporting freezes this period's figures into a record. To change anything afterwards you will have to reopen the period, and the next export becomes a new version."
          confirmLabel="Export"
          busy={busy}
          onCancel={() => setDialog(null)}
          onConfirm={() => finish(props.onExport)}
        />
      )}

      {dialog === "filed" && (
        <ConfirmDialog
          title="Mark as filed?"
          message="Only do this after you have submitted the return on the BURS portal. Aselar prepares and reconciles; you review and submit."
          confirmLabel="Mark as filed"
          busy={busy}
          onCancel={() => setDialog(null)}
          onConfirm={() => finish(props.onMarkFiled)}
        />
      )}

      {dialog === "reopen" && (
        <Modal title="Reopen this period" onClose={() => setDialog(null)}>
          <form
            className={s.stack}
            onSubmit={(event) => {
              event.preventDefault();
              if (reason.trim() === "") return;
              const text = reason.trim();
              setReason("");
              finish(() => props.onReopen(text));
            }}
          >
            <p style={{ margin: 0 }}>The period goes back to review and its next export becomes a new version. The reason is kept in the period's history.</p>
            <div className={s.field}>
              <label htmlFor="reopen-reason">Why are you reopening it?</label>
              <textarea id="reopen-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className={s.buttonRow}>
              <button type="button" className={s.button} onClick={() => setDialog(null)}>
                Cancel
              </button>
              <button type="submit" className={`${s.button} ${s.buttonPrimary}`} disabled={reason.trim() === ""}>
                Reopen
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}