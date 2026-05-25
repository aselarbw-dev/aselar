const mongoose = require('mongoose');

const dailySellerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assumes your User model
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD for easy querying
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now, // Auto-set on create
    required: true
  }
}, {
  timestamps: true // Adds createdAt/updatedAt for extra auditing
});

// Indexes for efficient queries (per user/date, global date)
dailySellerSchema.index({ user: 1, date: 1, timestamp: -1 });
dailySellerSchema.index({ date: 1, timestamp: -1 });

module.exports = mongoose.model('DailySeller', dailySellerSchema);