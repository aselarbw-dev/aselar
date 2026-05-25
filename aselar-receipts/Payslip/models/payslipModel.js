const {mongoose} = require("../../Shared/config");
const crypto = require('crypto');

const paySlipSchema = new mongoose.Schema({
  employeeName: {
    type: String,
    required: true,
    trim: true  // ← ADDED: Auto-trim whitespace
  },
  employeeId: {
    type: String,
    required: true,
    trim: true  // ← ADDED: Auto-trim
  },
  basicSalary: {
    type: Number,
    required: true,
    min: 0  // ← ADDED: Prevent negative salary
  },
   user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Make sure this matches your User model exactly
      required: true
    },
  vat: {
    type: Number,
    required: true,
    min: 0  // ← ADDED: Prevent negative VAT
  },
  deductions: [
    {
      label: {
        type: String,
        required: true,
        trim: true  // ← ADDED: Auto-trim
      },
      amount: {
        type: Number,
        required: true,
        min: 0  // ← ADDED: Prevent negative deductions
      },
    },
  ],
  additions: [
    {
      label: {
        type: String,
        required: true,
        trim: true  // ← ADDED: Auto-trim
      },
      amount: {
        type: Number,
        required: true,
        min: 0  // ← ADDED: Prevent negative additions
      },
    },
  ],
  balance: {
    type: Number,
    required: true,
    min: 0  // ← ADDED: Prevent negative balance
  },
  // NEW: Unique payslip number (mirrors receiptsNumber/debtNoteNumber for QR/SMS tracking)
  payslipNumber: {
    type: String,
    unique: true,
    required: false  // Hook generates; false to pass pre-validation
  }
}, {
  timestamps: true
});

// Pre-save hook to generate unique payslip number (PS-XXXXXXX, mirrors receipt/debt logic)
paySlipSchema.pre('save', async function(next) {
  if (this.isNew && !this.payslipNumber) {
    console.log('🔄 Generating payslip number...');
    
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      const payslipNumber = `PS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      console.log(`🎲 Attempt ${attempts + 1}: Generated ${payslipNumber}`);
      
      const existing = await this.constructor.findOne({ payslipNumber });
      
      if (!existing) {
        this.payslipNumber = payslipNumber;
        isUnique = true;
        console.log(`✅ Payslip number set: ${payslipNumber}`);
      } else {
        console.log(`🔄 ${payslipNumber} already exists, retrying...`);
      }
      
      attempts++;
    }
    
    if (!isUnique) {
      console.error('❌ Failed to generate unique payslip number after 10 attempts');
      return next(new Error('Failed to generate unique payslip number'));
    }
  }
  
  // Enforce post-generation
  if (!this.payslipNumber) {
    return next(new Error('Payslip number is required'));
  }
  
  next();
});

// Index for queries (unique already creates, but explicit for perf)
paySlipSchema.index({ payslipNumber: 1 });

module.exports = mongoose.model('PaySlip', paySlipSchema);