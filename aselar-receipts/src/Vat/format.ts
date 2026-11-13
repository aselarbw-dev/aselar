// src/Vat/format.ts
// Small display helpers for the VAT screens: money, dates, labels. No React in here.

import type { Period, PeriodStatus, ReviewStatus, Severity, SupplyType } from "./types";

const HOUR_MS = 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ---------------------------------------------------------------------------
// money
// ---------------------------------------------------------------------------

/** Whole thebe to text: 123450 -> "P1,234.50", -1234 -> "-P12.34". Works on whole numbers, so no rounding surprises. */
export function pula(thebe: number | null | undefined): string {
  if (thebe === null || thebe === undefined || Number.isNaN(thebe)) return "";
  const sign = thebe < 0 ? "-" : "";
  const abs = Math.abs(Math.round(thebe));
  const whole = Math.floor(abs / 100);
  const cents = abs % 100;
  return `${sign}P${whole.toLocaleString("en-US")}.${String(cents).padStart(2, "0")}`;
}

/** Whole pula (the rounded return figures) to text: 221100 -> "P221,100", -39 -> "-P39". */
export function pulaWhole(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "";
  const sign = amount < 0 ? "-" : "";
  return `${sign}P${Math.abs(Math.round(amount)).toLocaleString("en-US")}`;
}

// ---------------------------------------------------------------------------
// dates
// ---------------------------------------------------------------------------

/**
 * An invoice date (the API sends midnight UTC of the calendar day) as dd/mm/yyyy.
 * Reads the date part of the text, so no time zone can shift it by a day.
 */
export function dateOnly(iso: string | null | undefined): string {
  if (!iso || iso.length < 10) return "";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** The local calendar day (YYYY-MM-DD) of a period's start. The start is local midnight, so +12h lands on that day. */
export const periodStartDay = (iso: string): string => new Date(new Date(iso).getTime() + 12 * HOUR_MS).toISOString().slice(0, 10);

/** The local calendar day (YYYY-MM-DD) of a period's end (its last millisecond), or of a due date. */
export const periodEndDay = (iso: string): string => new Date(new Date(iso).getTime() - 12 * HOUR_MS).toISOString().slice(0, 10);

const asDmy = (isoDay: string): string => dateOnly(isoDay);

/** "Oct – Nov 2026", "Oct 2026" (a monthly period), or "Dec 2026 – Jan 2027". */
export function periodLabel(period: Pick<Period, "periodStart" | "periodEnd">): string {
  const start = periodStartDay(period.periodStart);
  const end = periodEndDay(period.periodEnd);
  const startMonth = Number(start.slice(5, 7));
  const endMonth = Number(end.slice(5, 7));
  const startYear = start.slice(0, 4);
  const endYear = end.slice(0, 4);

  if (startYear === endYear && startMonth === endMonth) return `${MONTHS[endMonth - 1]} ${endYear}`;
  if (startYear === endYear) return `${MONTHS[startMonth - 1]} – ${MONTHS[endMonth - 1]} ${endYear}`;
  return `${MONTHS[startMonth - 1]} ${startYear} – ${MONTHS[endMonth - 1]} ${endYear}`;
}

/** "01/10/2026 to 30/11/2026" */
export const periodRange = (period: Pick<Period, "periodStart" | "periodEnd">): string =>
  `${asDmy(periodStartDay(period.periodStart))} to ${asDmy(periodEndDay(period.periodEnd))}`;

/** The due date as dd/mm/yyyy. */
export const dueDay = (period: Pick<Period, "dueDate">): string => asDmy(periodEndDay(period.dueDate));

// ---------------------------------------------------------------------------
// due dates
// ---------------------------------------------------------------------------

/** "Due in 56 days", "Due today", "Overdue by 4 days" or "Filed". */
export function dueText(period: Pick<Period, "status" | "isOverdue" | "daysToDue">): string {
  if (period.status === "filed") return "Filed";
  if (period.isOverdue) {
    const days = Math.max(1, Math.abs(period.daysToDue));
    return `Overdue by ${days} day${days === 1 ? "" : "s"}`;
  }
  if (period.daysToDue <= 0) return "Due today";
  return `Due in ${period.daysToDue} day${period.daysToDue === 1 ? "" : "s"}`;
}

export type DueTone = "done" | "late" | "soon" | "ok";

/** For colouring the due text: filed, overdue, due within a week, or comfortable. */
export function dueTone(period: Pick<Period, "status" | "isOverdue" | "daysToDue">): DueTone {
  if (period.status === "filed") return "done";
  if (period.isOverdue) return "late";
  if (period.daysToDue <= 7) return "soon";
  return "ok";
}

// ---------------------------------------------------------------------------
// labels
// ---------------------------------------------------------------------------

export const STATUS_LABEL: Record<PeriodStatus, string> = {
  open: "Open",
  in_review: "In review",
  ready: "Ready",
  exported: "Exported",
  filed: "Filed",
};

export const REVIEW_LABEL: Record<ReviewStatus, string> = {
  pending: "To review",
  confirmed: "Confirmed",
  rejected: "Rejected",
};

export const SUPPLY_LABEL: Record<SupplyType, string> = {
  local: "Local",
  imported_goods: "Imported goods",
  imported_services: "Imported services",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  blocker: "Must fix",
  warning: "Check",
};

const FLAG_TITLE: Record<string, string> = {
  MISSING_INVOICE_NUMBER: "No invoice number",
  MISSING_DATE: "No invoice date",
  MISSING_TIN: "No supplier TIN",
  VAT_MISMATCH: "VAT does not match",
  DUPLICATE_INVOICE: "Duplicate invoice",
  DATE_OUTSIDE_PERIOD: "Outside this period",
  FUTURE_DATE: "Date in the future",
  IMPORT_NO_COUNTRY: "No country of origin",
  IMPORT_VAT_ESTIMATED: "Import VAT is an estimate",
};

/** A short, readable title for a flag code. Unknown codes are shown as they are. */
export const flagTitle = (code: string): string => FLAG_TITLE[code] ?? code;

/** Lines can only be added or changed while the period is open or in review. */
export const canEditLines = (status: PeriodStatus): boolean => status === "open" || status === "in_review";