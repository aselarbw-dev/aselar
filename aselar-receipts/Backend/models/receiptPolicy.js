const mongoose = require('mongoose');

const receiptPolicySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clause: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000 // keeps it short enough to print on a receipt
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: true
});

// Latest clause per business
receiptPolicySchema.index({ user: 1, timestamp: -1 });

module.exports = mongoose.model('ReceiptPolicy', receiptPolicySchema);