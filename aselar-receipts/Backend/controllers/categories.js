const Category = require('../models/categories.js');
const mongoose = require("mongoose");
const { uploadToCloudinary } = require('../utils/cloudinary');

const createCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;
    console.log('Received category data:', { name, description, imageLength: image?.length });
    console.log('User from request:', req.user); // Debug user data
    
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

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
    const { name, costPrice, sellingPrice, quantity, image } = req.body;
    
    let imageUrl = '';
    
    // Handle image upload if provided
    if (image) {
      const uploadResponse = await uploadToCloudinary(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Create a new item with user ID and image
    const newItem = {
      user: req.user._id.toString(),
      name,
      costPrice,
      sellingPrice,
      quantity,
      image: imageUrl
    };

    // Update the category by pushing the new item
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
    
    const category = await Category.findOne({ 
      _id: categoryId,
      user: req.user._id.toString()
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Remove item from the items array
    category.items = category.items.filter(
      item => item._id.toString() !== itemId
    );

    await category.save();
    
    res.status(200).json({ message: 'Item removed successfully' });
  } catch (error) {
    console.error('Remove item error:', error);
    res.status(500).json({ message: 'Failed to remove item' });
  }
};


module.exports = {
  createCategory,
  items,
  getAllCategories,
  editItem,
  removeItem,
  getItemsByCategory
 
};