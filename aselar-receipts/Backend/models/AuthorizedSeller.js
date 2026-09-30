const mongoose = require('mongoose');

const authorizedSellerSchema = new mongoose.Schema(
  {
    // The business account that owns this seller list
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Original name exactly as typed by the admin (used for display)
    name: { type: String, required: true, trim: true },
    // Lowercased, whitespace-normalised copy used for matching and uniqueness
    nameKey: { type: String, required: true },
    active: { type: Boolean, default: true },
    // True for the very first seller registered on the account. Can never be removed.
    isOwner: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One name per owner, case-insensitive
authorizedSellerSchema.index({ owner: 1, nameKey: 1 }, { unique: true });

module.exports = mongoose.model('AuthorizedSeller', authorizedSellerSchema);