// models/Banking.js
const mongoose = require('mongoose');

const bankingSchema = new mongoose.Schema({
  accountName: {
    type: String,
    default: '',
  },
  bankName: {
    type: String,
    default: '',
  },
  accountNumber: {
    type: String,
    default: '',
    unique: true,                    // Kept to prevent duplicate account numbers
    // No required, no regex, no length restrictions
  },
  branchName: {
    type: String,
    default: '',
  },
  swiftCode: {
    type: String,
    default: '',
    // No uppercase enforcement, no length or regex validation
  },
  accountType: {
    type: String,
    default: 'checking',
    // No strict enum - user can put anything (including empty)
  },
  isActive: {
    type: Boolean,
    default: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Required removed - more flexible now
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],   // Kept this for safety
    default: 'pending'
  }
}, {
  timestamps: true   // Automatically handles createdAt and updatedAt
});

// Removed getMaskedAccountNumber method (we now return real data)

// Static method to find by account number (still useful)
bankingSchema.statics.findByAccountNumber = function(accountNumber) {
  return this.findOne({ accountNumber });
};

// Virtual for display name (kept as it's useful)
bankingSchema.virtual('displayName').get(function() {
  return `${this.accountName || 'N/A'} - ${this.bankName || 'N/A'}`;
});

// Ensure virtuals are included and clean output
bankingSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

// Indexes for performance
bankingSchema.index({ accountNumber: 1 });
bankingSchema.index({ user: 1 });
bankingSchema.index({ createdAt: -1 });

const Banking = mongoose.model('Banking', bankingSchema);

module.exports = Banking;