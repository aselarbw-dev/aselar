// models/Receipt.js
const { mongoose } = require("../../Shared/config");
const crypto = require('crypto');

// Define the schema for receipt items (removed erroneous receiptsNumber from here)
const ReceiptItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  _id: false // Optional: Prevent Mongoose from adding _id to subdocs if not needed
});

// NEW: Lay-buy details, only populated when saleType === 'laybuy'
const LaybuySchema = new mongoose.Schema({
  dueDate: {
    type: Date,
    required: true
  },
  balanceRemaining: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'overdue', 'cancelled'],
    default: 'active'
  },
  reminderSentAt: {
    type: Date,
    default: null
  },
  overdueNoticeSentAt: {
    type: Date,
    default: null
  }
}, {
  _id: false
});

// Define the schema for receipts
const ReceiptSchema = new mongoose.Schema({
  items: [ReceiptItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  vat: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  cashPaid: {
    type: Number,
    required: true,
    min: 0
  },
  change: {
    type: Number,
    required: true
  },
  // NEW: defaults to 'full' so every existing/normal sale is unaffected
  saleType: {
    type: String,
    enum: ['full', 'laybuy'],
    default: 'full'
  },
  // NEW: only present when saleType === 'laybuy'
  laybuy: {
    type: LaybuySchema,
    default: undefined
  },
  paymentMethod: {
    type: String,
    default: 'Cash'
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  receiptsNumber: {
    type: String,
    unique: true,
    required: false // Set to true after generation in hook
  },
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'refunded'],
    default: 'completed'
  }
});

// Pre-save hook to generate a unique receipt number (fixed comments, variable names, and error messages)
ReceiptSchema.pre('save', async function(next) {
  // Only generate for new documents that don't already have a receiptsNumber
  if (this.isNew && !this.receiptsNumber) {
    console.log('🔄 Generating receipt number...');
    
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      // Generate receipt number
      const receiptsNumber = `RC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      console.log(`🎲 Attempt ${attempts + 1}: Generated ${receiptsNumber}`);
      
      // Check if it already exists
      const existingReceipt = await this.constructor.findOne({ receiptsNumber });
      
      if (!existingReceipt) {
        this.receiptsNumber = receiptsNumber;
        isUnique = true;
        console.log(`✅ Receipt number set: ${receiptsNumber}`);
      } else {
        console.log(`🔄 ${receiptsNumber} already exists, retrying...`);
      }
      
      attempts++;
    }
    
    if (!isUnique) {
      console.error('❌ Failed to generate unique receipt number after 10 attempts');
      return next(new Error('Failed to generate unique receipt number'));
    }
  }
  
  // Ensure receiptsNumber is present before saving
  if (!this.receiptsNumber) {
    return next(new Error('Receipt number is required'));
  }
  
  next();
});

// Bonus: Additional pre-save hook to auto-calculate totals if items are provided (helps prevent inconsistencies)
ReceiptSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('items')) {
    // Recalculate item totals if needed (e.g., if price/quantity/discount changed)
    this.items.forEach(item => {
      if (!item.totalPrice || item.isModified('price') || item.isModified('quantity') || item.isModified('discount')) {
        item.totalPrice = (item.price * item.quantity) - item.discount;
      }
    });

    // Subtotal from items
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);

    // Apply overall discount if any
    const discountedSubtotal = this.subtotal - this.discount;

    // Total with VAT
    this.total = discountedSubtotal + this.vat;

    // Change calculation (assuming cashPaid is set)
    this.change = this.cashPaid - this.total;
  }
  next();
});

// NEW: For lay-buy sales, "change" is meaningless (deposit is usually less than total),
// so compute balanceRemaining instead and don't let a "negative change" slip through as-is.
ReceiptSchema.pre('save', function(next) {
  if (this.saleType === 'laybuy' && this.laybuy) {
    this.laybuy.balanceRemaining = Math.max(this.total - this.cashPaid, 0);
    // Lay-buy deposits aren't "change owed to the customer"
    this.change = 0;
  }
  next();
});

// Index for better performance on receiptsNumber queries
ReceiptSchema.index({ receiptsNumber: 1 });
// NEW: Index to make "which lay-buys are due soon" scans cheap
ReceiptSchema.index({ 'saleType': 1, 'laybuy.status': 1, 'laybuy.dueDate': 1 });

// Export the Receipt model (kept as NewReceipt per your original)
const NewReceipt = mongoose.model('NewReceipt', ReceiptSchema);
module.exports = NewReceipt;