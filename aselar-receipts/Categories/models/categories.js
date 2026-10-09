const { mongoose } = require("../../Shared/config");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: false },
  // NEW: optional shop-defined code for the whole category (e.g. "300" for all Go-slow flavours)
  customCode: { type: String, default: '', trim: true },
  items: [
    {
      name: { type: String, required: true },
      costPrice: { type: Number, required: true },
      barcode: { type: String, default: '' },
      // NEW: optional shop-defined code for this item (e.g. boutique code "3452"). Used when there is no barcode, or alongside one.
      customCode: { type: String, default: '', trim: true },
      sellingPrice: { type: Number, required: true },
      quantity: { type: Number, required: true, default: 0 },
      lowStock: { type: Boolean, default: false },
      unit: { type: String, default: '' },
      expiryDate: { type: String },  // ISO date string for expiry (optional)
      image: { type: String, default: '' }, // item image URL (Cloudinary)
      soldQuantity: { type: Number, default: 0 }, // cumulative units sold, for reporting
      revenue: { type: Number, default: 0 },       // cumulative revenue from this item, for reporting
    },
  ],
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);