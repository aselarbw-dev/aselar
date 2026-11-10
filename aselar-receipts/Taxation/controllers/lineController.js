// Taxation/controllers/lineController.js
// Request handlers for VAT lines. The logic lives in services/lineService.js.
// req.user is set by the shared protect middleware; every query is scoped to that business.

const service = require("../services/lineService");
const verification = require("../services/verificationService");
const review = require("../services/reviewService");
const { ServiceError } = require("../services/periodService");

// Turn a ServiceError into a clean JSON response; anything else goes to the error handler.
// (Same helper as in periodController.js. We can pull it into one shared file once the
// feature is stable.)
const fail = (err, res, next) => {
  if (err instanceof ServiceError) {
    const body = { message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }
  return next(err);
};

// POST /api/vat/periods/:id/lines   body: the line's details (see services/lineBuilder.js)
const createLine = async (req, res, next) => {
  try {
    const line = await service.createLine({
      business: req.user._id,
      periodId: req.params.id,
      input: req.body,
      userId: req.user._id,
    });
    res.status(201).json({ line });
  } catch (err) {
    fail(err, res, next);
  }
};

// GET /api/vat/periods/:id/lines?direction=&reviewStatus=&page=&limit=
const listLines = async (req, res, next) => {
  try {
    const result = await service.listLines({
      business: req.user._id,
      periodId: req.params.id,
      direction: req.query.direction,
      reviewStatus: req.query.reviewStatus,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(result);
  } catch (err) {
    fail(err, res, next);
  }
};

// POST /api/vat/periods/:id/verify: re-checks every line in the period and stores the flags.
const verifyPeriod = async (req, res, next) => {
  try {
    const result = await verification.verifyPeriod({
      business: req.user._id,
      periodId: req.params.id,
    });
    res.json(result);
  } catch (err) {
    fail(err, res, next);
  }
};

// PUT /api/vat/lines/:lineId   body: the full line, as when creating one (optional fields left
// out are cleared). The line goes back to "pending".
const updateLine = async (req, res, next) => {
  try {
    const line = await review.updateLine({
      business: req.user._id,
      lineId: req.params.lineId,
      input: req.body,
    });
    res.json({ line });
  } catch (err) {
    fail(err, res, next);
  }
};

// POST /api/vat/lines/:lineId/review   body: { action: "confirm" | "reject" | "reopen" }
const reviewLine = async (req, res, next) => {
  try {
    const line = await review.reviewLine({
      business: req.user._id,
      lineId: req.params.lineId,
      action: (req.body || {}).action,
      userId: req.user._id,
    });
    res.json({ line });
  } catch (err) {
    fail(err, res, next);
  }
};

// POST /api/vat/lines/:lineId/flags/:flagId/resolve: deliberately accept one flag.
const resolveFlag = async (req, res, next) => {
  try {
    const line = await review.resolveFlag({
      business: req.user._id,
      lineId: req.params.lineId,
      flagId: req.params.flagId,
      userId: req.user._id,
    });
    res.json({ line });
  } catch (err) {
    fail(err, res, next);
  }
};

module.exports = { createLine, listLines, verifyPeriod, updateLine, reviewLine, resolveFlag };