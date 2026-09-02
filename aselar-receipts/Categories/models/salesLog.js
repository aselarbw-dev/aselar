const { mongoose } = require("../../Shared/config");

// One document per sale event (per item, per transaction). This is what
// makes day-by-day reporting possible — the cumulative soldQuantity/revenue
// fields on Category.items have no date attached, so they can only ever
// answer "how much has this sold, ever," not "how much sold today."
const salesLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  categoryName: { type: String, required: true }, // denormalized so reports don't need a join/lookup
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  itemName: { type: String, required: true },      // denormalized, same reason
  quantity: { type: Number, required: true },
  revenue: { type: Number, required: true },
  soldAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Speeds up the report's per-user, date-range queries.
salesLogSchema.index({ user: 1, soldAt: 1 });

module.exports = mongoose.model('SalesLog', salesLogSchema);