const {mongoose} = require('../../Shared/config');
const {connectDB} = require('../../Shared/config');
// POST: Save a new payslip
const postPaySlip=( async (req, res) => {
     console.log('👤 User from middleware:', req.user ? `ID: ${req.user._id}` : 'MISSING');
        console.log('📊 DB Connection State:', mongoose.connection.readyState);
  try {
    const { employeeName, employeeId, basicSalary, vat, deductions, additions, balance } = req.body;
    await connectDB(); // Ensure DB is connected before proceeding
    const PaySlip = require('../models/payslipModel');
    const newPaySlip = new PaySlip({
      employeeName,
      employeeId,
      basicSalary,
      vat,
      deductions,
      additions,
      balance,
    user: req.user._id // Ensure user ID is included
    });

    const savedPaySlip = await newPaySlip.save();
    res.status(201).json(savedPaySlip);
  } catch (error) {
    res.status(500).json({ message: 'Error saving payslip', error: error.message });
  }
});

// GET: Fetch all payslips (admin/global)
const getPaySlips=(async (req, res) => {
  try {
    await connectDB(); // Ensure DB is connected before proceeding
    const PaySlip = require('../models/payslipModel');
    const paySlips = await PaySlip.find();
    res.status(200).json(paySlips);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payslips', error: error.message });
  }
});

// GET: Fetch user's all payslips (for dashboard/list)
const getAllPayslips = async (req, res) => {
  try {
    console.log('👤 User from middleware:', req.user ? `ID: ${req.user._id}` : 'MISSING');
    await connectDB(); // Ensure DB is connected before proceeding
    const PaySlip = require('../models/payslipModel');
    
    const payslips = await PaySlip.find({ user: req.user._id }).sort({ createdAt: -1 }); // User-scoped, newest first

    // Always return 200 with array (empty if none)
    res.status(200).json(payslips); // No 404, just empty array if !payslips.length
        
  } catch (error) {
    console.error("Error fetching payslips:", error);
    res.status(500).json({ message: "Error fetching payslips" });
  }
};

// latest
const getNewlatest=( async (req, res) => {
  try {
    await connectDB(); // Ensure DB is connected before proceeding
    const PaySlip = require('../models/payslipModel');
    const latestPaySlip = await PaySlip.findOne().sort({ _id: -1 }); // Sort by _id in descending order
    if (!latestPaySlip) {
      return res.status(404).json({ message: 'No payslips found' });
    }
    res.status(200).json(latestPaySlip);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching latest payslip', error: error.message });
  }
});

// Delete payslip (adapted from quotes/invoices/receipts)
const deletePayslip = async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log('🗑️ Delete request started');
    console.log('📋 Payslip ID:', id);
    console.log('👤 User from middleware:', req.user ? `ID: ${req.user._id}` : 'MISSING');
  
    await connectDB(); // Ensure database connection
    const PaySlip = require("../models/payslipModel");
    
    // Find the payslip first to check if it exists and belongs to the user
    const payslipToDelete = await PaySlip.findById(id);
    
    if (!payslipToDelete) {
      console.log('❌ Payslip not found');
      return res.status(404).json({ message: "Payslip not found" });
    }
  
    console.log('📋 Found payslip user:', payslipToDelete.user);
    console.log('🔐 Current user:', req.user._id);
  
    // Check if the payslip belongs to the current user
    if (payslipToDelete.user && req.user && payslipToDelete.user.toString() !== req.user._id.toString()) {
      console.log('🚫 Authorization failed - user mismatch');
      return res.status(403).json({ message: "Not authorized to delete this payslip" });
    }
  
    // Delete the payslip
    await PaySlip.findByIdAndDelete(id);
    
    console.log('✅ Payslip deleted successfully');
    res.status(200).json({ 
      message: "Payslip deleted successfully",
      deletedPayslipId: id 
    });
  } catch (error) {
    console.error("❌ Error deleting payslip:", error);
    res.status(500).json({ message: "Error deleting payslip", error: error.message });
  }
};

module.exports = {postPaySlip,getPaySlips,getAllPayslips,getNewlatest, deletePayslip};