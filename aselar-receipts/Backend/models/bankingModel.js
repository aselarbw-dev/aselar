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
    required: [true, 'Account number is required'],
    trim: true,
    // NOTE: no `unique: true` here anymore — uniqueness is now enforced
    // per-user via the compound index below, not globally across all users.
  },
  branchName: {
    type: String,
    default: '',
  },
  swiftCode: {
    type: String,
    default: '',
  },
  accountType: {
    type: String,
    default: 'checking',
  },
  isActive: {
    type: Boolean,
    default: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, // banking details must always belong to a user
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Static method to find by account number scoped to a user (safer than global lookup)
bankingSchema.statics.findByAccountNumberForUser = function(userId, accountNumber) {
  return this.findOne({ user: userId, accountNumber });
};

// Virtual for display name
bankingSchema.virtual('displayName').get(function() {
  return `${this.accountName || 'N/A'} - ${this.bankName || 'N/A'}`;
});

bankingSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

// Indexes for performance
bankingSchema.index({ user: 1 });
bankingSchema.index({ createdAt: -1 });

// KEY FIX: uniqueness is scoped to (user, accountNumber), not accountNumber alone.
// This lets different users each have valid account numbers (even overlapping
// digit-for-digit) without colliding, while still preventing one user from
// saving a duplicate of their own account number twice.
bankingSchema.index({ user: 1, accountNumber: 1 }, { unique: true });

const Banking = mongoose.model('Banking', bankingSchema);

module.exports = Banking;