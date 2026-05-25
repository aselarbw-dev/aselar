const {mongoose} = require("../../Shared/config");
const crypto = require('crypto');

const debtSchema = mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true  // ← ADDED: Auto-trim whitespace
        },
        message: {
            type: String,
            required: true,
            trim: true  // ← ADDED: Auto-trim
        },
        location: {
            type: String,
            required: true,   
            trim: true  // ← ADDED: Auto-trim
        },
        date: {
            type: Date,
            default: Date.now,
        },
        amount: {
            type: Number,
            required: true,
            min: 0  // ← ADDED: Prevent negative amounts
        },
        issuersName: {
            type: String,
            required: true,   
            trim: true  // ← ADDED: Auto-trim
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Make sure this matches your User model exactly
            required: true
        },
        // NEW: Unique debt note number (mirrors receiptsNumber for QR/SMS tracking)
        debtNoteNumber: {
            type: String,
            unique: true,
            required: false  // Hook generates; false to pass pre-validation
        }
    },
    {
        timestamps: true,
    }
);

// Pre-save hook to generate unique debt note number (DCN-XXXXXXX, mirrors receipt logic)
debtSchema.pre('save', async function(next) {
  if (this.isNew && !this.debtNoteNumber) {
    console.log('🔄 Generating debt note number...');
    
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      const debtNoteNumber = `DCN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      console.log(`🎲 Attempt ${attempts + 1}: Generated ${debtNoteNumber}`);
      
      const existing = await this.constructor.findOne({ debtNoteNumber });
      
      if (!existing) {
        this.debtNoteNumber = debtNoteNumber;
        isUnique = true;
        console.log(`✅ Debt note number set: ${debtNoteNumber}`);
      } else {
        console.log(`🔄 ${debtNoteNumber} already exists, retrying...`);
      }
      
      attempts++;
    }
    
    if (!isUnique) {
      console.error('❌ Failed to generate unique debt note number after 10 attempts');
      return next(new Error('Failed to generate unique debt note number'));
    }
  }
  
  // Enforce post-generation
  if (!this.debtNoteNumber) {
    return next(new Error('Debt note number is required'));
  }
  
  next();
});

// Index for queries (unique already creates, but explicit for perf)
debtSchema.index({ debtNoteNumber: 1 });

const debt = mongoose.model("debt", debtSchema);
module.exports = debt;