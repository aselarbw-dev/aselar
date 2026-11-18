const { mongoose } = require("../../Shared/config");

const stockMovementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, index: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, index: true },

    // snapshots so history survives renames and deletes
    itemName: { type: String, default: '' },
    categoryName: { type: String, default: '' },
    barcode: { type: String, default: '' },

    type: {
      type: String,
      required: true,
      enum: [
        'OPENING',
        'BULK_UPLOAD',
        'MANUAL_ADD',
        'RESTOCK_EDIT',
        'SALE',
        'RETURN',
        'ADJUSTMENT',
        'DELETE',
      ],
    },

    qtyChange: { type: Number, required: true }, // signed: +50 upload, -3 sale, +1 return
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },

    unitPrice: { type: Number, default: null }, // selling price at the time
    unitCost: { type: Number, default: null },  // item costPrice at the time (for future valuation)

    refType: { type: String, default: '' }, // 'RECEIPT' | 'IMPORT_BATCH' | 'RETURN' | 'MANUAL'
    refId: { type: String, default: '' },   // receipt number, batch id, return id
    performedBy: { type: String, default: '' }, // seller name or owner name
    note: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockMovementSchema.index({ user: 1, createdAt: -1 });
stockMovementSchema.index({ user: 1, itemId: 1, createdAt: -1 });

// Append-only: block updates and deletes at the schema level
const blocked = () => {
  throw new Error('StockMovement is append-only');
};
['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndDelete', 'deleteOne', 'deleteMany'].forEach((op) =>
  stockMovementSchema.pre(op, blocked)
);

module.exports = mongoose.model('StockMovement', stockMovementSchema);