const { mongoose } = require("../../Shared/config");
const crypto = require('crypto');

const invoiceSchema = mongoose.Schema({
    fields: [  // Keep as-is – array of objects
        {
            field1: { type: String, required: true },
            field2: { type: String, required: true },
            field3: { type: Number, required: true },
            field4: { type: Number, required: true },
        }
    ],
    invoiceNumber: {
        type: String,
        unique: true,
        required: false, // Pre-hook sets it
    },
    // Optional for aging – won't block creates
    customerName: { type: String, required: false }, // From Receivers form
    date: {  // Added: Explicit invoice date (used for dueDate calc)
        type: Date,
        default: Date.now,
    },
    dueDate: { type: Date, required: false },
    status: { type: String, enum: ['pending', 'paid', 'overdue'], required: false, default: 'pending' }, // Default safe
    paidDate: { type: Date, required: false },
    addition: { type: String, required: true },
    vat: { type: String, required: true },
    totalSum: { type: String, required: true }, // String for readability
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiver: {  // Optional ref to receivers model – no impact on creates
        type: mongoose.Schema.Types.ObjectId,
        ref: 'receivers',
        required: false
    },
}, {
    timestamps: true,
});

// Pre-save hook (your original – unchanged, works for new docs)
invoiceSchema.pre('save', async function(next) {
    if (this.isNew && !this.invoiceNumber) {
        console.log('🔄 Generating invoice number...');
        
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!isUnique && attempts < maxAttempts) {
            const invoiceNumber = `INV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
            console.log(`🎲 Attempt ${attempts + 1}: Generated ${invoiceNumber}`);
            
            const existingInvoice = await this.constructor.findOne({ invoiceNumber });
            
            if (!existingInvoice) {
                this.invoiceNumber = invoiceNumber;
                isUnique = true;
                console.log(`✅ Invoice number set: ${invoiceNumber}`);
            } else {
                console.log(`🔄 ${invoiceNumber} already exists, retrying...`);
            }
            
            attempts++;
        }
        
        if (!isUnique) {
            console.error('❌ Failed to generate unique invoice number after 10 attempts');
            return next(new Error('Failed to generate unique invoice number'));
        }
    }

    // Added: Auto-set dueDate if new and not provided (30 days from date)
    if (this.isNew && !this.dueDate) {
        this.dueDate = new Date(this.date.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
        console.log(`📅 Auto-set dueDate: ${this.dueDate.toISOString().split('T')[0]}`);
    }
    
    if (!this.invoiceNumber) {
        return next(new Error('Invoice number is required'));
    }
    
    next();
});

// Indexes: Only non-duplicate ones
invoiceSchema.index({ customerName: 1, status: 1 }); // For aging
invoiceSchema.index({ dueDate: 1, status: 1 });

const Invoice = mongoose.model("invoice", invoiceSchema);
module.exports = Invoice;