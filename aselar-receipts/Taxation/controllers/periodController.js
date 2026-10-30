// Taxation/controllers/periodController.js
// Request handlers for VAT periods. The logic lives in services/periodService.js.
// req.user is set by the shared protect middleware; every query is scoped to that business.

const { VatProfile, VatPeriod } = require("../models/vatModels");
const service = require("../services/periodService");

// Turn a ServiceError into a clean JSON response; anything else goes to the error handler.
const fail = (err, res, next) => {
  if (err instanceof service.ServiceError) {
    const body = { message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }
  return next(err);
};

// Targets a client may request. "exported" is set by the export flow, and "open" is never
// a target.
const CLIENT_TARGETS = ["in_review", "ready", "filed"];

// GET /api/vat/periods: all periods for this business, newest first.
// Creates any missing periods up to the current one first.
const listPeriods = async (req, res, next) => {
  try {
    const profile = await VatProfile.findOne({ business: req.user._id });
    if (!profile) throw new service.ServiceError("Set up your VAT profile first", 409);

    await service.syncPeriods(profile);

    const periods = await VatPeriod.find({ business: req.user._id }).sort({ periodStart: -1 });
    res.json({ periods: periods.map((p) => service.withDueInfo(p)) });
  } catch (err) {
    fail(err, res, next);
  }
};

// GET /api/vat/periods/:id: one period with line counts and readiness.
const getPeriod = async (req, res, next) => {
  try {
    const summary = await service.getPeriodSummary(req.user._id, req.params.id);
    res.json(summary);
  } catch (err) {
    fail(err, res, next);
  }
};

// POST /api/vat/periods/:id/transition   body: { to, note? }
const changePeriodStatus = async (req, res, next) => {
  try {
    const { to, note } = req.body || {};
    if (!CLIENT_TARGETS.includes(to)) {
      return res.status(400).json({ message: `"to" must be one of: ${CLIENT_TARGETS.join(", ")}` });
    }
    const period = await service.transitionPeriod({
      business: req.user._id,
      periodId: req.params.id,
      to,
      userId: req.user._id,
      note,
    });
    res.json({ period });
  } catch (err) {
    fail(err, res, next);
  }
};

module.exports = { listPeriods, getPeriod, changePeriodStatus };