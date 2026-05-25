const express = require('express');
const router = express.Router();
const {getLatestReceipt,getReceiptById,
    getReceipts, openCashDrawer,
    getSalesSummary,submitReceipt} = require('../controllers/inventoryReceipts');
const { protect} = require('../../Shared/protect'); // Adjust the path as necessary


router.post(
  '/submit-receipt',
  protect,submitReceipt
);


router.get(
  '/recent-receipt',
  protect,
  getLatestReceipt
);
router.get(
  '/receipt/:id',
  protect,
  getReceiptById
);


router.get(
  '/get-all',
  protect,getReceipts
);


router.post(
  '/open-cash-drawer',
  protect,
  openCashDrawer
);


router.get(
  '/sales-summary',
  protect,
  getSalesSummary
);

module.exports = router;