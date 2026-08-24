// models/scanLog.js
const { mongoose } = require('../../Shared/config'); // ← vs this

const scanLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // the business
  sellerName: { type: String, required: true }, // snapshot from DailySeller at time of scan
  barcode: { type: String, required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  itemName: { type: String, required: true },
  paymentMethod: { type: String, default: '' },
  priceAtScan: { type: Number, required: true },
  outcome: {
    type: String,
    enum: ['added_to_cart', 'sale_completed', 'sale_voided', 'removed_before_sale'],
    default: 'added_to_cart',
  },
  receiptId: { type: mongoose.Schema.Types.ObjectId, default: null },
}, { timestamps: true });

module.exports = mongoose.model('ScanLog', scanLogSchema);