// models/BankStatement.js
const { mongoose } = require("../../Shared/config");
const bankStatementSchema = new mongoose.Schema({
    bankAccountTitle: { type: String, required: true }, // Matches Ledger.title for bank
    statementDate: { type: Date, required: true },
    startBalance: Number,
    endBalance: Number,
    importFilePath: String, // For audit
    status: { type: String, enum: ['imported', 'reconciled', 'locked'], default: 'imported' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  }, { timestamps: true });
  
  module.exports = mongoose.model('BankStatement', bankStatementSchema);