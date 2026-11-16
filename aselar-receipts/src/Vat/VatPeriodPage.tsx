// src/Vat/VatPeriodPage.tsx
// One tax period: its status and deadline, the return figures, and every sale and purchase in it.
// This screen holds the data and runs every action; the pieces it shows are in the other files.

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import s from "./Vat.module.css";
import type { Direction, Flag, Line, ReviewStatus } from "./types";
import {
  VatApiError,
  changePeriodStatus,
  createExport,
  downloadReport,
  downloadSchedule,
  getPeriod,
  getProfile,
  getReconciliation,
  listExports,
  listLines,
  resolveFlag,
  reviewLine,
  saveBlob,
  verifyPeriod,
} from "./vatApi";
import { STATUS_LABEL, canEditLines, dueDay, dueText, dueTone, flagTitle, periodLabel, periodRange, pulaWhole } from "./format";
import { Badge, ConfirmDialog, ErrorBox, Loading, Notice, messageOf, useLoad, useNotice, useVatPaths } from "./Ui";
import LinesTable from "./LinesTable";
import LineForm from "./LineForm";
import ImportPanel from "./ImportPanel";
import ReconciliationPanel from "./ReconciliationPanel";
import PeriodActions from "./PeriodActions";

const PAGE_SIZE = 50;

/** An error message; when the server names the blocking issues, they are listed in it. */
function describe(error: unknown): string {
  const text = messageOf(error);
  if (error instanceof VatApiError) {
    const blockers = (error.details as { blockers?: { code?: string }[] } | undefined)?.blockers;
    if (Array.isArray(blockers) && blockers.length > 0) {
      return `${text}: ${blockers.map((b) => flagTitle(b.code ?? "")).join(", ")}.`;
    }
  }
  return text;
}

export default function VatPeriodPage() {
  const { periodId = "" } = useParams<{ periodId: string }>();
  const paths = useVatPaths();
  const note = useNotice();

  // ---- what is shown ----
  const [direction, setDirection] = useState<"" | Direction>("");
  const [reviewStatus, setReviewStatus] = useState<"" | ReviewStatus>("");
  const [page, setPage] = useState(1);

  const summary = useLoad(() => getPeriod(periodId), [periodId]);
  const rec = useLoad(() => getReconciliation(periodId), [periodId]);
  const profile = useLoad(getProfile, []);
  const exportsLoad = useLoad(() => listExports(periodId), [periodId]);
  const lines = useLoad(
    () => listLines(periodId, { direction: direction || undefined, reviewStatus: reviewStatus || undefined, page, limit: PAGE_SIZE }),
    [periodId, direction, reviewStatus, page]
  );

  const reloadAll = () => {
    summary.reload();
    rec.reload();
    exportsLoad.reload();
    lines.reload();
  };

  // ---- what is open ----
  const [form, setForm] = useState<{ direction: Direction; line?: Line } | null>(null);
  const [importing, setImporting] = useState(false);
  const [rejecting, setRejecting] = useState<Line | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyPeriod, setBusyPeriod] = useState(false);

  async function lineAction(line: Line, work: () => Promise<unknown>, success: string) {
    setBusyId(line._id);
    note.clear();
    try {
      await work();
      note.success(success);
      reloadAll();
    } catch (error) {
      note.error(describe(error));
    } finally {
      setBusyId(null);
    }
  }

  async function periodAction(work: () => Promise<unknown>, success: string) {
    setBusyPeriod(true);
    note.clear();
    try {
      await work();
      note.success(success);
      reloadAll();
    } catch (error) {
      note.error(describe(error));
    } finally {
      setBusyPeriod(false);
    }
  }

  if (summary.error && !summary.data) return <ErrorBox message={summary.error} onRetry={summary.reload} />;
  if (!summary.data) return <Loading />;

  const { period, lines: counts, readiness } = summary.data;
  const editable = canEditLines(period.status);
  const toReview = counts.output.pending + counts.input.pending;
  const salesCount = counts.output.pending + counts.output.confirmed;
  const purchaseCount = counts.input.pending + counts.input.confirmed;
  const toneClass = { done: s.toneDone, late: s.toneLate, soon: s.toneSoon, ok: "" }[dueTone(period)];
  const r = rec.data?.rounded;
  const latestExport = exportsLoad.data?.[0];

  async function download(kind: "schedule" | "report") {
    if (!latestExport) return;
    await periodAction(async () => {
      const file = kind === "schedule" ? await downloadSchedule(latestExport._id) : await downloadReport(latestExport._id);
      saveBlob(file.blob, file.filename);
    }, kind === "schedule" ? "The BURS schedule was downloaded." : "The reconciliation report was downloaded.");
  }

  return (
    <div className={s.stack}>
      <div>
        <Link to={paths.periods} className={s.back}>
          ← All periods
        </Link>
        <div className={s.spread} style={{ marginTop: 6 }}>
          <div>
            <h1>{periodLabel(period)}</h1>
            <div className={s.muted}>
              {periodRange(period)} · return due {dueDay(period)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Badge tone={period.status === "filed" ? "good" : period.status === "ready" || period.status === "exported" ? "info" : "warn"}>{STATUS_LABEL[period.status]}</Badge>
            <div className={toneClass} data-testid="due">
              {dueText(period)}
            </div>
            <div className={`${s.muted} ${s.small}`}>Version {period.version}</div>
          </div>
        </div>
      </div>

      {note.notice && (
        <Notice kind={note.notice.kind} onClose={note.clear}>
          {note.notice.text}
        </Notice>
      )}

      <div className={s.cards}>
        <div className={s.stat}>
          <div className={s.statLabel}>Sales</div>
          <div className={s.statValue}>{salesCount}</div>
          <div className={s.statNote}>{counts.output.pending} to review</div>
        </div>
        <div className={s.stat}>
          <div className={s.statLabel}>Purchases</div>
          <div className={s.statValue}>{purchaseCount}</div>
          <div className={s.statNote}>{counts.input.pending} to review</div>
        </div>
        <div className={s.stat}>
          <div className={s.statLabel}>{r && r.payable > 0 ? "VAT payable" : "Credit"}</div>
          <div className={s.statValue}>{r ? pulaWhole(r.payable > 0 ? r.payable : r.credit) : "…"}</div>
          <div className={s.statNote}>{toReview > 0 ? "Provisional until all lines are reviewed" : "Rounded to the nearest pula"}</div>
        </div>
        <div className={s.stat}>
          <div className={s.statLabel}>Issues to fix</div>
          <div className={s.statValue} style={readiness.blockerLines > 0 ? { color: "var(--vat-bad)" } : undefined}>
            {readiness.blockerLines}
          </div>
          <div className={s.statNote}>lines with a blocking issue</div>
        </div>
      </div>

      <div className={s.card}>
        <PeriodActions
          summary={summary.data}
          latestExport={latestExport}
          busy={busyPeriod}
          onAdd={(d) => setForm({ direction: d })}
          onImport={() => setImporting(true)}
          onVerify={() =>
            periodAction(async () => {
              const result = await verifyPeriod(periodId);
              note.success(`Checked ${result.checked} lines: ${result.blockers} to fix, ${result.warnings} to check.`);
            }, "")
          }
          onMarkReady={() =>
            periodAction(async () => {
              if (period.status === "open") await changePeriodStatus(periodId, "in_review");
              await changePeriodStatus(periodId, "ready");
            }, "The period is ready to export.")
          }
          onBackToReview={() => periodAction(() => changePeriodStatus(periodId, "in_review"), "The period is back in review.")}
          onExport={() =>
            periodAction(async () => {
              const result = await createExport(periodId);
              note.success(`Exported as version ${result.export.version}. You can download the files now.`);
            }, "")
          }
          onMarkFiled={() => periodAction(() => changePeriodStatus(periodId, "filed"), "The period is marked as filed.")}
          onReopen={(reason) => periodAction(() => changePeriodStatus(periodId, "in_review", reason), "The period was reopened. Its next export will be a new version.")}
          onDownload={download}
        />
      </div>

      <div className={s.card}>
        <h2 style={{ marginBottom: 12 }}>VAT for this period</h2>
        <ReconciliationPanel rec={rec.data} loading={rec.loading} />
      </div>

      <div className={s.stack}>
        <div className={s.spread}>
          <h2>Sales and purchases</h2>
          <div className={s.row}>
            <select
              aria-label="Show"
              value={direction}
              onChange={(e) => {
                setDirection(e.target.value as "" | Direction);
                setPage(1);
              }}
            >
              <option value="">Sales and purchases</option>
              <option value="output">Sales only</option>
              <option value="input">Purchases only</option>
            </select>
            <select
              aria-label="Status"
              value={reviewStatus}
              onChange={(e) => {
                setReviewStatus(e.target.value as "" | ReviewStatus);
                setPage(1);
              }}
            >
              <option value="">Any status</option>
              <option value="pending">To review</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {lines.error && <ErrorBox message={lines.error} onRetry={lines.reload} />}
        {!lines.data && lines.loading && <Loading />}
        {lines.data && (
          <>
            <LinesTable
              lines={lines.data.lines}
              editable={editable}
              busyId={busyId}
              onConfirm={(line) => lineAction(line, () => reviewLine(line._id, "confirm"), "Line confirmed.")}
              onReject={(line) => setRejecting(line)}
              onReopen={(line) => lineAction(line, () => reviewLine(line._id, "reopen"), "Line reopened. It needs reviewing again.")}
              onEdit={(line) => setForm({ direction: line.direction, line })}
              onResolve={(line: Line, flag: Flag) => lineAction(line, () => resolveFlag(line._id, flag._id ?? ""), "Issue accepted.")}
            />
            <div className={s.spread}>
              <span className={`${s.muted} ${s.small}`}>
                Showing {lines.data.lines.length} of {lines.data.total}
              </span>
              {lines.data.total > PAGE_SIZE && (
                <div className={s.row}>
                  <button type="button" className={s.button} disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Previous
                  </button>
                  <span className={s.small}>
                    Page {lines.data.page} of {Math.ceil(lines.data.total / PAGE_SIZE)}
                  </span>
                  <button type="button" className={s.button} disabled={page * PAGE_SIZE >= lines.data.total} onClick={() => setPage(page + 1)}>
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {form && (
        <LineForm
          periodId={periodId}
          direction={form.direction}
          line={form.line}
          profile={profile.data ?? null}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            note.success("Line saved.");
            reloadAll();
          }}
        />
      )}

      {importing && (
        <ImportPanel
          periodId={periodId}
          onClose={() => setImporting(false)}
          onImported={(result) => {
            note.success(
              `Imported ${result.imported} line${result.imported === 1 ? "" : "s"}${result.skipped ? ` (${result.skipped} skipped)` : ""}. ` +
                `${result.verification.blockers} to fix, ${result.verification.warnings} to check.`
            );
            reloadAll();
          }}
        />
      )}

      {rejecting && (
        <ConfirmDialog
          title="Reject this line?"
          message="A rejected line is left out of the return. You can reopen it later."
          confirmLabel="Reject"
          busy={busyId === rejecting._id}
          onCancel={() => setRejecting(null)}
          onConfirm={() => {
            const line = rejecting;
            setRejecting(null);
            void lineAction(line, () => reviewLine(line._id, "reject"), "Line rejected.");
          }}
        />
      )}
    </div>
  );
}