const express = require('express');
const router = express.Router();
const { protect } = require('../../Shared/protect.js'); // Correct path to Shared service
const { 
createCategory,
  items,
  getAllCategories,
  editItem,
  removeItem,
  getItemsByCategory,  // Fixed: Now exported
  removeCategory,      // NEW: For category delete
  processSale
 
} = require('../controllers/categories');

router.post('/add-category', protect, createCategory);
router.post('/process-sale', protect, processSale);
router.get('/get-categories', protect, getAllCategories);
//router.get('/:categoryId', protect, getCategoryById);
router.post('/add-item/:categoryId', protect, items);
router.put('/items/:categoryId/:itemId', protect, editItem);
router.get('/get-items/:categoryId', protect, getItemsByCategory);
//router.delete('/remove-item/:categoryId/:itemId',protect, removeItem);
router.delete('/remove-category/:categoryId', protect, removeCategory);

module.exports = router;