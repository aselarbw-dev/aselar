// Taxation/controllers/exportController.js
// Request handlers for exports. The logic lives in services/exportService.js; the Excel files
// are built by services/excelExport.js.
// req.user is set by the shared protect middleware; every query is scoped to that business.

const service = require("../services/exportService");
const excel = require("../services/excelExport");
const { ServiceError } = require("../services/periodService");

// Turn a ServiceError into a clean JSON response; anything else goes to the error handler.
const fail = (err, res, next) => {
  if (err instanceof ServiceError) {
    const body = { message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }
  return next(err);
};

// Sends an Excel file as a download.
const sendWorkbook = (res, buffer, filename) => {
  res.setHeader("Content-Type", excel.SHEET_MIME);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
};

// POST /api/vat/periods/:id/export: freezes a "ready" period (it becomes "exported").
const createExport = async (req, res, next) => {
  try {
    const result = await service.createExport({
      business: req.user._id,
      businessName: req.user.nameOfBusiness,
      periodId: req.params.id,
      userId: req.user._id,
    });
    res.status(201).json(result);
  } catch (err) {
    fail(err, res, next);
  }
};

// GET /api/vat/periods/:id/exports: the period's exports, newest first.
const listExports = async (req, res, next) => {
  try {
    res.json(await service.listExports({ business: req.user._id, periodId: req.params.id }));
  } catch (err) {
    fail(err, res, next);
  }
};

// GET /api/vat/exports/:exportId/schedule: the file to upload to BURS (Input and Output sheets).
const downloadSchedule = async (req, res, next) => {
  try {
    const record = await service.getExport({ business: req.user._id, exportId: req.params.exportId });
    const buffer = await excel.buildScheduleWorkbook(record.snapshot);
    sendWorkbook(res, buffer, excel.scheduleFileName(record.snapshot.totals.meta));
  } catch (err) {
    fail(err, res, next);
  }
};

// GET /api/vat/exports/:exportId/report: the reconciliation report, for review (not for upload).
const downloadReport = async (req, res, next) => {
  try {
    const record = await service.getExport({ business: req.user._id, exportId: req.params.exportId });
    const buffer = await excel.buildReportWorkbook(record.snapshot);
    sendWorkbook(res, buffer, excel.reportFileName(record.snapshot.totals.meta));
  } catch (err) {
    fail(err, res, next);
  }
};

module.exports = { createExport, listExports, downloadSchedule, downloadReport };