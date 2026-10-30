// Taxation/routes/routes.js: route definitions only. Handlers live in controllers/.
// Every route uses the shared protect middleware, so req.user is always set in controllers.

const express = require("express");

// Keep the exact casing of "Shared" (Render runs Linux, which is case-sensitive).
const { protect } = require("../../Shared/protect");

const { ping, getProfile, updateProfile } = require("../controllers/Vatcontroller");
const { listPeriods, getPeriod, changePeriodStatus } = require("../controllers/periodController");

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

module.exports = router;