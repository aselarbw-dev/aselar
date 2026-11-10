// Taxation/services/importService.js
// Importing lines from an uploaded Excel or CSV file into a period, in two steps:
//
//   1. PREVIEW (dryRun, the default): read the file, build every line, run the verification
//      rules, and report what WOULD happen. Nothing is saved.
//   2. COMMIT (dryRun=false): the same file is sent again together with the fileHash the preview
//      returned. If the file is not the one previewed, or was already imported, it is refused.
//
// Safety rules:
//   - all or nothing: if any row has errors, nothing is imported (unless skipInvalid=true)
//   - the whole import is undone if saving fails half way
//   - lines are saved as "pending" with their flags, exactly like lines added by hand, so they go
//     through the same review

const crypto = require("crypto");
const { VatProfile, VatPeriod, VatLine, VatImportBatch } = require("../models/vatModels");
const { ServiceError, isEditable } = require("./periodService");
const { buildLine } = require("./lineBuilder");
const { flagsForNewLines, verifyPeriod } = require("./verificationService");
const { ImportFileError, parseImportFile, toInputs } = require("./importParser");

const HOUR_MS = 60 * 60 * 1000;
const MAX_ROW_ERRORS = 50; // how many bad rows one reply lists
const SAMPLE_SIZE = 15; // how many good rows the preview shows

// Period boundaries are local midnights; +12h / -12h lands on the right local calendar day.
const localDayOfStart = (d) => new Date(new Date(d).getTime() + 12 * HOUR_MS).toISOString().slice(0, 10);
const localDayOfEnd = (d) => new Date(new Date(d).getTime() - 12 * HOUR_MS).toISOString().slice(0, 10);

const isTrue = (v) => v === true || v === "true" || v === "1" || v === "yes";
const isFalse = (v) => v === false || v === "false" || v === "0" || v === "no";

// Reads the options from the query string, with safe defaults.
function readOptions(query = {}) {
  const importedSupplyType = query.importedSupplyType || "imported_goods";
  if (!["imported_goods", "imported_services"].includes(importedSupplyType)) {
    throw new ServiceError('importedSupplyType must be "imported_goods" or "imported_services"', 400);
  }
  const zeroVatAs = query.zeroVatAs || "zero";
  if (!["zero", "exempt", "standard"].includes(zeroVatAs)) {
    throw new ServiceError('zeroVatAs must be "zero", "exempt" or "standard"', 400);
  }
  if (query.direction !== undefined && !["input", "output"].includes(query.direction)) {
    throw new ServiceError('direction must be "input" (purchases) or "output" (sales)', 400);
  }
  return {
    direction: query.direction,
    importedSupplyType,
    zeroVatAs,
    fixSwappedDates: !isFalse(query.fixSwappedDates), // on unless switched off
    dryRun: !isFalse(query.dryRun), // a preview unless dryRun=false is given
    skipInvalid: isTrue(query.skipInvalid),
    force: isTrue(query.force),
    fileHash: typeof query.fileHash === "string" ? query.fileHash : undefined,
    filename: typeof query.filename === "string" ? query.filename.slice(0, 200) : "upload",
  };
}

const countBy = (items, keyFn) => {
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    out[key] = (out[key] || 0) + 1;
  }
  return out;
};

async function importLines({ business, periodId, buffer, query, userId }) {
  const options = readOptions(query);

  const period = await VatPeriod.findOne({ _id: periodId, business });
  if (!period) throw new ServiceError("Period not found", 404);
  if (!isEditable(period.status)) {
    throw new ServiceError(
      `This period is "${period.status}", so lines cannot be imported. Move it back to in_review first.`,
      409
    );
  }
  const profile = await VatProfile.findOne({ business });
  if (!profile) throw new ServiceError("Set up your VAT profile first", 409);

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ServiceError("No file was received. Send the file as the request body.", 400);
  }
  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

  // ---- read the file ----------------------------------------------------------------------
  let parsed;
  try {
    parsed = await parseImportFile(buffer, { direction: options.direction });
  } catch (err) {
    if (err instanceof ImportFileError) throw new ServiceError(err.message, 400, err.details);
    throw err;
  }

  const window = { start: localDayOfStart(period.periodStart), end: localDayOfEnd(period.periodEnd) };
  const items = toInputs(parsed, { ...options, window });

  // ---- build every line ----------------------------------------------------------------------
  const good = []; // { item, line }
  const bad = []; // { sheet, row, errors }
  for (const item of items) {
    const errors = [...item.errors];
    let line = null;
    if (errors.length === 0) {
      const built = buildLine(item.input, { profile });
      if (built.ok) line = built.line;
      else errors.push(...built.errors);
    }
    if (line) good.push({ item, line });
    else bad.push({ sheet: item.sheet, row: item.row, errors });
  }

  // ---- verify them (including duplicates against what is already saved) ------------------------
  const flagLists = await flagsForNewLines({ business, lines: good.map((g) => g.line), profile, period });
  good.forEach((g, i) => {
    g.flags = flagLists[i];
  });

  const allFlags = good.flatMap((g) => g.flags);
  const noteCount = (code) => items.filter((it) => it.notes.some((n) => n.code === code)).length;

  const notes = [...(parsed.warnings || []), ...parsed.sheets.flatMap((s) => s.notes || [])];
  const imported = noteCount("IMPORTED");
  if (imported > 0) {
    notes.push(
      `${imported} imported purchase(s) were read as ${options.importedSupplyType === "imported_goods" ? "imported GOODS" : "imported SERVICES"}. ` +
        "Services carry a reverse charge, goods do not: use importedSupplyType=imported_services if these are services."
    );
  }
  const zeroVat = noteCount("ZERO_VAT");
  if (zeroVat > 0) notes.push(`${zeroVat} line(s) with 0 tax were read as ${options.zeroVatAs}-rated (zeroVatAs).`);
  const calculated = noteCount("VAT_CALCULATED");
  if (calculated > 0) notes.push(`${calculated} line(s) had no tax amount, so VAT was calculated at ${profile.ratePercent}%.`);

  const guessedDates = items.flatMap((it) =>
    it.notes.filter((n) => n.code === "DATE_SWAPPED_GUESS").map((n) => ({ sheet: it.sheet, row: it.row, from: n.from, to: n.to }))
  );
  if (guessedDates.length > 0) {
    notes.push(
      `${guessedDates.length} date(s) looked like day and month swapped by Excel and were corrected because the corrected date falls inside this period. Check them below, or pass fixSwappedDates=false to keep the dates as written.`
    );
  }

  const sections = parsed.sheets.flatMap((s) =>
    s.sections.map((sec) => ({
      sheet: s.sheetName,
      kind: sec.kind,
      label: sec.label,
      rows: sec.rowCount,
      rowsAddUpToAmount: sec.sumAmountThebe,
      rowsAddUpToVat: sec.sumVatThebe,
      fileTotalAmount: sec.fileAmountThebe,
      fileTotalVat: sec.fileVatThebe,
      amountMatches: sec.amountMatches,
      vatMatches: sec.vatMatches,
    }))
  );

  const summary = {
    rowsRead: items.length,
    willImport: good.length,
    withErrors: bad.length,
    byDirection: countBy(good, (g) => g.line.direction),
    blockers: allFlags.filter((f) => f.severity === "blocker").length,
    warnings: allFlags.filter((f) => f.severity === "warning").length,
    byCode: countBy(allFlags, (f) => f.code),
  };

  // ---- a preview stops here ---------------------------------------------------------------------
  if (options.dryRun) {
    return {
      dryRun: true,
      fileHash,
      format: parsed.format,
      summary,
      sections,
      notes,
      guessedDates: guessedDates.slice(0, MAX_ROW_ERRORS),
      errors: bad.slice(0, MAX_ROW_ERRORS),
      errorsTruncated: bad.length > MAX_ROW_ERRORS,
      sample: good.slice(0, SAMPLE_SIZE).map((g) => ({
        sheet: g.item.sheet,
        row: g.item.row,
        direction: g.line.direction,
        invoiceNumber: g.line.invoiceNumber,
        invoiceDate: g.line.invoiceDate && g.line.invoiceDate.toISOString().slice(0, 10),
        counterpartyName: g.line.counterpartyName,
        counterpartyTin: g.line.counterpartyTin,
        supplyType: g.line.supplyType,
        vatClass: g.line.vatClass,
        amountExclThebe: g.line.amountExclThebe,
        vatThebe: g.line.vatThebe,
        flags: g.flags.map((f) => f.code),
      })),
      next: "Send the same file again with dryRun=false and fileHash=<the fileHash above> to import it.",
    };
  }

  // ---- a commit: the safety checks ------------------------------------------------------------------
  if (!options.fileHash) {
    throw new ServiceError("Preview first: pass the fileHash that the preview returned.", 400);
  }
  if (options.fileHash !== fileHash) {
    throw new ServiceError("This is not the file that was previewed. Preview it again.", 409);
  }
  if (good.length === 0) {
    throw new ServiceError("There are no valid rows to import.", 409, { errors: bad.slice(0, MAX_ROW_ERRORS) });
  }
  if (bad.length > 0 && !options.skipInvalid) {
    throw new ServiceError(
      `${bad.length} row(s) have errors, so nothing was imported. Fix the file, or pass skipInvalid=true to import only the valid rows.`,
      409,
      { errors: bad.slice(0, MAX_ROW_ERRORS) }
    );
  }
  if (!options.force) {
    const earlier = await VatImportBatch.findOne({
      business,
      period: period._id,
      status: "committed",
      "mapping.fileHash": fileHash,
    }).lean();
    if (earlier) {
      throw new ServiceError(
        "This exact file was already imported into this period. Pass force=true to import it again.",
        409
      );
    }
  }

  // ---- save, undoing everything if anything fails -------------------------------------------------
  const batchIds = [];
  try {
    const batches = {};
    for (const direction of ["output", "input"]) {
      const rows = good.filter((g) => g.line.direction === direction);
      if (rows.length === 0) continue;
      const batch = await VatImportBatch.create({
        business,
        period: period._id,
        direction,
        filename: options.filename,
        mapping: {
          format: parsed.format,
          fileHash,
          importedSupplyType: options.importedSupplyType,
          zeroVatAs: options.zeroVatAs,
          fixSwappedDates: options.fixSwappedDates,
        },
        rowCount: items.filter((it) => it.input.direction === direction).length,
        importedCount: rows.length,
        status: "committed",
        errors: bad
          .filter((b) => (items.find((it) => it.sheet === b.sheet && it.row === b.row) || { input: {} }).input.direction === direction)
          .slice(0, MAX_ROW_ERRORS)
          .map((b) => ({ row: b.row, message: b.errors.map((e) => `${e.field}: ${e.message}`).join("; ").slice(0, 300) })),
        createdBy: userId,
      });
      batchIds.push(batch._id);
      batches[direction] = batch;
    }

    const docs = good.map((g) => ({
      ...g.line,
      business,
      period: period._id,
      source: "import",
      sourceRef: batches[g.line.direction]._id,
      createdBy: userId,
      flags: g.flags,
    }));
    await VatLine.insertMany(docs);

    // Existing lines may now be duplicates of the new ones: re-check the whole period once.
    const verification = await verifyPeriod({ business, periodId: period._id });

    return {
      dryRun: false,
      imported: good.length,
      skipped: bad.length,
      batches: Object.entries(batches).map(([direction, b]) => ({ _id: b._id, direction, importedCount: b.importedCount })),
      verification: {
        blockers: verification.blockers,
        warnings: verification.warnings,
        byCode: verification.byCode,
        readiness: verification.readiness,
      },
    };
  } catch (err) {
    if (batchIds.length) {
      await VatLine.deleteMany({ business, sourceRef: { $in: batchIds } });
      await VatImportBatch.deleteMany({ _id: { $in: batchIds } });
    }
    throw err;
  }
}

module.exports = { importLines, readOptions };