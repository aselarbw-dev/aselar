
const mongoose=require("mongoose")
const expenseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }, // Automatically adds creation date
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  });
  
  module.exports = mongoose.model('Expense', expenseSchema);