const express = require('express');
const router = express.Router();
const dailySellerController = require('../controllers/dailySellerController');
const { protect } = require('../middlewares/protect');
// Protect these as needed (e.g., POST requires auth, GETs maybe public for reports?)
router.post('/seller', protect,dailySellerController.createDailySeller); // Add: protect,
router.get('/daily-seller/:date',protect, dailySellerController.getMostRecentForDay);
router.get('/all', protect,dailySellerController.getAllDailySellers);
router.post('/authorized-sellers', protect, dailySellerController.createAuthorizedSeller);
router.get('/authorized-sellers', protect,dailySellerController.getAuthorizedSellers);
router.put('/authorized-sellers/:id', protect, dailySellerController.updateAuthorizedSeller);
router.delete('/authorized-sellers/:id', protect, dailySellerController.deleteAuthorizedSeller);
module.exports = router;