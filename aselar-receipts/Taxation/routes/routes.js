// Taxation/routes/routes.js: route definitions only. Handlers live in controllers/.
// Every route uses the shared protect middleware, so req.user is always set in controllers.

const express = require("express");

// Keep the exact casing of "Shared" (Render runs Linux, which is case-sensitive).
const { protect } = require("../../Shared/protect");

const { ping, getProfile, updateProfile } = require("../controllers/Vatcontroller");
const {
  listPeriods,
  getPeriod,
  changePeriodStatus,
  getReconciliation,
} = require("../controllers/periodController");
const {
  createLine,
  listLines,
  verifyPeriod,
  updateLine,
  reviewLine,
  resolveFlag,
} = require("../controllers/lineController");
const {
  createExport,
  listExports,
  downloadSchedule,
  downloadReport,
} = require("../controllers/exportController");
const { importLines } = require("../controllers/importController");

const router = express.Router();

// Sanity check for the auth chain. Remove once the real endpoints exist.
router.get("/ping", protect, ping);

// VAT settings for the logged-in business.
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

// Tax periods.
router.get("/periods", protect, listPeriods);
router.get("/periods/:id", protect, getPeriod);
router.post("/periods/:id/transition", protect, changePeriodStatus);
router.get("/periods/:id/reconciliation", protect, getReconciliation);

// Lines (sales and purchases) inside a period.
router.get("/periods/:id/lines", protect, listLines);
router.post("/periods/:id/lines", protect, createLine);
router.post("/periods/:id/verify", protect, verifyPeriod);

// Import lines from an Excel/CSV file. The file is the raw request body (up to 10 MB), and the
// options travel in the query string. Without dryRun=false it only previews.
router.post(
  "/periods/:id/import",
  protect,
  express.raw({ type: () => true, limit: "10mb" }),
  importLines
);

// Working on one line: edit it, confirm/reject/reopen it, resolve one of its flags.
router.put("/lines/:lineId", protect, updateLine);
router.post("/lines/:lineId/review", protect, reviewLine);
router.post("/lines/:lineId/flags/:flagId/resolve", protect, resolveFlag);

// Exports: freeze a ready period, then download its files.
router.post("/periods/:id/export", protect, createExport);
router.get("/periods/:id/exports", protect, listExports);
router.get("/exports/:exportId/schedule", protect, downloadSchedule);
router.get("/exports/:exportId/report", protect, downloadReport);

module.exports = router;