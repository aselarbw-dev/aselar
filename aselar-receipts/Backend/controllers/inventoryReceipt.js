// controllers/receiptController.js
const NewReceipt = require('../models/inventoryReceipts');
const mongoose = require('mongoose');

const submitReceipt = async (req, res) => {
  try {
    const { items, subtotal, vat, discount, total, cashPaid, change } = req.body;

    // Validate the request
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Receipt must contain at least one item' });
    }

    if (typeof subtotal !== 'number' || subtotal < 0) {
      return res.status(400).json({ success: false, message: 'Subtotal must be a non-negative number' });
    }

    if (typeof vat !== 'number' || vat < 0) {
      return res.status(400).json({ success: false, message: 'VAT must be a non-negative number' });
    }

    if (typeof discount !== 'number' || discount < 0) {
      return res.status(400).json({ success: false, message: 'Discount must be a non-negative number' });
    }

    if (typeof total !== 'number' || total < 0) {
      return res.status(400).json({ success: false, message: 'Total must be a non-negative number' });
    }

    if (typeof cashPaid !== 'number' || cashPaid < 0) {
      return res.status(400).json({ success: false, message: 'Cash paid must be a non-negative number' });
    }

    // Calculate total price for each item
    const processedItems = items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      discount: item.discount || 0,
      totalPrice: (item.quantity * item.price) - (item.discount || 0)
    }));

    // Create a new receipt
    const receipt = new NewReceipt({
      items: processedItems,
      subtotal,
      vat,
      discount,
      total,
      cashPaid,
      change,
      createdBy: req.user._id ,
      user: req.user._id.toString()// Assuming user is authenticated and available in req.user
    });

    // Save the receipt
    await receipt.save();

    return res.status(201).json({
      success: true,
      data: {
      //  receiptNumber: receipt.receiptNumber,
        total: receipt.total,
        change: receipt.change
      },
      message: 'Receipt created successfully'
    });
  } catch (error) {
    console.error('Error submitting receipt:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

const getLatestReceipt = async (req, res) => {
  try {
    const latestReceipt = await NewReceipt.findOne({ createdBy: req.user._id }) // optional: limit to the current user
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(1); // Not strictly necessary with findOne, but good practice

    if (!latestReceipt) {
      return res.status(404).json({
        success: false,
        message: 'No receipts found'
      });
    }

    return res.status(200).json({
      success: true,
      data: latestReceipt
    });
  } catch (error) {
    console.error('Error retrieving latest receipt:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

const getReceiptById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate object ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid receipt ID' });
    }

    const receipt = await NewReceipt.findById(id);

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    return res.status(200).json({
      success: true,
      data: receipt
    });
  } catch (error) {
    console.error('Error retrieving receipt:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};


const getReceipts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Filter by date range if provided
    const filterOptions = {};
    if (req.query.startDate && req.query.endDate) {
      filterOptions.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    // Filter by user if role is not admin (admins can see all receipts)
    if (req.user.role !== 'admin') {
      filterOptions.createdBy = req.user._id;
    }

    const receipts = await NewReceipt.find(filterOptions)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('createdBy', 'name');

    const totalReceipts = await NewReceipt.countDocuments(filterOptions);

    return res.status(200).json({
      success: true,
      count: receipts.length,
      totalPages: Math.ceil(totalReceipts / limit),
      currentPage: page,
      data: receipts
    });
  } catch (error) {
    console.error('Error retrieving receipts:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};



const openCashDrawer = async (req, res) => {
  try {
    // In a real implementation, this would communicate with your hardware
    // For now, we'll just simulate success
    
    // Log the cash drawer opening event
    console.log(`Cash drawer opened by user ${req.user._id} at ${new Date()}`);
    
    // Here you would include code to communicate with the cash drawer
    // Example:
    // const cashDrawer = require('../services/cashDrawerService');
    // await cashDrawer.open();
    
    return res.status(200).json({
      success: true,
      message: 'Cash drawer command sent successfully'
    });
  } catch (error) {
    console.error('Error opening cash drawer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to open cash drawer. Please try again.'
    });
  }
};


const getSalesSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both start and end dates'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set to end of day
    
    // Aggregation pipeline to generate sales summary
    const summary = await NewReceipt.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$total' },
          totalVAT: { $sum: '$vat' },
          totalDiscounts: { $sum: '$discount' },
          transactionCount: { $sum: 1 },
          averageTransaction: { $avg: '$total' }
        }
      },
      {
        $project: {
          _id: 0,
          totalSales: 1,
          totalVAT: 1,
          totalDiscounts: 1,
          transactionCount: 1,
          averageTransaction: { $round: ['$averageTransaction', 2] }
        }
      }
    ]);
    
    return res.status(200).json({
      success: true,
      data: summary[0] || {
        totalSales: 0,
        totalVAT: 0,
        totalDiscounts: 0,
        transactionCount: 0,
        averageTransaction: 0
      },
      period: {
        startDate: start,
        endDate: end
      }
    });
  } catch (error) {
    console.error('Error generating sales summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

module.exports = {
  submitReceipt,
  getLatestReceipt,
  getReceiptById,
  getReceipts,
  openCashDrawer,
  getSalesSummary
};