const mongoose = require("mongoose");

const ReceiptSchema = mongoose.Schema({
    inputs: [{
        field1: { type: Number, required: true },  // Quantity
        field2: { type: Number, required: true },  // Price
        field3: { type: String, required: true },  // Product name
        field4: { type: String, required: true },  // Unit
    }],
    // Updated fields for VAT calculation
    subtotal: { type: Number, required: true },    // Total before VAT
    vatAmount: { type: Number, required: true },  // 14% of subtotal
    grandTotal: { type: Number, required: true }, // Final amount after VAT and discount
    
    // Optional discount fields
    discountName: { type: String, default: "" },   // Name/description of discount
    discountValue: { type: Number, default: 0 },   // Amount or percentage value
    discountType: {                                // 'fixed' or 'percentage'
        type: String,
        enum: ["fixed", "percentage"],
        default: "fixed"
    },
    
    // Payment fields (changed from String to Number)
    cash: { type: Number, required: true },        // Amount received from customer
    change: { type: Number, required: true },     // Balance to return
    
    // Existing fields
    date: {
        type: Date,
        default: Date.now,
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    }
}, {
    timestamps: true,
});

// Add backward compatibility for old receipts
ReceiptSchema.virtual('total').get(function() {
    return this.grandTotal.toString();
});

ReceiptSchema.virtual('subtraction').get(function() {
    return this.cash.toString();
});

const Receipt = mongoose.model("Receipt", ReceiptSchema);
module.exports = Receipt;