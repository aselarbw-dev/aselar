const { mongoose } = require("../../Shared/config");
const crypto = require('crypto');

const quoteSchema = mongoose.Schema({
    quoteNumber: {
        type: String,
        unique: true,
        required: false, // Changed to false so validation doesn't fail before pre-save hook
        // We'll make it required after generation in the pre-save hook
    },
    data: [
        {
            field1: { type: String, required: true },
            field2: { type: String, required: true },
            field3: { type: Number, required: true },
            field4: { type: Number, required: true },
        }
    ],
    totalSum: { type: String, required: true },
    vat: { type: String, required: true },
    subtotal: { type: String, required: true },
    date: {
        type: Date,
        default: Date.now,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
}, {
    timestamps: true,
});

// Pre-save hook for quote number generation
quoteSchema.pre('save', async function(next) {
    // Only generate for new documents that don't already have a quoteNumber
    if (this.isNew && !this.quoteNumber) {
        console.log('🔄 Generating quote number...');
        
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!isUnique && attempts < maxAttempts) {
            // Generate quote number
            const quoteNumber = `QT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
            console.log(`🎲 Attempt ${attempts + 1}: Generated ${quoteNumber}`);
            
            // Check if it already exists
            const existingQuote = await this.constructor.findOne({ quoteNumber });
            
            if (!existingQuote) {
                this.quoteNumber = quoteNumber;
                isUnique = true;
                console.log(`✅ Quote number set: ${quoteNumber}`);
            } else {
                console.log(`🔄 ${quoteNumber} already exists, retrying...`);
            }
            
            attempts++;
        }
        
        if (!isUnique) {
            console.error('❌ Failed to generate unique quote number after 10 attempts');
            return next(new Error('Failed to generate unique quote number'));
        }
    }
    
    // Ensure quoteNumber is present before saving
    if (!this.quoteNumber) {
        return next(new Error('Quote number is required'));
    }
    
    next();
});

// Index for better performance on quote number queries
quoteSchema.index({ quoteNumber: 1 });

const Quote = mongoose.model("Quote", quoteSchema);
module.exports = Quote;