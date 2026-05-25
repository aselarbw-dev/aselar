// models/BankTxn.js (staging for parsed lines)
const { mongoose } = require("../../Shared/config");
const bankTxnSchema = new mongoose.Schema({
    statementId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankStatement', required: true },
    txnDate: { type: Date, required: true },
    description: String,
    debit: { type: Number, default: 0 }, // Bank-side (positive debits from account)
    credit: { type: Number, default: 0 }, // Positive credits to account
    balance: Number, // Running balance
    reference: String, // e.g., txn ID
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    matchStatus: { type: String, enum: ['pending', 'matched', 'manual', 'exception'], default: 'pending' }
  }, { timestamps: true });
  
  module.exports = mongoose.model('BankTxn', bankTxnSchema);