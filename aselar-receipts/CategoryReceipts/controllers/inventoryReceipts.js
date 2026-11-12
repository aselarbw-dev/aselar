const {mongoose,connectDB} = require('../../Shared/config');

// NEW: payment methods accepted for sales, lay-buy deposits and installments
// (matches the POS payment modal, minus 'Lay-buy' itself). Pay2Cell and Ewallet added.
const LAYBUY_PAYMENT_METHODS = ['Cash', 'Swiped', 'Orange Money', 'MyZaka', 'Pay2Cell', 'Ewallet', 'Other'];
const normalizeLaybuyMethod = (m) => {
  const clean = typeof m === 'string' ? m.trim().toLowerCase() : '';
  return LAYBUY_PAYMENT_METHODS.find((x) => x.toLowerCase() === clean) || null;
};
// NEW: a normal sale can be split across at most this many payments
const MAX_PAYMENT_LINES = 5;
// NEW: tidy a customer detail (trim, collapse spaces, cap the length)
const cleanText = (value, max) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
// NEW: escape user text before using it inside a regex search
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const submitReceipt = async (req, res) => {
  try {
    const { items, subtotal, vat, discount,vatEnabled, discountedBy, total, cashPaid, change,customer, paymentMethod, payments, saleType, dueDate, depositMethod,seller } = req.body;

    // Validate the request
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Receipt must contain at least one item' });
    }

    if (typeof subtotal !== 'number' || subtotal < 0) {
      return res.status(400).json({ success: false, message: 'Subtotal must be a non-negative number' });
    }

       // NEW: VAT is only validated when it applies
    const vatApplied = vatEnabled !== false;
    if (vatApplied && (typeof vat !== 'number' || vat < 0)) {
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

    // NEW: Lay-buy specific validation
    const isLaybuy = saleType === 'laybuy';
        let cleanCustomer = null; // NEW
    if (isLaybuy) {
      if (!dueDate || isNaN(new Date(dueDate).getTime())) {
        return res.status(400).json({ success: false, message: 'A valid due date is required for lay-buy sales' });
      }

      const dueDateObj = new Date(dueDate);
      if (dueDateObj <= new Date()) {
        return res.status(400).json({ success: false, message: 'Lay-buy due date must be in the future' });
      }

      if (cashPaid <= 0) {
        return res.status(400).json({ success: false, message: 'A deposit is required to start a lay-buy sale' });
      }

      if (cashPaid >= total) {
        return res.status(400).json({ success: false, message: 'Deposit cannot cover the full total — use a normal sale instead' });
      }
            // NEW: the deposit must say how it was paid
      if (!normalizeLaybuyMethod(depositMethod)) {
        return res.status(400).json({ success: false, message: 'Choose how the deposit was paid (Cash, Swiped, Orange Money, MyZaka, Pay2Cell, Ewallet or Other)' });
      }
            // NEW: the customer must be identifiable by at least one of name, ID/passport or phone.
      // Stored in a search-friendly form: ID/passport upper-case without spaces or dashes,
      // phone as digits only. These details are never returned by any endpoint.
      const customerName = cleanText(customer?.name, 100);
      const customerId = cleanText(customer?.idNumber, 40).toUpperCase().replace(/[\s-]/g, '');
      const customerPhone = cleanText(customer?.phone, 30).replace(/\D/g, '');

      if (!customerName && !customerId && !customerPhone) {
        return res.status(400).json({
          success: false,
          message: "Enter the customer's name, ID/passport number or phone number for this lay-buy"
        });
      }
      if (customerPhone && customerPhone.length < 7) {
        return res.status(400).json({ success: false, message: 'The phone number looks too short' });
      }

      cleanCustomer = { name: customerName, idNumber: customerId, phone: customerPhone };
      if (customerPhone && customerPhone.replace(/\D/g, '').length < 7) {
        return res.status(400).json({ success: false, message: 'The phone number looks too short' });
      }

      cleanCustomer = { name: customerName, idNumber: customerId, phone: customerPhone };
    }

    // NEW: normal sales must be paid in full. The payment can be split across methods
    // (e.g. card for part, cash for the balance). Everything is compared in cents so
    // floating-point noise never rejects a correct payment.
    //   payments  = what each method was APPLIED to the sale (must add up to the total)
    //   cashPaid  = everything the customer handed over (can exceed the total only when cash gives change)
    let cleanPayments = [];
    if (!isLaybuy) {
      const totalCents = Math.round(total * 100);
      const tenderedCents = Math.round(cashPaid * 100);

      if (tenderedCents < totalCents) {
        return res.status(400).json({
          success: false,
          message: `Payment is short by BWP ${((totalCents - tenderedCents) / 100).toFixed(2)}. Collect the balance before composing the receipt.`
        });
      }

      if (Array.isArray(payments) && payments.length > 0) {
        if (payments.length > MAX_PAYMENT_LINES) {
          return res.status(400).json({ success: false, message: `A sale can be split across at most ${MAX_PAYMENT_LINES} payments` });
        }

        let appliedCents = 0;
        for (const p of payments) {
          const method = normalizeLaybuyMethod(p?.method);
          const amountCents = Math.round(Number(p?.amount) * 100);
          if (!method) {
            return res.status(400).json({ success: false, message: 'Each payment must use a valid payment method' });
          }
          if (!Number.isFinite(amountCents) || amountCents <= 0) {
            return res.status(400).json({ success: false, message: 'Each payment amount must be greater than zero' });
          }
          appliedCents += amountCents;
          cleanPayments.push({ method, amount: amountCents / 100 });
        }

        if (appliedCents !== totalCents) {
          return res.status(400).json({ success: false, message: 'The payments must add up to the receipt total' });
        }
      } else {
        // Older clients (or a single-method sale): one method covers the whole total
        const method = normalizeLaybuyMethod(paymentMethod) || (paymentMethod ? 'Other' : 'Cash');
        cleanPayments = [{ method, amount: totalCents / 100 }];
      }

      // Only cash can give change: a card / mobile-money payment can't hand money back
      const hasCash = cleanPayments.some((p) => p.method === 'Cash');
      if (tenderedCents > totalCents && !hasCash) {
        return res.status(400).json({
          success: false,
          message: 'Only cash can give change. For card or mobile money, the amount paid must equal the total.'
        });
      }
    }

    // NEW: server-side discount lock — the UI toggle alone isn't enough
    const hasDiscount =
      discount > 0 ||
      items.some((item) => Number(item.discount) > 0);

    if (hasDiscount) {
      await connectDB();
      const discountAllowed = await isDiscountEnabledFor(req.user._id);
      if (!discountAllowed) {
        return res.status(403).json({
          success: false,
          message: 'Discounts are turned off. Ask the owner to enable them.'
        });
      }
    }
    // Calculate total price for each item
    const processedItems = items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      discount: item.discount || 0,
      // NEW: only keep the seller name when this item actually has a discount
      discountBy: Number(item.discount) > 0 && typeof item.discountBy === 'string' ? item.discountBy.trim() : '',
      totalPrice: (item.quantity * item.price) - (item.discount || 0)
    }));

    // NEW: clean list of sellers who gave a discount (empty when the receipt has no discount)
    const cleanDiscountedBy = hasDiscount && Array.isArray(discountedBy)
      ? Array.from(
          new Set(
            discountedBy
              .filter(name => typeof name === 'string' && name.trim())
              .map(name => name.trim())
          )
        )
      : [];

    // Create a new receipt
    await connectDB();
    const NewReceipt = require('../models/inventoryReceipts');

    const receiptPayload = {
      items: processedItems,
      subtotal,
     vat: vatApplied ? vat : 0,   // CHANGED
      vatEnabled: vatApplied,      // NEW
      discount,
      discountedBy: cleanDiscountedBy, // NEW
      total,
      cashPaid,
      change,
      // CHANGED: for a normal sale this is the first payment's method (older code reads this field)
      paymentMethod: cleanPayments.length > 0 ? cleanPayments[0].method : (paymentMethod || 'Cash'),
      payments: cleanPayments, // NEW: empty for lay-buys, which keep their own ledger
      seller: typeof seller === 'string' ? seller.trim().slice(0, 100) : '', // NEW
      createdBy: req.user._id,
      user: req.user._id.toString() // Assuming user is authenticated and available in req.user
    };

    // NEW: Attach lay-buy details only when applicable — normal sales are untouched
    if (isLaybuy) {
      receiptPayload.saleType = 'laybuy';
           receiptPayload.laybuy = {
        dueDate: new Date(dueDate),
        balanceRemaining: total - cashPaid, // recomputed again in the model's pre-save hook
        status: 'active',
        // NEW: the deposit is the first entry in the payment ledger
        payments: [{
          amount: cashPaid,
          method: normalizeLaybuyMethod(depositMethod),
          paidAt: new Date(),
          recordedBy: req.user._id
        }],
                customer: cleanCustomer // NEW
      };
    }

    const receipt = new NewReceipt(receiptPayload);

    // Save the receipt
    await receipt.save();

    return res.status(201).json({
      success: true,
      data: {
      //  receiptNumber: receipt.receiptNumber,
        total: receipt.total,
        change: receipt.change,
        payments: receipt.payments, // NEW
        saleType: receipt.saleType,
        laybuy: receipt.laybuy || null
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
     await connectDB();
    const NewReceipt = require('../models/inventoryReceipts');
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
 await connectDB();
    const NewReceipt = require('../models/inventoryReceipts');
    const receipt = await NewReceipt.findById(id);

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    // NEW: what earlier returns on this receipt already sent back (name -> quantity),
    // so the return screen only offers what is still left to return
    const returnRecords = await ReturnRecord.find(
      { originalReceiptId: id },
      'returnedItems.name returnedItems.quantity'
    ).lean();
    const returnedByName = new Map();
    returnRecords.forEach((rec) => {
      (rec.returnedItems || []).forEach((item) => {
        returnedByName.set(item.name, (returnedByName.get(item.name) || 0) + item.quantity);
      });
    });
    const returned = Array.from(returnedByName, ([name, quantity]) => ({ name, quantity }));

    return res.status(200).json({
      success: true,
      data: { ...receipt.toObject(), returned }
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

    // Filter by date range if provided. CHANGED: either end can be given on its own,
    // and an unreadable date is ignored instead of breaking the query.
    const filterOptions = {};
    const createdAtRange = {};
    const rangeStart = req.query.startDate ? new Date(req.query.startDate) : null;
    const rangeEnd = req.query.endDate ? new Date(req.query.endDate) : null;
    if (rangeStart && !isNaN(rangeStart.getTime())) createdAtRange.$gte = rangeStart;
    if (rangeEnd && !isNaN(rangeEnd.getTime())) createdAtRange.$lte = rangeEnd;
    if (Object.keys(createdAtRange).length > 0) {
      filterOptions.createdAt = createdAtRange;
    }

    // NEW: ?item=<text> finds receipts that contain an item whose name matches (any letter case)
    if (typeof req.query.item === 'string' && req.query.item.trim()) {
      const itemTerm = req.query.item.trim().replace(/\s+/g, ' ').slice(0, 100);
      filterOptions['items.name'] = { $regex: escapeRegex(itemTerm), $options: 'i' };
    }

    // Filter by user if role is not admin (admins can see all receipts)
    if (req.user.role !== 'admin') {
      filterOptions.createdBy = req.user._id;
    }
    await connectDB();
    const NewReceipt = require('../models/inventoryReceipts');

    // CHANGED: hide only receipts whose items have ALL been returned. A receipt with a
    // partial return stays in the list so the remaining items can still be returned.
    const returnedReceiptIds = await getFullyReturnedReceiptIds();
    if (returnedReceiptIds.length > 0) {
      filterOptions._id = { $nin: returnedReceiptIds };
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
      total: totalReceipts, // NEW: how many receipts match the filters, across all pages
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
     await connectDB();
    const NewReceipt = require('../models/inventoryReceipts');
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
const NewReceipt = require('../models/inventoryReceipts.js');
const ReturnRecord = require('../models/returnRecord.js'); // adjust path if returnRecord.js lives in a different service

// NEW: a receipt is "fully returned" once every item on it has been sent back.
// A receipt that is only partly returned stays visible, so the items still with the
// customer can be returned later.
const getFullyReturnedReceiptIds = async () => {
  const records = await ReturnRecord.find({}, 'originalReceiptId returnedItems.name returnedItems.quantity').lean();
  if (records.length === 0) return [];

  // receiptId -> (item name -> quantity returned so far)
  const returnedByReceipt = new Map();
  records.forEach((rec) => {
    const key = String(rec.originalReceiptId);
    if (!returnedByReceipt.has(key)) returnedByReceipt.set(key, new Map());
    const perName = returnedByReceipt.get(key);
    (rec.returnedItems || []).forEach((item) => {
      perName.set(item.name, (perName.get(item.name) || 0) + item.quantity);
    });
  });

  const receipts = await NewReceipt.find(
    { _id: { $in: Array.from(returnedByReceipt.keys()) } },
    'items.name items.quantity'
  ).lean();

  const fullyReturned = [];
  receipts.forEach((r) => {
    const returned = returnedByReceipt.get(String(r._id)) || new Map();
    const sold = new Map();
    (r.items || []).forEach((item) => {
      sold.set(item.name, (sold.get(item.name) || 0) + item.quantity);
    });
    const everythingBack = Array.from(sold.entries()).every(
      ([name, qty]) => (returned.get(name) || 0) + 1e-9 >= qty
    );
    if (everythingBack) fullyReturned.push(r._id);
  });

  return fullyReturned;
};

const getReceiptsSummary = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    await connectDB();

    const filterOptions = {};
    if (req.user.role !== 'admin') {
      filterOptions.createdBy = req.user._id;
    }

    const [receiptTotals, refundTotals] = await Promise.all([
      NewReceipt.aggregate([
        { $match: filterOptions },
        { $group: { _id: null, grossTotal: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      ReturnRecord.aggregate([
        { $match: { user: req.user._id } },
        { $group: { _id: null, totalRefunded: { $sum: '$refundAmount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const grossTotal = receiptTotals[0]?.grossTotal || 0;
    const totalRefunded = refundTotals[0]?.totalRefunded || 0;
    const netTotal = grossTotal - totalRefunded;

    res.status(200).json({
      success: true,
      grossTotal,
      totalRefunded,
      netTotal,
      receiptCount: receiptTotals[0]?.count || 0,
      returnCount: refundTotals[0]?.count || 0,
    });
  } catch (error) {
    console.error('Get receipts summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to get summary' });
  }
};
const deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid receipt ID' });
    }

    await connectDB();
    const NewReceipt = require('../models/inventoryReceipts.js');

    const filterOptions = { _id: id };
    // Non-admins can only delete their own receipts
    if (req.user.role !== 'admin') {
      filterOptions.createdBy = req.user._id;
    }

    const receipt = await NewReceipt.findOneAndDelete(filterOptions);

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Receipt deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};

// NEW: List open lay-buys, soonest due date first — powers a "Lay-buys" view on the dashboard
// Optional ?customer=<text> finds lay-buys by customer name, ID/passport number or phone.
const getLaybuys = async (req, res) => {
  try {
    await connectDB();
    const NewReceipt = require('../models/inventoryReceipts');

    const filterOptions = { saleType: 'laybuy' };
    if (req.user.role !== 'admin') {
      filterOptions.createdBy = req.user._id;
    }
    if (req.query.status) {
      filterOptions['laybuy.status'] = req.query.status; // e.g. ?status=active
    }

    // NEW: find lay-buys by who they belong to. The details are matched here on the
    // server and are never sent back to the browser.
    if (typeof req.query.customer === 'string' && req.query.customer.trim()) {
      const term = req.query.customer.trim().replace(/\s+/g, ' ');

      // too short to be a meaningful search
      if (term.length < 3) {
        return res.status(200).json({ success: true, count: 0, totalOutstanding: 0, data: [] });
      }

      // personal data: only ever search within this account's own lay-buys, even for role admin
      filterOptions.createdBy = req.user._id;

      const idTerm = term.toUpperCase().replace(/[\s-]/g, '');
      const digits = term.replace(/\D/g, '');
      const phoneTerm = digits.length > 8 ? digits.slice(-8) : digits; // ignores a country code typed in front

      const matchers = [
        { 'laybuy.customer.name': { $regex: escapeRegex(term), $options: 'i' } },
        { 'laybuy.customer.idNumber': { $regex: escapeRegex(idTerm) } },
      ];
      if (phoneTerm.length >= 4) {
        matchers.push({ 'laybuy.customer.phone': { $regex: escapeRegex(phoneTerm) } });
      }
      filterOptions.$or = matchers;
    }

    const laybuys = await NewReceipt.find(filterOptions)
     .sort({ 'laybuy.dueDate': 1 })
  .populate('createdBy', 'name');

    const totalOutstanding = laybuys.reduce((sum, r) => sum + (r.laybuy?.balanceRemaining || 0), 0);

    return res.status(200).json({
      success: true,
      count: laybuys.length,
      totalOutstanding,
      data: laybuys
    });
  } catch (error) {
    console.error('Error retrieving lay-buys:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};
// NEW: Record an additional payment against an open lay-buy
// NEW: Record an additional payment against an open lay-buy (now with payment method)
const addLaybuyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid receipt ID' });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be a positive number' });
    }

    // NEW: every installment must say how it was paid
    const cleanMethod = normalizeLaybuyMethod(method);
    if (!cleanMethod) {
      return res.status(400).json({
        success: false,
        message: 'Choose how the customer paid (Cash, Swiped, Orange Money, MyZaka, Pay2Cell, Ewallet or Other)'
      });
    }

    await connectDB();
    const NewReceipt = require('../models/inventoryReceipts');

    const receipt = await NewReceipt.findById(id);

    if (!receipt || receipt.saleType !== 'laybuy') {
      return res.status(404).json({ success: false, message: 'Lay-buy record not found' });
    }

    if (receipt.laybuy.status === 'completed' || receipt.laybuy.status === 'cancelled') {
      return res.status(400).json({ success: false, message: `This lay-buy is already ${receipt.laybuy.status}` });
    }
    // NEW: reject overpayments so a method's totals can never be inflated.
    // Work in cents to avoid floating-point surprises (e.g. 0.1 + 0.2).
    const balanceCents = Math.round(receipt.laybuy.balanceRemaining * 100);
    const amountCents = Math.round(amount * 100);
    if (amountCents > balanceCents) {
      return res.status(400).json({
        success: false,
        message: `Payment exceeds the remaining balance of BWP ${receipt.laybuy.balanceRemaining.toFixed(2)}`
      });
    }
    receipt.cashPaid += amount;
    receipt.laybuy.balanceRemaining = Math.max(receipt.total - receipt.cashPaid, 0);

    // NEW: log this installment with its payment method
    receipt.laybuy.payments.push({
      amount,
      method: cleanMethod,
      paidAt: new Date(),
      recordedBy: req.user._id
    });

    if (receipt.laybuy.balanceRemaining === 0) {
      receipt.laybuy.status = 'completed';
    }

    await receipt.save();

    return res.status(200).json({
      success: true,
      data: receipt,
      message: receipt.laybuy.status === 'completed'
        ? 'Lay-buy fully paid off'
        : 'Payment recorded'
    });
  } catch (error) {
    console.error('Error recording lay-buy payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
};
// NEW: reads the discount setting for an account — missing document means OFF
const isDiscountEnabledFor = async (userId) => {
  const DiscountSetting = require('../models/discountSetting');
  const setting = await DiscountSetting.findOne({ user: userId });
  return !!(setting && setting.enabled);
};

// NEW: GET /discount-setting
const getDiscountSetting = async (req, res) => {
  try {
    await connectDB();
    const enabled = await isDiscountEnabledFor(req.user._id);
    return res.status(200).json({ success: true, enabled });
  } catch (error) {
    console.error('Error reading discount setting:', error);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// NEW: PUT /discount-setting  { enabled: true|false }
const setDiscountSetting = async (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: '"enabled" must be true or false' });
    }

    await connectDB();
    const DiscountSetting = require('../models/discountSetting');

    const setting = await DiscountSetting.findOneAndUpdate(
      { user: req.user._id },
      { enabled, updatedAt: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ success: true, enabled: setting.enabled });
  } catch (error) {
    console.error('Error saving discount setting:', error);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// NEW: GET /discount-records — receipts that had a discount, newest first, with the seller who gave it
const getDiscountRecords = async (req, res) => {
  try {
    await connectDB();
    const NewReceipt = require('../models/inventoryReceipts');

    // A receipt counts if the whole-receipt discount or any item discount is above zero
    const filterOptions = {
      $or: [
        { discount: { $gt: 0 } },
        { 'items.discount': { $gt: 0 } }
      ]
    };

    // Non-admins only see their own account's receipts
    if (req.user.role !== 'admin') {
      filterOptions.createdBy = req.user._id;
    }

    // Latest 100 by default, never more than 200
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);

    const records = await NewReceipt.find(filterOptions)
      .select('receiptsNumber createdAt discount discountedBy items.name items.discount items.discountBy')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('Error retrieving discount records:', error);
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
  getReceiptsSummary,
  deleteReceipt,
  openCashDrawer,
  getSalesSummary,
  getLaybuys,
  addLaybuyPayment,
  getDiscountSetting,
  setDiscountSetting,
  getDiscountRecords // NEW
};