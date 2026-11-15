// src/Vat/ImportPanel.tsx
// Importing sales and purchases from an Excel or CSV file, in two steps: PREVIEW (nothing is saved)
// and IMPORT. Works with BURS schedules (Input and Output sheets) and with simple tables.

import { useState } from "react";
import s from "./Vat.module.css";
import type { Direction, ImportOptions, ImportPreview, ImportResult } from "./types";
import { commitImport, previewImport } from "./vatApi";
import { dateOnly, flagTitle, pula } from "./format";
import { Badge, Modal, messageOf } from "./Ui";

interface Props {
  periodId: string;
  onClose: () => void;
  onImported: (result: ImportResult) => void;
}

type Busy = "preview" | "commit" | null;

export default function ImportPanel({ periodId, onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [direction, setDirection] = useState<"" | Direction>("");
  const [importedSupplyType, setImportedSupplyType] = useState<"imported_goods" | "imported_services">("imported_goods");
  const [zeroVatAs, setZeroVatAs] = useState<"zero" | "exempt" | "standard">("zero");
  const [fixSwappedDates, setFixSwappedDates] = useState(true);
  const [skipInvalid, setSkipInvalid] = useState(false);

  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const options = (): ImportOptions => ({
    direction: direction || undefined,
    importedSupplyType,
    zeroVatAs,
    fixSwappedDates,
    skipInvalid,
  });

  // Anything that changes how the file is read makes the old preview out of date.
  const changing = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPreview(null);
    setError(null);
  };

  async function runPreview() {
    if (!file) return;
    setBusy("preview");
    setError(null);
    try {
      setPreview(await previewImport(periodId, file, options()));
    } catch (err) {
      setPreview(null);
      setError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }

  async function runCommit(force = false) {
    if (!file || !preview) return;
    setBusy("commit");
    setError(null);
    try {
      const result = await commitImport(periodId, file, preview.fileHash, { ...options(), force });
      onImported(result);
      onClose();
    } catch (err) {
      setError(messageOf(err));
      setBusy(null);
    }
  }

  const alreadyImported = error !== null && /already imported/i.test(error);
  const willImport = preview?.summary.willImport ?? 0;

  return (
    <Modal title="Import from a file" onClose={onClose} wide>
      <div className={s.stack}>
        <p className={s.muted} style={{ margin: 0 }}>
          Choose an Excel (.xlsx) or CSV file. A BURS schedule with Input and Output sheets is recognised automatically. You will see a preview before anything is saved.
        </p>

        <div className={s.formGrid}>
          <div className={s.field}>
            <label htmlFor="imp-file">File</label>
            <input
              id="imp-file"
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPreview(null);
                setError(null);
              }}
            />
          </div>

          <div className={s.field}>
            <label htmlFor="imp-direction">This file contains</label>
            <select id="imp-direction" value={direction} onChange={(e) => changing(setDirection)(e.target.value as "" | Direction)}>
              <option value="">A BURS schedule (detect automatically)</option>
              <option value="input">Purchases only</option>
              <option value="output">Sales only</option>
            </select>
            <div className={s.hint}>Choose purchases or sales for a plain table that is not a BURS schedule.</div>
          </div>

          <div className={s.field}>
            <label htmlFor="imp-imported">Imported purchases are</label>
            <select id="imp-imported" value={importedSupplyType} onChange={(e) => changing(setImportedSupplyType)(e.target.value as "imported_goods" | "imported_services")}>
              <option value="imported_goods">Goods (VAT paid at the border)</option>
              <option value="imported_services">Services (reverse charge)</option>
            </select>
          </div>

          <div className={s.field}>
            <label htmlFor="imp-zero">Lines with 0 VAT are</label>
            <select id="imp-zero" value={zeroVatAs} onChange={(e) => changing(setZeroVatAs)(e.target.value as "zero" | "exempt" | "standard")}>
              <option value="zero">Zero-rated</option>
              <option value="exempt">Exempt</option>
              <option value="standard">Standard-rated (they will be flagged)</option>
            </select>
          </div>

          <div className={`${s.field} ${s.fieldWide}`}>
            <label className={s.checkbox}>
              <input type="checkbox" checked={fixSwappedDates} onChange={(e) => changing(setFixSwappedDates)(e.target.checked)} />
              <span>Correct dates that look like day and month were swapped by Excel (only when the corrected date falls inside this period)</span>
            </label>
          </div>
        </div>

        <div className={s.buttonRow}>
          <button type="button" className={`${s.button} ${s.buttonPrimary}`} onClick={runPreview} disabled={!file || busy !== null}>
            {busy === "preview" ? "Reading the file…" : "Preview"}
          </button>
        </div>

        {error && (
          <div className={`${s.notice} ${s.noticeError}`} role="alert">
            <span>{error}</span>
            {alreadyImported && (
              <button type="button" className={s.linkButton} onClick={() => runCommit(true)}>
                Import again anyway
              </button>
            )}
          </div>
        )}

        {preview && (
          <div className={s.stack}>
            <div className={s.cards}>
              <Stat label="Rows read" value={preview.summary.rowsRead} />
              <Stat label="Will be imported" value={preview.summary.willImport} />
              <Stat label="Rows with errors" value={preview.summary.withErrors} bad={preview.summary.withErrors > 0} />
              <Stat label="Must fix after import" value={preview.summary.blockers} bad={preview.summary.blockers > 0} />
              <Stat label="To check after import" value={preview.summary.warnings} />
            </div>

            {preview.sections.length > 0 && (
              <div>
                <h3>Do the rows add up to the file's own totals?</h3>
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>Sheet</th>
                        <th>Section</th>
                        <th className={s.right}>Rows</th>
                        <th className={s.right}>Rows add up to</th>
                        <th className={s.right}>File says</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.sections.map((section, index) => (
                        <tr key={`${section.sheet}-${section.kind}-${index}`}>
                          <td>{section.sheet}</td>
                          <td>{section.kind === "local" ? "Local purchases" : section.kind === "imported" ? "Imported purchases" : section.kind === "sale" ? "Sales" : "Table"}</td>
                          <td className={s.num}>{section.rows}</td>
                          <td className={s.num}>{pula(section.rowsAddUpToAmount)}</td>
                          <td className={s.num}>{section.fileTotalAmount === null ? "–" : pula(section.fileTotalAmount)}</td>
                          <td>
                            {section.amountMatches === null ? (
                              <Badge tone="muted">No total in file</Badge>
                            ) : section.amountMatches ? (
                              <Badge tone="good">Matches</Badge>
                            ) : (
                              <Badge tone="bad">Differs</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {preview.notes.length > 0 && (
              <div className={`${s.notice} ${s.noticeInfo}`} style={{ flexDirection: "column", margin: 0 }}>
                {preview.notes.map((note) => (
                  <div key={note}>{note}</div>
                ))}
              </div>
            )}

            {preview.guessedDates.length > 0 && (
              <details>
                <summary>{preview.guessedDates.length} date(s) corrected for a day/month swap</summary>
                <ul>
                  {preview.guessedDates.map((d) => (
                    <li key={`${d.sheet}-${d.row}`}>
                      {d.sheet}, row {d.row}: {dateOnly(d.from)} became {dateOnly(d.to)}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {preview.errors.length > 0 && (
              <div>
                <h3>Rows with errors</h3>
                <ul>
                  {preview.errors.slice(0, 20).map((rowError) => (
                    <li key={`${rowError.sheet}-${rowError.row}`}>
                      {rowError.sheet}, row {rowError.row}: {rowError.errors.map((e) => e.message).join("; ")}
                    </li>
                  ))}
                </ul>
                {preview.errors.length > 20 && <p className={s.muted}>…and {preview.errors.length - 20} more.</p>}
                <label className={s.checkbox}>
                  <input type="checkbox" checked={skipInvalid} onChange={(e) => setSkipInvalid(e.target.checked)} />
                  <span>Import only the valid rows and skip these {preview.summary.withErrors}</span>
                </label>
              </div>
            )}

            {preview.sample.length > 0 && (
              <div>
                <h3>First {preview.sample.length} lines</h3>
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
                        <th>Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.sample.map((row) => (
                        <tr key={`${row.sheet}-${row.row}`}>
                          <td>{row.direction === "output" ? "Sale" : "Purchase"}</td>
                          <td className={s.num}>{dateOnly(row.invoiceDate) || "–"}</td>
                          <td className={s.cell}>{row.invoiceNumber || "–"}</td>
                          <td className={s.cell}>{row.counterpartyName || "–"}</td>
                          <td className={s.num}>{pula(row.amountExclThebe)}</td>
                          <td className={s.num}>{pula(row.vatThebe)}</td>
                          <td>{row.flags.length === 0 ? "–" : row.flags.map(flagTitle).join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className={s.buttonRow}>
              <button type="button" className={s.button} onClick={onClose} disabled={busy !== null}>
                Cancel
              </button>
              <button
                type="button"
                className={`${s.button} ${s.buttonPrimary}`}
                onClick={() => runCommit(false)}
                disabled={busy !== null || willImport === 0 || (preview.summary.withErrors > 0 && !skipInvalid)}
              >
                {busy === "commit" ? "Importing…" : `Import ${willImport} line${willImport === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Stat({ label, value, bad }: { label: string; value: number; bad?: boolean }) {
  return (
    <div className={s.stat}>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statValue} style={bad ? { color: "var(--vat-bad)" } : undefined}>
        {value}
      </div>
    </div>
  );
}