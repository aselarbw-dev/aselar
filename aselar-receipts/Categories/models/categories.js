const { mongoose } = require("../../Shared/config");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: false },
  items: [
    {
      name: { type: String, required: true },
      costPrice: { type: Number, required: true },
        barcode: { type: String, default: '' },   // NEW
      sellingPrice: { type: Number, required: true },
      quantity: { type: Number, required: true, default: 0 },
      lowStock: { type: Boolean, default: false },
      unit: { type: String, default: '' },
      expiryDate: { type: String },  // NEW: ISO date string for expiry (optional) // New: for restock alerts
      soldQuantity: { type: Number, default: 0 }, // NEW: cumulative units sold, for reporting
      revenue: { type: Number, default: 0 },       // NEW: cumulative revenue from this item, for reporting
    },
  ],
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);