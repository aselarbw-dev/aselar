// src/Vat/types.ts
// The shapes of everything the VAT service sends and receives. They mirror the backend models.
// Money is always a whole number of thebe (P1.00 = 100) unless a field says "Pula".

export type PeriodStatus = "open" | "in_review" | "ready" | "exported" | "filed";
export type Direction = "output" | "input"; // output = a sale, input = a purchase
export type LineSource = "ocr" | "import" | "manual" | "aselar";
export type DocType = "invoice" | "credit_note";
export type SupplyType = "local" | "imported_goods" | "imported_services";
export type VatClass = "standard" | "zero" | "exempt";
export type ReviewStatus = "pending" | "confirmed" | "rejected";
export type Severity = "blocker" | "warning";
export type VatCategory = "A" | "B" | "C";

// ---------------------------------------------------------------------------
// settings
// ---------------------------------------------------------------------------

export interface VatProfile {
  _id: string;
  business: string;
  countryCode: string;
  vatNumber?: string;
  category: VatCategory;
  ratePercent: number;
  pricesInclusive: boolean;
  deadlineDays: number;
  b2cMode: "daily" | "itemised";
  roundingMode: "per_line" | "per_total";
  lateClaimPolicy: "warn" | "block";
  openingCreditThebe: number;
  firstPeriodStart?: string;
  active: boolean;
}

// The fields a person may change (the server ignores anything else).
export type VatProfileInput = Partial<
  Pick<
    VatProfile,
    | "countryCode"
    | "vatNumber"
    | "category"
    | "ratePercent"
    | "pricesInclusive"
    | "deadlineDays"
    | "b2cMode"
    | "roundingMode"
    | "lateClaimPolicy"
    | "openingCreditThebe"
    | "firstPeriodStart"
  >
>;

// ---------------------------------------------------------------------------
// periods
// ---------------------------------------------------------------------------

export interface PeriodTotals {
  outputBaseThebe: number;
  outputVatThebe: number;
  inputBaseThebe: number;
  inputVatThebe: number;
  netThebe: number; // positive = payable, negative = credit
  closingCreditThebe: number;
  computedAt?: string;
}

export interface AuditEntry {
  at: string;
  by?: string;
  action?: string;
  from?: string;
  to?: string;
  note?: string;
}

export interface Period {
  _id: string;
  business: string;
  periodStart: string; // an instant: local midnight of the first day (see format.ts)
  periodEnd: string; // an instant: the last millisecond of the last day
  dueDate: string;
  status: PeriodStatus;
  version: number;
  openingCreditThebe: number;
  totals?: PeriodTotals;
  auditLog?: AuditEntry[];
  filedAt?: string;
  daysToDue: number;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LineCounts {
  pending: number;
  confirmed: number;
  rejected: number;
}

export interface Readiness {
  pendingLines: number;
  blockerLines: number;
  canMarkReady: boolean;
}

export interface PeriodSummary {
  period: Period;
  lines: { output: LineCounts; input: LineCounts };
  readiness: Readiness & { editable: boolean };
}

// ---------------------------------------------------------------------------
// lines
// ---------------------------------------------------------------------------

export interface Flag {
  _id?: string;
  code: string;
  severity: Severity;
  message: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface Line {
  _id: string;
  business: string;
  period: string;
  direction: Direction;
  source: LineSource;
  sourceRef?: string;
  docType: DocType;
  invoiceNumber?: string;
  invoiceDate?: string; // midnight UTC of the invoice's calendar day
  counterpartyName?: string;
  counterpartyTin?: string;
  description?: string;
  supplyType: SupplyType;
  country?: string;
  currency: string;
  fxRate: number;
  originalAmountMinor?: number;
  amountExclThebe: number;
  vatThebe: number;
  vatClass: VatClass;
  claimable: boolean;
  reviewStatus: ReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  flags: Flag[];
  attachment?: string;
  createdAt: string;
  updatedAt: string;
}

// What a form sends when adding or editing a line. Amounts are in PULA (not thebe), as numbers
// or text such as "276.32". Credit notes are entered as positive amounts with docType "credit_note".
export interface LineInput {
  direction: Direction;
  amount: number | string;
  docType?: DocType;
  amountIncludesVat?: boolean;
  vatAmount?: number | string; // the VAT printed on the supplier's tax invoice, if any
  currency?: string; // default BWP
  fxRate?: number | string; // pula for 1 unit of `currency`, required when it is not BWP
  vatClass?: VatClass;
  supplyType?: SupplyType; // purchases only
  invoiceNumber?: string;
  invoiceDate?: string; // YYYY-MM-DD
  counterpartyName?: string;
  counterpartyTin?: string;
  description?: string;
  country?: string;
  claimable?: boolean; // purchases only
}

export interface LineListFilter {
  direction?: Direction;
  reviewStatus?: ReviewStatus;
  page?: number;
  limit?: number;
}

export interface LineList {
  lines: Line[];
  total: number;
  page: number;
  limit: number;
}

export type ReviewAction = "confirm" | "reject" | "reopen";

export interface VerifyIssue {
  lineId: string;
  direction: Direction;
  invoiceNumber?: string;
  counterpartyName?: string;
  flags: Flag[];
}

export interface VerifyResult {
  checked: number;
  updated: number;
  blockers: number; // unresolved
  warnings: number; // unresolved
  byCode: Record<string, number>;
  issues: VerifyIssue[];
  truncated: boolean;
  readiness: Readiness;
}

// ---------------------------------------------------------------------------
// reconciliation
// ---------------------------------------------------------------------------

export interface Bucket {
  base: number;
  vat: number;
  count: number;
}

export interface Reconciliation {
  period: Period;
  lines: number;
  pendingLines: number; // lines still to review: the figures are provisional while this is above 0
  breakdown: {
    output: { standard: Bucket; zeroRated: Bucket; exempt: Bucket };
    reverseCharge: Bucket;
    input: { local: Bucket; importedGoods: Bucket; importedServices: Bucket; notClaimed: Bucket };
  };
  // exact figures, in thebe
  exact: {
    outputBase: number;
    outputVat: number;
    inputBase: number;
    inputVat: number;
    openingCredit: number;
    netBeforeCredit: number;
    net: number; // positive = payable, negative = credit
    payable: number;
    closingCredit: number;
  };
  // the figures for the return, in WHOLE PULA (rounded to the nearest pula)
  rounded: {
    outputVat: number;
    inputVat: number;
    openingCredit: number;
    net: number;
    payable: number;
    credit: number;
    detail: {
      outputStandardVat: number;
      reverseChargeVat: number;
      localInputVat: number;
      importedGoodsVat: number;
      importedServicesVat: number;
    };
  };
  refund: { consecutiveCreditPeriods: number; maybeClaimable: boolean };
}

// ---------------------------------------------------------------------------
// import
// ---------------------------------------------------------------------------

export interface ImportOptions {
  direction?: Direction; // needed for a CSV or a sheet that is not a BURS schedule
  importedSupplyType?: "imported_goods" | "imported_services";
  zeroVatAs?: "zero" | "exempt" | "standard";
  fixSwappedDates?: boolean;
  skipInvalid?: boolean;
  force?: boolean;
}

export interface ImportRowError {
  sheet: string;
  row: number;
  errors: { field: string; message: string }[];
}

export interface ImportSection {
  sheet: string;
  kind: string;
  label: string | null;
  rows: number;
  rowsAddUpToAmount: number;
  rowsAddUpToVat: number;
  fileTotalAmount: number | null;
  fileTotalVat: number | null;
  amountMatches: boolean | null;
  vatMatches: boolean | null;
}

export interface ImportSampleRow {
  sheet: string;
  row: number;
  direction: Direction;
  invoiceNumber?: string;
  invoiceDate?: string;
  counterpartyName?: string;
  counterpartyTin?: string;
  supplyType: SupplyType;
  vatClass: VatClass;
  amountExclThebe: number;
  vatThebe: number;
  flags: string[];
}

export interface ImportPreview {
  dryRun: true;
  fileHash: string;
  format: "schedule" | "table";
  summary: {
    rowsRead: number;
    willImport: number;
    withErrors: number;
    byDirection: Partial<Record<Direction, number>>;
    blockers: number;
    warnings: number;
    byCode: Record<string, number>;
  };
  sections: ImportSection[];
  notes: string[];
  guessedDates: { sheet: string; row: number; from: string; to: string }[];
  errors: ImportRowError[];
  errorsTruncated: boolean;
  sample: ImportSampleRow[];
  next: string;
}

export interface ImportResult {
  dryRun: false;
  imported: number;
  skipped: number;
  batches: { _id: string; direction: Direction; importedCount: number }[];
  verification: {
    blockers: number;
    warnings: number;
    byCode: Record<string, number>;
    readiness: Readiness;
  };
}

// ---------------------------------------------------------------------------
// export
// ---------------------------------------------------------------------------

export interface ExportSummary {
  _id: string;
  version: number;
  createdAt: string;
  createdBy?: string;
}

export interface ExportCreated {
  export: ExportSummary;
  figures: { exact: Reconciliation["exact"]; rounded: Reconciliation["rounded"] };
}