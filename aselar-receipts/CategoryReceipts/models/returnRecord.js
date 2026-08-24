// models/returnRecord.js
const { mongoose } = require("../../Shared/config");

const returnedItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
});

const returnRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalReceiptId: { type: mongoose.Schema.Types.ObjectId, required: true },
  returnedItems: [returnedItemSchema],
  refundAmount: { type: Number, required: true },
  processedBy: { type: String, required: true }, // seller name at time of return
  reason: { type: String, default: '' }, // optional, staff can note why
}, { timestamps: true });

module.exports = mongoose.model('ReturnRecord', returnRecordSchema);