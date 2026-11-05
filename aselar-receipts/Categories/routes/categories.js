const express = require('express');
const router = express.Router();
const { protect } = require('../../Shared/protect.js'); // Correct path to Shared service
const { 
  createCategory,
  items,
  getAllCategories,
  editItem,
  removeItem,
  getItemsByCategory,
  removeCategory,
  processSale,
  getSalesReport,
  removeAllCategories,
  deleteSalesReport      // NEW
} = require('../controllers/categories');

router.post('/add-category', protect, createCategory);
router.post('/process-sale', protect, processSale);
router.get('/get-categories', protect, getAllCategories);
router.delete('/delete-all-categories', protect, removeAllCategories);
//router.get('/:categoryId', protect, getCategoryById);
router.post('/add-item/:categoryId', protect, items);
router.put('/items/:categoryId/:itemId', protect, editItem);
router.get('/get-items/:categoryId', protect, getItemsByCategory);
//router.delete('/remove-item/:categoryId/:itemId',protect, removeItem);
router.delete('/remove-category/:categoryId', protect, removeCategory);
router.get('/sales-report', protect, getSalesReport); // daily sales report
router.delete('/sales-report', protect, deleteSalesReport); // NEW: delete all sales report data

module.exports = router;