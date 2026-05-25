const mongoose = require('mongoose');

const blacklistedTokenSchema = mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '1d' // Automatically delete after 7 days (adjust based on your JWT expiration)
  }
});

module.exports = mongoose.model('BlacklistedToken', blacklistedTokenSchema);