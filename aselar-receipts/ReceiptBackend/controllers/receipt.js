const {connectDB,mongoose}=require("../../Shared/config.js");
const asyncHandler = require("express-async-handler");

// Create a receipt (updated to handle VAT and discounts)
const receipt = asyncHandler(async (req, res) => {
  const { 
    inputs, 
    subtotal, 
    vatAmount, 
    grandTotal, 
    cash, 
    change,
    discountName = "",
    discountValue = 0,
    discountType = "fixed" 
  } = req.body;

  try {
    console.log('🚀 Upload request started');
    console.log('👤 User from middleware:', req.user ? `ID: ${req.user._id}` : 'MISSING');
    console.log('📊 DB Connection State:', mongoose.connection.readyState);
    await connectDB(); // Ensure database connection
    const Receipt = require("../models/receiptModel.js"); // ← FIXED: Use model instance, not schema
    
    // Optional: Basic validation (skip receiptsNumber - hook handles)
    if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
      return res.status(400).json({ message: 'Inputs array is required and must not be empty' });
    }
    if (typeof cash !== 'number' || cash < 0) {
      return res.status(400).json({ message: 'Valid cash amount is required' });
    }
    if (typeof change !== 'number' || change < 0) {
      return res.status(400).json({ message: 'Valid change amount is required' });
    }
    
    const newReceipt = new Receipt({  // ← FIXED: Use new Model() for full hook chain
      inputs,
      subtotal: subtotal || grandTotal, // Backward compatibility
      vatAmount: vatAmount || 0,       // Default to 0 if not provided
      grandTotal,
      cash,
      change,
      user: req.user._id, // Ensure user ID is included
      ...(discountValue > 0 && {      // Only include if discount exists
        discountName,
        discountValue,
        discountType
      }),
      // No receiptsNumber here - pre-save hook generates it
    });

    const savedReceipt = await newReceipt.save(); // Triggers pre-save hooks (gen receiptsNumber, calcs)

    console.log('✅ Receipt created with ID:', savedReceipt._id, 'ReceiptsNumber:', savedReceipt.receiptsNumber);
    
    res.status(201).json(savedReceipt);
  } catch (error) {
    console.error('❌ Receipt creation error:', error); // ← ADDED: Better logging
    res.status(400).json({ message: error.message });
  }
});

// Get the most recent receipt (unchanged)
const getReceipts = asyncHandler(async (req, res) => {
  try {
    await connectDB(); // Ensure database connection
    const Receipt = require("../models/receiptModel.js");
    const recentReceipt = await Receipt.findOne({ user: req.user._id }).sort({ createdAt: -1 });

    if (!recentReceipt) {
      return res.status(404).json({ message: "No receipts found" });
    }

    res.status(200).json(recentReceipt);
  } catch (error) {
    console.error("Error fetching the latest receipt:", error);
    res.status(500).json({ message: "Error fetching the latest receipt" });
  }
});

// Get all receipts (unchanged)
const getAllReceipts = asyncHandler(async (req, res) => {
  try {
    await connectDB(); // Ensure database connection
    const Receipt = require("../models/receiptModel.js");
    const receipts = await Receipt.find({ user: req.user._id }).sort({ createdAt: -1 });

    if (!receipts.length) {
      return res.status(404).json({ message: "No receipts found" });
    }

    res.status(200).json(receipts);
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(500).json({ message: "Error fetching receipts" });
  }
});

// Delete a receipt by ID - FIXED VERSION
const deleteReceipt = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    console.log('🗑️ Delete request started');
    console.log('📋 Receipt ID:', id);
    console.log('👤 User from middleware:', req.user ? `ID: ${req.user._id}` : 'MISSING');

    await connectDB(); // Ensure database connection
    const Receipt = require("../models/receiptModel.js");
    
    // Find the receipt first to check if it exists and belongs to the user
    const receiptToDelete = await Receipt.findById(id);
    
    if (!receiptToDelete) {
      console.log('❌ Receipt not found');
      return res.status(404).json({ message: "Receipt not found" });
    }

    console.log('📋 Found receipt user:', receiptToDelete.user);
    console.log('🔐 Current user:', req.user._id);

    // Check if the receipt belongs to the current user - FIXED COMPARISON
    if (receiptToDelete.user && req.user && receiptToDelete.user.toString() !== req.user._id.toString()) {
      console.log('🚫 Authorization failed - user mismatch');
      return res.status(403).json({ message: "Not authorized to delete this receipt" });
    }

    // Delete the receipt
    await Receipt.findByIdAndDelete(id);
    
    console.log('✅ Receipt deleted successfully');
    res.status(200).json({ 
      message: "Receipt deleted successfully",
      deletedReceiptId: id 
    });
  } catch (error) {
    console.error("❌ Error deleting receipt:", error);
    res.status(500).json({ message: "Error deleting receipt", error: error.message });
  }
});

module.exports = { receipt, getReceipts, getAllReceipts, deleteReceipt };