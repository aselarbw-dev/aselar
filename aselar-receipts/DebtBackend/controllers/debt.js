// controllers/debtController.js

const {connectDB,mongoose}=require("../../Shared/config")
const debtController = {
  // Create new debt record
  createDebt: async (req, res) => {
     console.log('👤 User from middleware:', req.user ? `ID: ${req.user._id}` : 'MISSING');
        console.log('📊 DB Connection State:', mongoose.connection.readyState);
        const { fullName, location, amount,message, issuersName } = req.body;
    try {
      await connectDB(); // Ensure DB is connected before proceeding
      const Debt = require('../models/debtModel'); // Your existing model
      
      // Basic validation (minimal, schema handles most)
      if (!fullName || !location || amount <= 0 || !message || !issuersName) {
        return res.status(400).json({ success: false, message: 'All fields are required (amount > 0)' });
      }
      
      const debtData = new Debt({
        fullName,
        location,
        amount,
        message,
        issuersName,
        user: req.user._id // Ensure user ID is included (consistent with logs)
      });
      
      const savedDebt = await debtData.save(); // Triggers pre-save hook for debtNoteNumber
      
      console.log('✅ Debt note created:', savedDebt._id, 'DebtNoteNumber:', savedDebt.debtNoteNumber);
      
      res.status(201).json({
        success: true,
        message: 'Debt collection note created successfully',
        data: savedDebt
      });
    } catch (error) {
      console.error('❌ Create debt error:', error); // ← ADDED: Better logging
      res.status(400).json({
        success: false,
        message: 'Error creating debt record',
        error: error.message
      });
    }
  },

  // NEW: Get the most recent debt note (for dynamic template, mirrors getReceipts)
  getRecentDebt: async (req, res) => {
    try {
      await connectDB();
      const Debt = require('../models/debtModel');
      const recentDebt = await Debt.findOne({ user: req.user._id })  // Filter by user
        .sort({ createdAt: -1 })
        .populate('user', 'name email');  // Optional: Populate user details

      if (!recentDebt) {
        return res.status(404).json({ success: false, message: "No debt notes found" });
      }

      res.status(200).json({
        success: true,
        data: recentDebt
      });
    } catch (error) {
      console.error("Error fetching recent debt note:", error);
      res.status(500).json({
        success: false,
        message: 'Error fetching recent debt note',
        error: error.message
      });
    }
  },

  // Get all debt records for logged in user
  getAllDebts: async (req, res) => {
    try {
      await connectDB(); // Keep your DB connect
      const Debt = require('../models/debtModel');
      const debts = await Debt.find({ user: req.user._id })
        .populate('user', 'name email')
        .sort({ createdAt: -1 });
      
      // ← SIMPLIFIED: Return array directly (like quotes/invoices/etc.)
      res.status(200).json(debts);  // Frontend now does debtsRes.data.length for the count
    } catch (error) {
      console.error('❌ Get all debts error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching debt records',
        error: error.message
      });
    }
  },

  // Get single debt record
  getDebtById: async (req, res) => {
    try {
       await connectDB(); // Ensure DB is connected before proceeding
      const Debt = require('../models/debtModel'); // Your existing model
      const debt = await Debt.findOne({ 
        _id: req.params.id, 
        user: req.user._id  // ← FIXED: Consistent _id
      }).populate('user', 'name email');
      
      if (!debt) {
        return res.status(404).json({
          success: false,
          message: 'Debt record not found'
        });
      }

      res.status(200).json({
        success: true,
        data: debt
      });
    } catch (error) {
      console.error('❌ Get debt by ID error:', error); // ← ADDED: Logging
      res.status(500).json({
        success: false,
        message: 'Error fetching debt record',
        error: error.message
      });
    }
  },

  // Update debt record
  updateDebt: async (req, res) => {
    const { fullName, location, amount,message, issuersName } = req.body;
    try {
      
       await connectDB(); // Ensure DB is connected before proceeding
      const Debt = require('../models/debtModel'); // Your existing model
      const debt = await Debt.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },  // ← FIXED: Consistent _id
        { fullName, location, amount, message,issuersName },
        { new: true, runValidators: true }
      );

      if (!debt) {
        return res.status(404).json({
          success: false,
          message: 'Debt record not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Debt record updated successfully',
        data: debt
      });
    } catch (error) {
      console.error('❌ Update debt error:', error); // ← ADDED: Logging
      res.status(400).json({
        success: false,
        message: 'Error updating debt record',
        error: error.message
      });
    }
  },

  // Delete debt record
  deleteDebt: async (req, res) => {
    try {
      await connectDB(); // Ensure DB is connected before proceeding
      const Debt = require('../models/debtModel'); // Your existing model
      const debt = await Debt.findOneAndDelete({ 
        _id: req.params.id, 
        user: req.user._id  // ← FIXED: Consistent _id
      });

      if (!debt) {
        return res.status(404).json({
          success: false,
          message: 'Debt record not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Debt record deleted successfully'
      });
    } catch (error) {
      console.error('❌ Delete debt error:', error); // ← ADDED: Logging
      res.status(500).json({
        success: false,
        message: 'Error deleting debt record',
        error: error.message
      });
    }
  }
};

module.exports = debtController;


