const express = require('express');
const router = express.Router();
const receiptPolicyController = require('../controllers/receiptPolicyController');
const { protect } = require('../middlewares/protect');

router.post('/receipt-policy', protect, receiptPolicyController.createReceiptPolicy);
router.get('/receipt-policy', protect, receiptPolicyController.getReceiptPolicy);

module.exports = router;