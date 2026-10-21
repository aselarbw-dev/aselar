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

    // Update the category by pushing the new item.
    // UPDATED: the filter now also checks the category belongs to this user,
    // so one account can't push items into another account's category.
    const updatedCategory = await Category.findOneAndUpdate(
      { _id: categoryId, user: req.user._id.toString() },
      { $push: { items: newItem } },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // NEW: first image sticks. Only sets the category image if it has none yet
    // (empty or missing), in one atomic update, so a later image never replaces it.
    if (imageUrl) {
      await Category.updateOne(
        { _id: categoryId, image: { $in: ['', null] } },
        { $set: { image: imageUrl } }
      );
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
    const updates = { ...req.body };

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

    // NEW: a freshly picked image arrives as a base64 data URL. Upload it with the
    // same Cloudinary helper the add-item route uses and store only the URL, instead
    // of saving the whole base64 string inside the category document.
    // An unchanged image (already a URL) is left alone.
    if (typeof updates.image === 'string' && updates.image.startsWith('data:')) {
      try {
        const uploadResponse = await uploadToCloudinary(updates.image);
        updates.image = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error (edit item):', uploadError);
        return res.status(500).json({ message: 'Failed to upload image' });
      }
    }

    // Update the item fields
    Object.assign(item, updates);

    // NEW: first image sticks. If the category has no image yet and this item now
    // has a real image URL, the category adopts it. Never overwrites an existing one.
    if (!category.image && typeof item.image === 'string' && item.image.startsWith('http')) {
      category.image = item.image;
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