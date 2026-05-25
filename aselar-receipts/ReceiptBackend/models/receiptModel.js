const { mongoose } = require("../../Shared/config");
const crypto = require('crypto');

const ReceiptSchema = new mongoose.Schema({
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
    },
    // Added for uniqueness (similar to first receipt; useful for QR/SMS tracking)
    receiptsNumber: {
        type: String,
        unique: true,
        required: false// Generated in hook
    }
}, {
    timestamps: true,
});

// Pre-save hook to generate a unique receipt number (similar logic from first receipt)
ReceiptSchema.pre('save', async function(next) {
  if (this.isNew && !this.receiptsNumber) {
    console.log('🔄 Generating receipt number...');
    
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      const receiptsNumber = `RC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      console.log(`🎲 Attempt ${attempts + 1}: Generated ${receiptsNumber}`);
      
      const existingReceipt = await this.constructor.findOne({ receiptsNumber });
      
      if (!existingReceipt) {
        this.receiptsNumber = receiptsNumber;
        isUnique = true;
        console.log(`✅ Receipt number set: ${receiptsNumber}`);
      } else {
        console.log(`🔄 ${receiptsNumber} already exists, retrying...`);
      }
      
      attempts++;
    }
    
    if (!isUnique) {
      console.error('❌ Failed to generate unique receipt number after 10 attempts');
      return next(new Error('Failed to generate unique receipt number'));
    }
  }
  
  // Ensure receiptsNumber is present before saving
  if (!this.receiptsNumber) {
    return next(new Error('Receipt number is required'));
  }
  
  next();
});

// Pre-save hook to auto-calculate totals (similar logic: handles inputs, discount, VAT, change)
ReceiptSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('inputs') || this.isModified('discountValue') || this.isModified('discountType') || this.isModified('cash')) {
    // Calculate subtotal from inputs
    this.subtotal = this.inputs.reduce((sum, input) => sum + (input.field1 * input.field2), 0);

    // Apply discount
    let discountedSubtotal = this.subtotal;
    if (this.discountValue > 0) {
      if (this.discountType === 'percentage') {
        discountedSubtotal = this.subtotal * (1 - (this.discountValue / 100));
      } else { // fixed
        discountedSubtotal = Math.max(0, this.subtotal - this.discountValue);
      }
    }

    // VAT at 14% on discounted subtotal
    const VAT_RATE = 0.14;
    this.vatAmount = discountedSubtotal * VAT_RATE;

    // Grand total
    this.grandTotal = discountedSubtotal + this.vatAmount;

    // Change calculation
    this.change = Math.max(0, this.cash - this.grandTotal); // Prevent negative
  }
  next();
});

// Add backward compatibility for old receipts
ReceiptSchema.virtual('total').get(function() {
    return this.grandTotal.toString();
});

ReceiptSchema.virtual('subtraction').get(function() {
    return this.cash.toString();
});

// REMOVED: Duplicate index - unique: true already creates it
// ReceiptSchema.index({ receiptsNumber: 1 });

const Receipt = mongoose.model("Receipt", ReceiptSchema);
module.exports = Receipt;