const { mongoose } = require('../../Shared/config');
const { connectDB } = require('../../Shared/config');
const asyncHandler = require("express-async-handler")

// parseAmount unchanged
const parseAmount = (totalSumStr) => {
  if (!totalSumStr) return 0;
  return parseFloat(totalSumStr.toString().replace(/[^0-9.-]+/g, '')) || 0;
};

// deriveInvoiceFields – prioritize populated receiver
const deriveInvoiceFields = (inv) => {
  const status = inv.status || 'pending';

  // Log populated receiver
  console.log(`🔍 Deriving for inv ${inv._id}: raw receiver = ${JSON.stringify(inv.receiver)}`); // Debug

  let customerName = inv.receiver?.companyName || 'No Company Assigned';

  let dueDate = inv.dueDate;
  if (!dueDate && inv.createdAt) {
    const created = new Date(inv.createdAt);
    dueDate = new Date(created.getTime() + (30 * 24 * 60 * 60 * 1000));
  }
  if (!dueDate) dueDate = new Date();

  const parsedAddition = parseAmount(inv.addition);
  const parsedVat = parseAmount(inv.vat);

  const derived = { 
    ...inv, 
    status, 
    customerName, 
    dueDate: dueDate.toISOString(),
    parsedAddition, 
    parsedVat 
  };
  console.log(`✅ Derived ${inv._id}: customerName="${derived.customerName}", phone="${inv.receiver?.phone || 'N/A'}"`); // Debug
  return derived;
};

// getAgingBucket & isOutstanding unchanged
const getAgingBucket = (dueDate) => {
  const now = new Date('2025-11-29'); // Updated to current date
  const daysPastDue = Math.floor((now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
  if (daysPastDue <= 0) return 'Current (0-30)';
  if (daysPastDue <= 30) return '1-30';
  if (daysPastDue <= 60) return '31-60';
  if (daysPastDue <= 90) return '61-90';
  return 'Over 90';
};

const isOutstanding = (dueDate, status) => {
  const now = new Date('2025-11-29');
  const daysPastDue = Math.floor((now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
  return status !== 'paid' && daysPastDue > 30;
};

// Original invoice create (unchanged)
const invoice = asyncHandler(async (req, res) => {
  console.log('👤 User from middleware:', req.user ? `ID: ${req.user._id}` : 'MISSING');
  console.log('📊 DB Connection State:', mongoose.connection.readyState);

  const { fields } = req.body;

  try {
    await connectDB();

    const Invoice = require("../models/invoiceModel.js");

    const subtotal = fields.reduce((sum, item) => sum + (item.field3 * item.field4), 0);
    const vatAmount = subtotal * 0.14;
    const total = subtotal + vatAmount;

    const newInvoice = await Invoice.create({
      fields,
      addition: subtotal.toFixed(2),
      vat: vatAmount.toFixed(2),
      totalSum: total.toFixed(2),
      user: req.user._id
    });

    res.status(201).json(newInvoice);
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(400).json({ message: error.message });
  }
});

// Original getInvoice & getAllInvoices (unchanged)
const getInvoice = asyncHandler(async (req, res) => {
  console.log('👤 User from middleware:', req.user ? `ID: ${req.user._id}` : 'MISSING');
  try {
    await connectDB();

    const Invoice = require("../models/invoiceModel.js");

    const recentInvoice = await Invoice.findOne({ user: req.user._id }).sort({ createdAt: -1 });

    if (!recentInvoice) {
      return res.status(404).json({ message: "No invoices found" });
    }

    res.status(200).json(recentInvoice);
  } catch (error) {
    console.error("Error fetching the latest invoice:", error);
    res.status(500).json({ message: "Error fetching the latest invoice" });
  }
});

const getAllInvoices = asyncHandler(async (req, res) => {
  console.log('👤 User from middleware:', req.user ? `ID: ${req.user._id}` : 'MISSING');
  try {
    await connectDB();

    const Invoice = require("../models/invoiceModel.js");

    const invoices = await Invoice.find({ user: req.user._id }).sort({ createdAt: -1 });

    if (!invoices.length) {
      return res.status(404).json({ message: "No invoices found" });
    }

    res.status(200).json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ message: "Error fetching invoices" });
  }
});

// Updated getAgingReport – populate + debug logs
const getAgingReport = asyncHandler(async (req, res) => {
  console.log('👤 User from middleware:', req.user ? `ID: ${req.user._id}` : 'MISSING');
  try {
    await connectDB();

    const Invoice = require("../models/invoiceModel.js");
    
    // Fetch with populate
    const invoices = await Invoice.find({ user: req.user._id })
      .populate('receiver', 'companyName phone')
      .select('receiver totalSum dueDate status _id invoiceNumber addition vat')
      .lean();

    console.log(`📋 Fetched ${invoices.length} raw invoices`); // Debug
    invoices.forEach((inv, i) => {
      console.log(`Inv ${i+1}/${invoices.length} (${inv._id}): receiver populated? ${!!inv.receiver}`); // Debug
      if (inv.receiver) {
        console.log(`   → Company: ${inv.receiver.companyName}, Phone: ${inv.receiver.phone}`); // Debug
      }
    });

    if (invoices.length === 0) {
      return res.json({ 
        report: [], 
        summary: { grandTotal: 0, bucketTotals: {} }, 
        currentDate: '2025-11-29',
        note: 'No invoices. Create one!' 
      });
    }

    const processedInvoices = invoices
      .map(deriveInvoiceFields)
      .filter(derived => derived.status !== 'paid' && parseAmount(derived.totalSum) > 0);

    console.log(`🔄 ${processedInvoices.length} valid unpaid invoices`); // Debug

    if (processedInvoices.length === 0) {
      return res.json({ 
        report: [], 
        summary: { grandTotal: 0, bucketTotals: {} }, 
        currentDate: '2025-11-29',
        note: 'No unpaid invoices.' 
      });
    }

    // Group by customerName (from populated receiver)
    const report = processedInvoices.reduce((acc, inv) => {
      const amount = parseAmount(inv.totalSum);
      const bucket = getAgingBucket(inv.dueDate);
      const customer = inv.customerName; // Derived from receiver.companyName
      if (!acc[customer]) {
        acc[customer] = {
          customerName: customer,
          totalOutstanding: 0,
          buckets: {
            'Current (0-30)': 0,
            '1-30': 0,
            '31-60': 0,
            '61-90': 0,
            'Over 90': 0,
          },
          invoices: [],
        };
      }
      acc[customer].buckets[bucket] += amount;
      acc[customer].totalOutstanding += amount;
      acc[customer].invoices.push({ 
        ...inv, 
        bucket, 
        isOutstanding: isOutstanding(inv.dueDate, inv.status),
        parsedAmount: amount,
        parsedAddition: inv.parsedAddition,
        parsedVat: inv.parsedVat,
        receiverCompany: inv.receiver?.companyName || 'N/A',
        receiverPhone: inv.receiver?.phone || 'N/A'
      });
      return acc;
    }, {});

    const reportArray = Object.values(report);

    const grandTotal = reportArray.reduce((sum, cust) => sum + cust.totalOutstanding, 0);
    const bucketTotals = reportArray.reduce((acc, cust) => {
      Object.keys(cust.buckets).forEach(bucket => {
        acc[bucket] = (acc[bucket] || 0) + cust.buckets[bucket];
      });
      return acc;
    }, {});

    res.json({
      report: reportArray,
      summary: { grandTotal, bucketTotals },
      currentDate: '2025-11-29',
      note: `Loaded ${processedInvoices.length} unpaid. Check server logs for populate debug.`
    });
  } catch (error) {
    console.error('Aging report error:', error);
    res.status(500).json({ error: 'Failed to fetch aging report' });
  }
});

// Original markAsPaid (unchanged)
const markAsPaid = asyncHandler(async (req, res) => {
  console.log('👤 User from middleware:', req.user ? `ID: ${req.user._id}` : 'MISSING');
  try {
    await connectDB();

    const Invoice = require("../models/invoiceModel.js");
    const { id } = req.params;
    const invoice = await Invoice.findOne({ _id: id, user: req.user._id });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found or access denied' });
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      { 
        status: 'paid', 
        paidDate: new Date() 
      },
      { new: true }
    ).select('totalSum status paidDate invoiceNumber');

    res.json({ message: 'Invoice marked as paid', invoice: updatedInvoice });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Delete invoice (copied and adapted from quotes)
const deleteInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log('🗑️ Delete request started');
    console.log('📋 Invoice ID:', id);
    console.log('👤 User from middleware:', req.user ? `ID: ${req.user._id}` : 'MISSING');
  
    await connectDB(); // Ensure database connection
    const Invoice = require("../models/invoiceModel.js");
    
    // Find the invoice first to check if it exists and belongs to the user
    const invoiceToDelete = await Invoice.findById(id);
    
    if (!invoiceToDelete) {
      console.log('❌ Invoice not found');
      return res.status(404).json({ message: "Invoice not found" });
    }
  
    console.log('📋 Found invoice user:', invoiceToDelete.user);
    console.log('🔐 Current user:', req.user._id);
  
    // Check if the invoice belongs to the current user
    if (invoiceToDelete.user && req.user && invoiceToDelete.user.toString() !== req.user._id.toString()) {
      console.log('🚫 Authorization failed - user mismatch');
      return res.status(403).json({ message: "Not authorized to delete this invoice" });
    }
  
    // Delete the invoice
    await Invoice.findByIdAndDelete(id);
    
    console.log('✅ Invoice deleted successfully');
    res.status(200).json({ 
      message: "Invoice deleted successfully",
      deletedInvoiceId: id 
    });
  } catch (error) {
    console.error("❌ Error deleting invoice:", error);
    res.status(500).json({ message: "Error deleting invoice", error: error.message });
  }
});

module.exports = { invoice, getAllInvoices, getInvoice, markAsPaid, getAgingReport, deleteInvoice };