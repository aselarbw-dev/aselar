const { mongoose } = require("../../Shared/config");

const ledgerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  debitEntries: [
    {
      description: String,
      amount: Number,
      date: { type: Date, required: true },
      // NEW: Recon fields—optional, defaults null for compat
      reconciledAt: { type: Date, default: null },
      bankMatchId: { type: String, default: null }, // e.g., bank statement line ref
      matchStatus: { 
        type: String, 
        enum: ['pending', 'matched', 'exception', 'outstanding'], 
        default: 'pending' 
      },
      reconNotes: { type: String, default: null } // Optional audit notes
    },
  ],
  creditEntries: [
    {
      description: String,
      amount: Number,
      date: { type: Date, required: true },
      // NEW: Same recon fields as debits—symmetric for matching
      reconciledAt: { type: Date, default: null },
      bankMatchId: { type: String, default: null },
      matchStatus: { 
        type: String, 
        enum: ['pending', 'matched', 'exception', 'outstanding'], 
        default: 'pending' 
      },
      reconNotes: { type: String, default: null }
    },
  ],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Make sure this matches your User model exactly
    required: true
  },
  // NEW: Top-level for grouping entire postings in a recon session (optional)
  reconBatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReconBatch', default: null }
},
{
  timestamps: true,
});

const Ledger = mongoose.model('Ledger', ledgerSchema);
module.exports = Ledger;