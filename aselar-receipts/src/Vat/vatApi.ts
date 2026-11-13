// src/Vat/vatApi.ts
// Every call to the VAT service goes through this file, so the screens never build a URL or read a
// response by hand.
//
// Set in the frontend's .env (Vite only exposes variables that start with VITE_):
//   VITE_VAT_API_URL=http://localhost:5015
// For production, use the address of the VAT service on Render.
//
// Authentication: requests carry the login cookie (credentials: "include"). If your app keeps the
// token somewhere else and sends it as a Bearer header, call setVatTokenProvider once at start-up:
//   setVatTokenProvider(() => localStorage.getItem("token"));

import type {
  ExportCreated,
  ExportSummary,
  ImportOptions,
  ImportPreview,
  ImportResult,
  Line,
  LineInput,
  LineList,
  LineListFilter,
  Period,
  PeriodSummary,
  Reconciliation,
  ReviewAction,
  VatProfile,
  VatProfileInput,
  VerifyResult,
} from "./types";

const BASE_URL = (import.meta.env.VITE_VAT_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:5015";
const API = `${BASE_URL}/api/vat`;

let tokenProvider: (() => string | null | undefined) | null = null;

/** Use this if the app sends the token as a Bearer header instead of a cookie. */
export function setVatTokenProvider(provider: () => string | null | undefined): void {
  tokenProvider = provider;
}

/** An error reply from the VAT service. `message` is safe to show to the person using the app. */
export class VatApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "VatApiError";
    this.status = status;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// the one place that talks to the network
// ---------------------------------------------------------------------------

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = tokenProvider?.();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API}${path}`, { ...init, headers, credentials: "include" });
  } catch {
    throw new VatApiError("Could not reach the VAT service. Check your connection and try again.", 0);
  }

  if (!response.ok) {
    let body: { message?: string; details?: unknown } | null = null;
    try {
      body = await response.json();
    } catch {
      // not JSON: fall through to the generic message
    }
    if (response.status === 401) {
      throw new VatApiError(body?.message ?? "Please log in again.", 401, body?.details);
    }
    throw new VatApiError(body?.message ?? `The request failed (${response.status}).`, response.status, body?.details);
  }
  return response;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await send(path, init);
  return (await response.json()) as T;
}

const jsonBody = (method: "POST" | "PUT", body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// Builds "?a=1&b=2" from an object, leaving out anything undefined.
function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

// ---------------------------------------------------------------------------
// settings
// ---------------------------------------------------------------------------

/** The business's VAT settings, or null if they have not been set up yet. */
export const getProfile = async (): Promise<VatProfile | null> => (await request<{ profile: VatProfile | null }>("/profile")).profile;

export const saveProfile = async (input: VatProfileInput): Promise<VatProfile> =>
  (await request<{ profile: VatProfile }>("/profile", jsonBody("PUT", input))).profile;

// ---------------------------------------------------------------------------
// periods
// ---------------------------------------------------------------------------

/** All periods, newest first. Creates any that are missing up to the current one. */
export const listPeriods = async (): Promise<Period[]> => (await request<{ periods: Period[] }>("/periods")).periods;

export const getPeriod = (periodId: string): Promise<PeriodSummary> => request<PeriodSummary>(`/periods/${periodId}`);

/** Moves a period to in_review, ready or filed. Reopening an exported or filed period needs a note. */
export const changePeriodStatus = async (
  periodId: string,
  to: "in_review" | "ready" | "filed",
  note?: string
): Promise<Period> => (await request<{ period: Period }>(`/periods/${periodId}/transition`, jsonBody("POST", { to, note }))).period;

export const getReconciliation = (periodId: string): Promise<Reconciliation> =>
  request<Reconciliation>(`/periods/${periodId}/reconciliation`);

/** Re-checks every line in the period and returns the blockers and warnings found. */
export const verifyPeriod = (periodId: string): Promise<VerifyResult> =>
  request<VerifyResult>(`/periods/${periodId}/verify`, { method: "POST" });

// ---------------------------------------------------------------------------
// lines
// ---------------------------------------------------------------------------

export const listLines = (periodId: string, filter: LineListFilter = {}): Promise<LineList> =>
  request<LineList>(`/periods/${periodId}/lines${query({ ...filter })}`);

export const createLine = async (periodId: string, input: LineInput): Promise<Line> =>
  (await request<{ line: Line }>(`/periods/${periodId}/lines`, jsonBody("POST", input))).line;

/** Replaces the line's details. Anything optional that is left out is cleared. The line goes back to pending. */
export const updateLine = async (lineId: string, input: LineInput): Promise<Line> =>
  (await request<{ line: Line }>(`/lines/${lineId}`, jsonBody("PUT", input))).line;

export const reviewLine = async (lineId: string, action: ReviewAction): Promise<Line> =>
  (await request<{ line: Line }>(`/lines/${lineId}/review`, jsonBody("POST", { action }))).line;

/** Deliberately accepts one flag, for example a duplicate invoice number that is genuinely a different invoice. */
export const resolveFlag = async (lineId: string, flagId: string): Promise<Line> =>
  (await request<{ line: Line }>(`/lines/${lineId}/flags/${flagId}/resolve`, { method: "POST" })).line;

// ---------------------------------------------------------------------------
// import from Excel or CSV
// ---------------------------------------------------------------------------

function importUrl(periodId: string, file: File, options: ImportOptions, extra: Record<string, string | boolean>): string {
  return `/periods/${periodId}/import${query({
    direction: options.direction,
    importedSupplyType: options.importedSupplyType,
    zeroVatAs: options.zeroVatAs,
    fixSwappedDates: options.fixSwappedDates,
    skipInvalid: options.skipInvalid,
    force: options.force,
    filename: file.name,
    ...extra,
  })}`;
}

const fileBody = (file: File): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/octet-stream" },
  body: file,
});

/** Reads the file and reports what would be imported. Nothing is saved. */
export const previewImport = (periodId: string, file: File, options: ImportOptions = {}): Promise<ImportPreview> =>
  request<ImportPreview>(importUrl(periodId, file, options, { dryRun: true }), fileBody(file));

/** Imports the file that was previewed. `fileHash` is the one the preview returned. */
export const commitImport = (periodId: string, file: File, fileHash: string, options: ImportOptions = {}): Promise<ImportResult> =>
  request<ImportResult>(importUrl(periodId, file, options, { dryRun: false, fileHash }), fileBody(file));

// ---------------------------------------------------------------------------
// export and downloads
// ---------------------------------------------------------------------------

/** Freezes a "ready" period. It becomes "exported". */
export const createExport = (periodId: string): Promise<ExportCreated> =>
  request<ExportCreated>(`/periods/${periodId}/export`, { method: "POST" });

export const listExports = async (periodId: string): Promise<ExportSummary[]> =>
  (await request<{ exports: ExportSummary[] }>(`/periods/${periodId}/exports`)).exports;

async function download(path: string, fallbackName: string): Promise<{ blob: Blob; filename: string }> {
  const response = await send(path);
  // The browser can only read this header if the service exposes it (see the CORS note in index.js).
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return { blob: await response.blob(), filename: match?.[1] ?? fallbackName };
}

/** The file to upload to BURS (Input and Output sheets). */
export const downloadSchedule = (exportId: string) => download(`/exports/${exportId}/schedule`, "INVOICE_SCHEDULE.xlsx");

/** The reconciliation report, for the business to review (not for upload). */
export const downloadReport = (exportId: string) => download(`/exports/${exportId}/report`, "RECONCILIATION.xlsx");

/** Hands a downloaded file to the browser's save dialog. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}