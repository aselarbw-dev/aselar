const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/protect');
const { 
  createCategory, 
  items, 
  getAllCategories,
  editItem,
  removeItem,
  getItemsByCategory
 
} = require('../controllers/categories');

router.post('/add-category', protect, createCategory);
router.get('/get-categories', protect, getAllCategories);
//router.get('/:categoryId', protect, getCategoryById);
router.post('/add-item/:categoryId', protect, items);
router.put('/items/:categoryId/:itemId', protect, editItem);
router.get('/get-items/:categoryId', protect, getItemsByCategory);
router.delete('/remove-item/:categoryId/:itemId',protect, removeItem);

module.exports = router;