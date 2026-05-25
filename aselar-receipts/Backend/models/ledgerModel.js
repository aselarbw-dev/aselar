const mongoose=require("mongoose")

const ledgerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  debitEntries: [
    {
      description: String,
      amount: Number,
      date: { type: Date, required: true },
    },
  ],
  creditEntries: [
    {
      description: String,
      amount: Number,
      date: { type: Date, required: true },
    },
  ],
},

{
  timestamps: true,
});

const Ledger = mongoose.model('Ledger', ledgerSchema);
module.exports=Ledger
