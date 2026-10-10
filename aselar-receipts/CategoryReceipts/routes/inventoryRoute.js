const express = require('express');
const router = express.Router();
const {getLatestReceipt,getReceiptById,
    getReceipts, openCashDrawer,getReceiptsSummary,
    deleteReceipt,getLaybuys,addLaybuyPayment,
    getSalesSummary,submitReceipt,
    getDiscountSetting,setDiscountSetting,
    getDiscountRecords} = require('../controllers/inventoryReceipts'); // NEW: getDiscountRecords
const { protect} = require('../../Shared/protect'); // Adjust the path as necessary


router.post(
  '/submit-receipt',
  protect,submitReceipt
);

router.get(
  '/laybuys',
  protect,
  getLaybuys
);
router.post('/laybuys/:id/pay', 
  protect, 
  addLaybuyPayment);
router.post(
  '/laybuy-payment',
  protect,
  addLaybuyPayment
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
router.get('/receipts-summary', protect, getReceiptsSummary);

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
router.delete('/receipt/:id', protect, deleteReceipt);

// NEW: discount on/off setting
router.get('/discount-setting', protect, getDiscountSetting);
router.put('/discount-setting', protect, setDiscountSetting);

// NEW: who gave discounts, and when (powers Discount Activity in SellerManagement)
router.get('/discount-records', protect, getDiscountRecords);

module.exports = router;