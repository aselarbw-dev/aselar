// vat/models.js
// VAT preparation module: all Mongoose models in one file (split later, once stable).
//
// Conventions
// - Tenant = the existing User document (the business). Every record carries `business`.
//   Controllers should always scope queries with `business: req.user._id`.
// - Money is stored as whole thebe (P1.00 = 100). Convert only at the edges (UI / export).
// - Nothing here touches the existing User model. This file is purely additive.
// - Country/data-policy settings live on VatProfile so Botswana is a configuration,
//   not hard-coded logic. The mirror fields exist but default to "off" for the demo.

const { mongoose } = require("../../Shared/config");
const { Schema } = mongoose;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const thebe = (extra = {}) => ({
  type: Number,
  validate: {
    validator: Number.isInteger,
    message: "{PATH} must be a whole number of thebe",
  },
  ...extra,
});

// ---------------------------------------------------------------------------
// VatProfile: one per business. Settings that drive periods and calculations.
// ---------------------------------------------------------------------------
const vatProfileSchema = new Schema(
  {
    business: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    countryCode: { type: String, default: "BW", uppercase: true, trim: true },
    vatNumber: { type: String, trim: true }, // business VAT/TIN as registered with the tax authority
    category: { type: String, enum: ["A", "B", "C"], default: "A" }, // A/B = every 2 months, C = monthly
    ratePercent: { type: Number, default: 14 },
    pricesInclusive: { type: Boolean, default: false }, // are prices entered VAT-inclusive?
    deadlineDays: { type: Number, default: 28 }, // days after period end (confirmed: 28)
    b2cMode: { type: String, enum: ["daily", "itemised"], default: "daily" }, // to be confirmed
    roundingMode: { type: String, enum: ["per_line", "per_total"], default: "per_line" }, // to be confirmed
    lateClaimPolicy: { type: String, enum: ["warn", "block"], default: "warn" }, // to be confirmed
    openingCreditThebe: thebe({ default: 0, min: 0 }),
    firstPeriodStart: { type: Date },
    active: { type: Boolean, default: true },

    // Data-protection policy per business (off by default for the demo).
    dataPolicy: {
      mirrorRequired: { type: Boolean, default: false },
      storageRegion: { type: String, trim: true },
      retentionYears: { type: Number },
    },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------------------
// VatPeriod: one tax period per business, with a status workflow and audit trail.
// status: open -> in_review -> ready -> exported -> filed
// ---------------------------------------------------------------------------
const vatPeriodSchema = new Schema(
  {
    business: { type: Schema.Types.ObjectId, ref: "User", required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    dueDate: { type: Date, required: true }, // periodEnd + profile.deadlineDays
    status: {
      type: String,
      enum: ["open", "in_review", "ready", "exported", "filed"],
      default: "open",
    },
    version: { type: Number, default: 1 }, // bumps each time an exported period is reopened
    openingCreditThebe: thebe({ default: 0 }),

    // Cached results of the reconciliation (always recomputable from the lines).
    totals: {
      _id: false,
      outputBaseThebe: thebe({ default: 0 }),
      outputVatThebe: thebe({ default: 0 }),
      inputBaseThebe: thebe({ default: 0 }),
      inputVatThebe: thebe({ default: 0 }),
      netThebe: thebe({ default: 0 }), // output VAT - input VAT - opening credit; positive = pay
      closingCreditThebe: thebe({ default: 0 }),
      computedAt: { type: Date },
    },

    auditLog: [
      {
        _id: false,
        at: { type: Date, default: Date.now },
        by: { type: Schema.Types.ObjectId, ref: "User" },
        action: { type: String },
        from: { type: String },
        to: { type: String },
        note: { type: String },
      },
    ],
    filedAt: { type: Date },
  },
  { timestamps: true }
);
vatPeriodSchema.index({ business: 1, periodStart: 1 }, { unique: true });

// ---------------------------------------------------------------------------
// VatAttachment: the evidence file (supplier invoice photo/PDF, etc.).
// `storage` lets GridFS and S3/R2 coexist during the later migration.
// ---------------------------------------------------------------------------
const vatAttachmentSchema = new Schema(
  {
    business: { type: Schema.Types.ObjectId, ref: "User", required: true },
    storage: { type: String, enum: ["gridfs", "s3", "r2"], default: "gridfs" },
    storageKey: { type: String, required: true }, // GridFS file id or bucket object key
    originalName: { type: String },
    mimeType: { type: String },
    sizeBytes: { type: Number },
    sha256: { type: String, required: true }, // integrity check and duplicate-upload detection
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },

    // Local mirror in Botswana (switched on per business via VatProfile.dataPolicy).
    mirror: {
      _id: false,
      status: {
        type: String,
        enum: ["not_required", "pending", "ok", "failed"],
        default: "not_required",
      },
      lastVerifiedAt: { type: Date },
      sha256: { type: String },
    },
  },
  { timestamps: true }
);
vatAttachmentSchema.index({ business: 1, sha256: 1 }); // not unique: the service warns on re-upload

// ---------------------------------------------------------------------------
// VatLine: one sale (output) or purchase (input), from any source.
// Credit notes are stored with negative amounts.
// ---------------------------------------------------------------------------
const vatLineFlagSchema = new Schema({
  code: { type: String, required: true }, // e.g. VAT_MISMATCH, DUPLICATE, MISSING_TIN
  severity: { type: String, enum: ["blocker", "warning"], required: true },
  message: { type: String },
  resolved: { type: Boolean, default: false },
  resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  resolvedAt: { type: Date },
});

const vatLineSchema = new Schema(
  {
    business: { type: Schema.Types.ObjectId, ref: "User", required: true },
    period: { type: Schema.Types.ObjectId, ref: "VatPeriod", required: true }, // period it is CLAIMED in

    direction: { type: String, enum: ["output", "input"], required: true },
    source: { type: String, enum: ["ocr", "import", "manual", "aselar"], required: true },
    sourceRef: { type: Schema.Types.ObjectId }, // import batch id, or later an Aselar receipt id

    docType: { type: String, enum: ["invoice", "credit_note"], default: "invoice" },
    invoiceNumber: { type: String, trim: true },
    invoiceDate: { type: Date }, // may fall outside the period (late claim): flagged, not forced
    counterpartyName: { type: String, trim: true }, // customer (output) or supplier (input)
    counterpartyTin: { type: String, trim: true },
    description: { type: String, trim: true },

    // Inputs: local purchase, imported goods or imported services (reverse charge).
    supplyType: {
      type: String,
      enum: ["local", "imported_goods", "imported_services"],
      default: "local",
    },
    country: { type: String, trim: true },
    currency: { type: String, default: "BWP", uppercase: true, trim: true },
    fxRate: { type: Number, default: 1 }, // 1 unit of `currency` = fxRate BWP; editable on review
    originalAmountMinor: { type: Number }, // amount in the original currency, minor units

    amountExclThebe: thebe({ required: true }), // amount before VAT, in BWP thebe
    vatThebe: thebe({ required: true }),
    vatClass: { type: String, enum: ["standard", "zero", "exempt"], default: "standard" },
    claimable: { type: Boolean, default: true }, // inputs only: false for disallowed items

    reviewStatus: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending",
    },
    flags: [vatLineFlagSchema],

    attachment: { type: Schema.Types.ObjectId, ref: "VatAttachment" },
    extraction: {
      _id: false,
      engine: { type: String },
      confidence: { type: Schema.Types.Mixed }, // per-field confidence from OCR
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
vatLineSchema.index({ business: 1, period: 1, direction: 1 });
// Duplicate lookup (the verification service warns; no unique constraint on purpose).
vatLineSchema.index({ business: 1, direction: 1, counterpartyTin: 1, invoiceNumber: 1 });

// ---------------------------------------------------------------------------
// VatImportBatch: an Excel/CSV import (preview first, then commit).
// ---------------------------------------------------------------------------
const vatImportBatchSchema = new Schema(
  {
    business: { type: Schema.Types.ObjectId, ref: "User", required: true },
    period: { type: Schema.Types.ObjectId, ref: "VatPeriod" },
    direction: { type: String, enum: ["output", "input"], required: true },
    filename: { type: String },
    mapping: { type: Schema.Types.Mixed }, // column mapping chosen at preview
    rowCount: { type: Number, default: 0 },
    importedCount: { type: Number, default: 0 },
    status: { type: String, enum: ["previewed", "committed", "failed"], default: "previewed" },
    errors: [{ _id: false, row: Number, message: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------------------
// VatExport: a frozen snapshot of a period at export time, plus the generated files.
// A later change to the period creates a new version, never overwrites this record.
// ---------------------------------------------------------------------------
const vatExportSchema = new Schema(
  {
    business: { type: Schema.Types.ObjectId, ref: "User", required: true },
    period: { type: Schema.Types.ObjectId, ref: "VatPeriod", required: true },
    version: { type: Number, required: true },
    snapshot: {
      _id: false,
      lines: [{ type: Schema.Types.Mixed }], // frozen copy of the lines (SME volumes keep this small)
      totals: { type: Schema.Types.Mixed },
    },
    files: [
      {
        _id: false,
        format: { type: String, enum: ["xlsx", "pdf"] },
        storage: { type: String, enum: ["gridfs", "s3", "r2"], default: "gridfs" },
        storageKey: { type: String },
        sha256: { type: String },
        sizeBytes: { type: Number },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
vatExportSchema.index({ period: 1, version: 1 }, { unique: true });

// ---------------------------------------------------------------------------
// register (guarded so hot reloads / shared imports don't throw OverwriteModelError)
// ---------------------------------------------------------------------------
const reg = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

module.exports = {
  VatProfile: reg("VatProfile", vatProfileSchema),
  VatPeriod: reg("VatPeriod", vatPeriodSchema),
  VatLine: reg("VatLine", vatLineSchema),
  VatAttachment: reg("VatAttachment", vatAttachmentSchema),
  VatImportBatch: reg("VatImportBatch", vatImportBatchSchema),
  VatExport: reg("VatExport", vatExportSchema),
};