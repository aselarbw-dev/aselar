const { mongoose, connectDB } = require("../../Shared/config");
const { uploadToCloudinary } = require('../utils/cloudinary');

// Require model once at top
const Category = require('../models/categories.js');

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
    const { soldItems } = req.body; // Expect: [{ categoryId, itemId, soldQuantity }, ...]
    if (!soldItems || !Array.isArray(soldItems) || soldItems.length === 0) {
      return res.status(400).json({ message: 'No items sold provided' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    await connectDB();
    const updatedCategories = []; // To return updated ones

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

      // Deduct quantity and update lowStock
      item.quantity = currentQty - soldQuantity;
      item.lowStock = item.quantity <= 10;

      await category.save();
      updatedCategories.push({ categoryId, itemId, newQuantity: item.quantity, lowStock: item.lowStock });
      
      console.log(`Sale processed: ${soldQuantity} x ${item.name} deducted. New qty: ${item.quantity}, Low stock: ${item.lowStock}`);
    }

    // Optionally refetch all categories for frontend refresh (comment out if frontend refetches via getAllCategories)
    // const allCategories = await Category.find({ user: req.user._id.toString() })
    //   .select('name description image items')
    //   .sort({ createdAt: -1 });

    res.status(200).json({ 
      message: 'Sale processed successfully, inventory updated', 
      updatedItems: updatedCategories
      // categories: allCategories // Heavy—omit if not needed
    });
  } catch (error) {
    console.error('Process sale error:', error);
    res.status(500).json({ message: 'Failed to process sale', error: error.message });
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
  processSale
};