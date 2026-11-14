// src/Vat/ui.tsx
// Small shared pieces for the VAT screens: a modal, notices, badges, loading and error boxes, a
// confirm dialog, the data-loading hook, and the paths used for links.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type DependencyList, type ReactNode } from "react";
import s from "./Vat.module.css";

// ---------------------------------------------------------------------------
// errors and loading data
// ---------------------------------------------------------------------------

export const messageOf = (error: unknown): string => (error instanceof Error ? error.message : "Something went wrong.");

export interface Loaded<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Loads data when the screen opens (and again whenever `deps` change or reload() is called).
 * While reloading, the old data stays on screen, so tables do not flicker after an action.
 */
export function useLoad<T>(load: () => Promise<T>, deps: DependencyList): Loaded<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(messageOf(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}

// ---------------------------------------------------------------------------
// where the VAT screens live (so links work wherever the app mounts them)
// ---------------------------------------------------------------------------

const VatBasePathContext = createContext("/vat");
export const VatBasePathProvider = VatBasePathContext.Provider;

/** Links for the VAT screens, built from the path the module is mounted at. */
export function useVatPaths() {
  const base = useContext(VatBasePathContext).replace(/\/$/, "");
  return {
    periods: base || "/",
    settings: `${base}/settings`,
    period: (periodId: string) => `${base}/periods/${periodId}`,
  };
}

// ---------------------------------------------------------------------------
// building blocks
// ---------------------------------------------------------------------------

export function Loading({ text = "Loading…" }: { text?: string }) {
  return (
    <p className={s.muted} role="status">
      {text}
    </p>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className={`${s.notice} ${s.noticeError}`} role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className={s.linkButton} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Notice({ kind, children, onClose }: { kind: "success" | "error" | "info"; children: ReactNode; onClose?: () => void }) {
  const tone = kind === "success" ? s.noticeSuccess : kind === "error" ? s.noticeError : s.noticeInfo;
  return (
    <div className={`${s.notice} ${tone}`} role={kind === "error" ? "alert" : "status"}>
      <div>{children}</div>
      {onClose && (
        <button type="button" className={s.iconButton} aria-label="Dismiss" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  );
}

export type BadgeTone = "good" | "warn" | "bad" | "muted" | "info";

export function Badge({ tone, children, title }: { tone: BadgeTone; children: ReactNode; title?: string }) {
  const toneClass = { good: s.badgeGood, warn: s.badgeWarn, bad: s.badgeBad, muted: s.badgeMuted, info: s.badgeInfo }[tone];
  return (
    <span className={`${s.badge} ${toneClass}`} title={title}>
      {children}
    </span>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div className={s.overlay} onMouseDown={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={wide ? `${s.modal} ${s.modalWide}` : s.modal}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={s.modalHeader}>
          <h2>{title}</h2>
          <button type="button" className={s.iconButton} aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className={s.modalBody}>{children}</div>
      </div>
    </div>
  );
}

/** A yes/no question before something that cannot be taken back lightly. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className={s.stack}>
        <div>{message}</div>
        <div className={s.buttonRow}>
          <button type="button" className={s.button} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`${s.button} ${s.buttonPrimary}`} onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** A little state helper for a message shown at the top of a screen. */
export function useNotice() {
  const [notice, setNotice] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  return {
    notice,
    success: (text: string) => setNotice({ kind: "success", text }),
    error: (text: string) => setNotice({ kind: "error", text }),
    info: (text: string) => setNotice({ kind: "info", text }),
    clear: () => setNotice(null),
  };
}