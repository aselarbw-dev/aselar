const { mongoose, connectDB } = require("../../Shared/config");
const { uploadToCloudinary } = require('../utils/cloudinary');
const ScanLog=require('../models/scanLog');
// Require model once at top
const Category = require('../models/categories.js');
const SalesLog = require('../models/salesLog.js'); // NEW: dated sales records for reporting

const createCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;
    console.log('Received category data:', { name, description, imageLength: image?.length });
    console.log('User from request:', req.user); // Debug user data
    
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    await connectDB();
    let imageUrl = '';
    if (image) {
      try {
        const uploadResponse = await uploadToCloudinary(image);
        imageUrl = uploadResponse.secure_url;
        console.log('Image uploaded successfully:', imageUrl);
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ message: 'Failed to upload image' });
      }
    }
   
    const newCategory = await Category.create({ 
      name, 
      description, 
      image: imageUrl, 
      items: [],
      user: req.user._id.toString()
    });

    console.log('Category created successfully:', newCategory);
    res.status(201).json({ message: 'Category created successfully', category: newCategory });
  } catch (error) {
    console.error('Create category detailed error:', error);
    res.status(500).json({ 
      message: 'Failed to create category',
      error: error.message 
    });
  }
};

const getAllCategories = async (req, res) => {
  try {
    // Get categories for the logged-in user only
    await connectDB();
    const categories = await Category.find({ user: req.user._id.toString() })
      .select('name description image items')
      .sort({ createdAt: -1 });
    
    res.status(200).json(categories);
  } catch (error) {
    console.error('Fetch categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

const items = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { 
      name, 
      costPrice, 
      sellingPrice, 
      quantity, 
      unit = '', 
      expiryDate = '', 
      image = '', 
      user 
    } = req.body;
    
    let imageUrl = '';
    
    if (image) {
      const uploadResponse = await uploadToCloudinary(image);
      imageUrl = uploadResponse.secure_url;
    }

    const parsedQuantity = parseInt(quantity, 10);
    const newItem = {
      name,
      costPrice,
      sellingPrice,
      quantity: parsedQuantity,
      unit,
      expiryDate,
      image: imageUrl,
      // FIXED: Compute as Boolean to match schema (true = low stock, false = ok)
      lowStock: parsedQuantity <= 10,
      user
    };

    await connectDB();
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { $push: { items: newItem } },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.status(200).json(newItem);
  } catch (error) {
    console.error('Add item error:', error);
    res.status(500).json({ message: 'Failed to add item' });
  }
};
//edit
const editItem = async (req, res) => {
  try {
    const { categoryId, itemId } = req.params;
    const updates = req.body;

    // Ensure the user owns the category
    await connectDB();
    const category = await Category.findOne({
      _id: categoryId,
      user: req.user._id.toString()
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Find the item in the category
    const item = category.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Update the item fields
    Object.assign(item, updates);
    if (updates.quantity !== undefined) {
      item.lowStock = item.quantity <= 10; // Re-check lowStock if qty edited
    }
    await category.save();

    res.json({ message: 'Item updated successfully', item });
  } catch (error) {
    console.error('Edit item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getItemsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Find the category and ensure it belongs to the logged-in user
    await connectDB();
    const category = await Category.findOne({
      _id: categoryId,
      user: req.user._id.toString(),
    }).select('items');

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Return the items array
    res.status(200).json(category.items);
  } catch (error) {
    console.error('Fetch items error:', error);
    res.status(500).json({ message: 'Failed to fetch items' });
  }
};

//delete
const removeItem = async (req, res) => {
  try {
    const { categoryId, itemId } = req.params;
    console.log('=== DELETE REQUEST ===');
    console.log('Category ID:', categoryId);
    console.log('Item ID:', itemId);
    console.log('User ID:', req.user._id.toString());
    
    await connectDB();
    
    // First, let's see if we can find the category at all
    const allCategories = await Category.find({ user: req.user._id.toString() });
    console.log('Total categories for user:', allCategories.length);
    
    const category = await Category.findOne({ 
      _id: categoryId,
      user: req.user._id.toString()
    });

    if (!category) {
      console.log('❌ Category not found');
      return res.status(404).json({ message: 'Category not found' });
    }
    
    console.log('✅ Category found:', category.name);
    console.log('Items in category before deletion:', category.items.length);
    
    // Log all item IDs to see what we're working with
    category.items.forEach((item, index) => {
      console.log(`Item ${index}: ID = ${item._id.toString()}, Name = ${item.name}`);
    });
    
    console.log('Looking for item ID:', itemId);
    
    // Check if the item exists (Mongoose way)
    const item = category.items.id(itemId);
    if (!item) {
      console.log('❌ Item not found in category');
      return res.status(404).json({ message: 'Item not found in category' });
    }
    
    // Remove the item (Mongoose removes and marks for save)
    item.remove();
    console.log('Items after removal:', category.items.length);
    
    // Save and verify
    const savedCategory = await category.save();
    console.log('✅ Category saved successfully');
    console.log('Final item count:', savedCategory.items.length);
    
    res.status(200).json({ 
      message: 'Item removed successfully',
      remainingItems: savedCategory.items.length,
      deletedItemId: itemId
    });
    
  } catch (error) {
    console.error('❌ Remove item error:', error);
    res.status(500).json({ message: 'Failed to remove item', error: error.message });
  }
};

// NEW: Delete entire category (fixes frontend delete persistence)
const removeCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    console.log('=== DELETE CATEGORY REQUEST ===');
    console.log('Category ID:', categoryId);
    console.log('User ID:', req.user._id.toString());
    
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    await connectDB();
    
    // Find and ensure user owns it
    const category = await Category.findOne({
      _id: categoryId,
      user: req.user._id.toString()
    });

    if (!category) {
      console.log('❌ Category not found');
      return res.status(404).json({ message: 'Category not found' });
    }

    console.log('✅ Category found:', category.name);
    console.log('Items in category:', category.items.length);
    
    // Delete the category (Mongoose handles embedded items)
    await Category.findByIdAndDelete(categoryId);
    
    console.log('✅ Category deleted successfully');
    
    res.status(200).json({ 
      message: 'Category removed successfully',
      deletedCategoryId: categoryId
    });
    
  } catch (error) {
    console.error('❌ Remove category error:', error);
    res.status(500).json({ message: 'Failed to remove category', error: error.message });
  }
};

// NEW: Process sale and deduct inventory
const processSale = async (req, res) => {
  try {
    const { soldItems, paymentMethod } = req.body;
    if (!soldItems || !Array.isArray(soldItems) || soldItems.length === 0) {
      return res.status(400).json({ message: 'No items sold provided' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    await connectDB();
    const updatedCategories = [];

    for (const sale of soldItems) {
      const { categoryId, itemId, soldQuantity } = sale;
      if (!categoryId || !itemId || !soldQuantity || soldQuantity <= 0) {
        return res.status(400).json({ message: 'Invalid sale item data' });
      }

      const category = await Category.findOne({
        _id: categoryId,
        user: req.user._id.toString()
      });

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const item = category.items.id(itemId);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }

      const currentQty = item.quantity;
      if (currentQty < soldQuantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${item.name}: ${currentQty} available` 
        });
      }

      item.quantity = currentQty - soldQuantity;
      item.lowStock = item.quantity <= 10;

      // Accumulate all-time sales reporting fields on the item itself
      // (used for the category-card summary and top-sellers chart).
      const saleRevenue = soldQuantity * item.sellingPrice;
      item.soldQuantity = (item.soldQuantity || 0) + soldQuantity;
      item.revenue = (item.revenue || 0) + saleRevenue;

      await category.save();

      // NEW: also write a dated SalesLog entry for this sale, so the daily
      // report can group by day. Awaited (not fire-and-forget) since this
      // record is the reporting source of truth, unlike the ScanLog tagging
      // below which is best-effort.
      await SalesLog.create({
        user: req.user._id,
        categoryId: category._id,
        categoryName: category.name,
        itemId: item._id,
        itemName: item.name,
        quantity: soldQuantity,
        revenue: saleRevenue,
      });

      updatedCategories.push({
        categoryId,
        itemId,
        newQuantity: item.quantity,
        lowStock: item.lowStock,
        soldQuantity: item.soldQuantity,
        revenue: item.revenue
      });

      console.log(`Sale processed: ${soldQuantity} x ${item.name} deducted. New qty: ${item.quantity}, Low stock: ${item.lowStock}`);

      // NEW — moved inside the loop, where itemId/soldQuantity actually exist.
      // Non-blocking: tag the most recent matching, unlabeled scan logs
      // for THIS item with the payment method just selected.
      if (paymentMethod) {
        ScanLog.find({
          user: req.user._id,
          itemId,
          paymentMethod: '',
        })
          .sort({ createdAt: -1 })
          .limit(soldQuantity)
          .then(logs => {
            const ids = logs.map(l => l._id);
            return ScanLog.updateMany({ _id: { $in: ids } }, { $set: { paymentMethod } });
          })
          .catch(err => console.error('Scan log payment tag failed (non-blocking):', err.message));
      }
    }

    res.status(200).json({ 
      message: 'Sale processed successfully, inventory updated', 
      updatedItems: updatedCategories
    });
  } catch (error) {
    console.error('Process sale error:', error);
    res.status(500).json({ message: 'Failed to process sale', error: error.message });
  }
};

// NEW: helper — reduce a list of SalesLog docs into totals + per-category
// breakdown + top items within each category, for a given period.
const summarizeLogs = (logs) => {
  let totalRevenue = 0;
  let totalUnitsSold = 0;
  const categoryMap = new Map(); // categoryId -> { categoryName, revenue, unitsSold, items: Map(itemId -> {itemName, quantity, revenue}) }

  logs.forEach((log) => {
    totalRevenue += log.revenue;
    totalUnitsSold += log.quantity;

    const catId = log.categoryId.toString();
    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, {
        categoryId: catId,
        categoryName: log.categoryName,
        revenue: 0,
        unitsSold: 0,
        items: new Map(),
      });
    }
    const cat = categoryMap.get(catId);
    cat.revenue += log.revenue;
    cat.unitsSold += log.quantity;

    const itemKey = log.itemId.toString();
    if (!cat.items.has(itemKey)) {
      cat.items.set(itemKey, { itemName: log.itemName, quantity: 0, revenue: 0 });
    }
    const itemAgg = cat.items.get(itemKey);
    itemAgg.quantity += log.quantity;
    itemAgg.revenue += log.revenue;
  });

  const byCategory = Array.from(categoryMap.values())
    .map((cat) => ({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      revenue: cat.revenue,
      unitsSold: cat.unitsSold,
      topItems: Array.from(cat.items.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 3),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return { totalRevenue, totalUnitsSold, byCategory };
};

// NEW: Daily sales report for a given day (defaults to today) vs the day
// before it vs the 7-day trailing average ending before that day. Built
// from SalesLog (the dated records written in processSale above), not from
// the all-time counters on Category.items which have no date attached.
const getSalesReport = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // NEW: optional ?date=YYYY-MM-DD to view any past day's report.
    // Falls back to today when omitted.
    const { date } = req.query;
    let selectedDate;
    if (date) {
      const parsed = new Date(`${date}T00:00:00`);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'Invalid date format, expected YYYY-MM-DD' });
      }
      selectedDate = parsed;
    } else {
      selectedDate = new Date();
    }

    await connectDB();

    const startOfSelectedDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const startOfNextDay = new Date(startOfSelectedDay);
    startOfNextDay.setDate(startOfNextDay.getDate() + 1);
    const startOfPreviousDay = new Date(startOfSelectedDay);
    startOfPreviousDay.setDate(startOfPreviousDay.getDate() - 1);
    const startOf7DaysBeforeSelected = new Date(startOfSelectedDay);
    startOf7DaysBeforeSelected.setDate(startOf7DaysBeforeSelected.getDate() - 7);

    // Pull everything spanning the 7-day-average window through the
    // selected day in one query, then split it in memory — cheaper than
    // three separate DB round trips.
    const logs = await SalesLog.find({
      user: req.user._id,
      soldAt: { $gte: startOf7DaysBeforeSelected, $lt: startOfNextDay },
    }).lean();

    const selectedDayLogs = logs.filter((l) => l.soldAt >= startOfSelectedDay && l.soldAt < startOfNextDay);
    const previousDayLogs = logs.filter((l) => l.soldAt >= startOfPreviousDay && l.soldAt < startOfSelectedDay);
    // Trailing 7 full days immediately before the selected day.
    const trailing7Logs = logs.filter((l) => l.soldAt >= startOf7DaysBeforeSelected && l.soldAt < startOfSelectedDay);

    const selectedDay = summarizeLogs(selectedDayLogs);
    const previousDay = summarizeLogs(previousDayLogs);
    const trailing7 = summarizeLogs(trailing7Logs);

    // Turn the 7-day trailing total into a per-day average.
    const sevenDayAverage = {
      totalRevenue: trailing7.totalRevenue / 7,
      totalUnitsSold: trailing7.totalUnitsSold / 7,
      byCategory: trailing7.byCategory.map((cat) => ({
        ...cat,
        revenue: cat.revenue / 7,
        unitsSold: cat.unitsSold / 7,
        topItems: cat.topItems.map((item) => ({
          ...item,
          quantity: item.quantity / 7,
          revenue: item.revenue / 7,
        })),
      })),
    };

    res.status(200).json({
      generatedAt: new Date(),
      selectedDate: startOfSelectedDay.toISOString().slice(0, 10),
      selectedDay,
      previousDay,
      sevenDayAverage,
    });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ message: 'Failed to generate sales report', error: error.message });
  }
};

module.exports = {
  createCategory,
  items,
  getAllCategories,
  editItem,
  removeItem,
  getItemsByCategory,  // Fixed: Now exported
  removeCategory,      // NEW: For category delete
  processSale,
  getSalesReport        // NEW: daily sales report
};