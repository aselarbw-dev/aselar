// Taxation/controllers/vatController.js
// Request handlers for the VAT service. Business logic will move into a service layer
// as it grows (periods, lines, reconciliation); for now these only talk to the models.
//
// req.user is set by the shared protect middleware.
// Every query is scoped with business: req.user._id.

const { VatProfile } = require("../models/vatModels");

// Only these fields may be set by the client. `business` always comes from the token,
// and compliance settings (dataPolicy) are deliberately not client-editable.
const PROFILE_FIELDS = [
  "countryCode",
  "vatNumber",
  "category",
  "ratePercent",
  "pricesInclusive",
  "deadlineDays",
  "b2cMode",
  "roundingMode",
  "lateClaimPolicy",
  "openingCreditThebe",
  "firstPeriodStart",
];

const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj && obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

// Light checks beyond the schema's enum validation. Returns an error string or null.
const checkProfile = (u) => {
  if (u.ratePercent !== undefined) {
    if (
      typeof u.ratePercent !== "number" ||
      !Number.isFinite(u.ratePercent) ||
      u.ratePercent < 0 ||
      u.ratePercent > 100
    ) {
      return "ratePercent must be a number between 0 and 100";
    }
  }
  if (u.deadlineDays !== undefined) {
    if (!Number.isInteger(u.deadlineDays) || u.deadlineDays < 1 || u.deadlineDays > 90) {
      return "deadlineDays must be a whole number between 1 and 90";
    }
  }
  if (u.openingCreditThebe !== undefined) {
    if (!Number.isInteger(u.openingCreditThebe) || u.openingCreditThebe < 0) {
      return "openingCreditThebe must be a whole number of thebe, 0 or more";
    }
  }
  return null;
};

// GET /api/vat/ping: proves the auth chain works.
const ping = (req, res) => {
  res.json({ ok: true, business: req.user._id, name: req.user.nameOfBusiness });
};

// GET /api/vat/profile: this business's VAT settings (null until set up).
const getProfile = async (req, res, next) => {
  try {
    const profile = await VatProfile.findOne({ business: req.user._id }).lean();
    res.json({ profile: profile || null });
  } catch (err) {
    next(err);
  }
};

// PUT /api/vat/profile: create or update this business's VAT settings.
const updateProfile = async (req, res, next) => {
  try {
    const updates = pick(req.body, PROFILE_FIELDS);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }
    const problem = checkProfile(updates);
    if (problem) return res.status(400).json({ message: problem });

    const profile = await VatProfile.findOneAndUpdate(
      { business: req.user._id },
      { $set: updates },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json({ profile });
  } catch (err) {
    next(err);
  }
};

module.exports = { ping, getProfile, updateProfile };