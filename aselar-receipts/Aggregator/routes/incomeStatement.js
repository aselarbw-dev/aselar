const express = require("express");
const router = express.Router();
const { getIncomeStatement } = require("../controllers/incomeStatement");
const { protect } = require("../../Shared/protect"); // Shared middleware for auth

// Income Statement route
router.get("/income-statement", protect, getIncomeStatement);

module.exports = router;
