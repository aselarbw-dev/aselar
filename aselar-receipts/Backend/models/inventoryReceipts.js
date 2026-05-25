// models/Receipt.js
const mongoose = require('mongoose');

// Define the schema for receipt items
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
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'refunded'],
    default: 'completed'
  }
});

// Pre-save hook to generate a unique receipt number
/*
ReceiptSchema.pre('save', async function(next) {
  try {
    if (this.isNew) {
      // Generate a receipt number using current date and random number
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = ('0' + (date.getMonth() + 1)).slice(-2);
      const day = ('0' + date.getDate()).slice(-2);
      
      // Get the count of receipts for today to create a sequential number
      const todayStart = new Date(date.setHours(0, 0, 0, 0));
      const todayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const receiptCount = await mongoose.models.Receipt.countDocuments({
        createdAt: { $gte: todayStart, $lte: todayEnd }
      });

      // Format: YY/MM/DD-XXXX where XXXX is a sequential number
      const sequentialNumber = ('0000' + (receiptCount + 1)).slice(-4);
      this.receiptNumber = `${year}${month}${day}-${sequentialNumber}`;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Create a virtual property for formatted date
ReceiptSchema.virtual('formattedDate').get(function() {
  const date = this.createdAt;
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
});
*/
// Export the Receipt model
const NewReceipt = mongoose.model('NewReceipt', ReceiptSchema);
module.exports = NewReceipt;