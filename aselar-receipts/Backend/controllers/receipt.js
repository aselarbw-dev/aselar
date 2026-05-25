const ReceiptSchema = require("../models/receiptModel.js");
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
    const newReceipt = await ReceiptSchema.create({
      inputs,
      subtotal: subtotal || grandTotal, // Backward compatibility
      vatAmount: vatAmount || 0,       // Default to 0 if not provided
      grandTotal,
      cash,
      change,
      ...(discountValue > 0 && {      // Only include if discount exists
        discountName,
        discountValue,
        discountType
      }),
      user: req.user._id.toString()
    });

    res.status(201).json(newReceipt);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get the most recent receipt (unchanged)
const getReceipts = asyncHandler(async (req, res) => {
  try {
    const recentReceipt = await ReceiptSchema.findOne().sort({ createdAt: -1 });

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
    const receipts = await ReceiptSchema.find().sort({ createdAt: -1 });

    if (!receipts.length) {
      return res.status(404).json({ message: "No receipts found" });
    }

    res.status(200).json(receipts);
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(500).json({ message: "Error fetching receipts" });
  }
});

module.exports = { receipt, getReceipts, getAllReceipts };
