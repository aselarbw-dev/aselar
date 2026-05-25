// routes/debtRoutes.js
const express = require('express');
const router = express.Router();
const debtController = require('../controllers/debt');
const { protect } = require('../../Shared/protect'); // Correct path to Backend service; // Your existing protect middleware

// All routes are protected
router.use(protect);

// POST /api/debt-collection - Create new debt record
router.post('/debt-note',protect, debtController.createDebt);

// GET /api/debt-collection - Get all debt records for user
router.get('/debts',protect, debtController.getAllDebts);
// get recent debt
router.get('/recent-debt',protect, debtController. getRecentDebt);

// GET /api/debt-collection/:id - Get single debt record
router.get('/:id',protect, debtController.getDebtById);

// PUT /api/debt-collection/:id - Update debt record
router.put('/:id', debtController.updateDebt);

// DELETE /api/debt-collection/:id - Delete debt record
router.delete('/:id', debtController.deleteDebt);

module.exports = router;