// scripts/seedLedger.js (CommonJS—your app's style)
const { connectDB } = require("../../Shared/config"); // Your path
const Ledger = require("../LedgerBackend/models/ledgerModel"); // Your path

const sampleUserId = new require('mongoose').Types.ObjectId('66f8b1234567890abcdef123'); // Replace with real user ID from login (e.g., console.log(req.user._id) in a controller)

async function seed() {
  await connectDB();

  await Ledger.create([
    {
      title: 'Bank XYZ',
      user: sampleUserId,
      debitEntries: [
        { description: 'Deposit from customer', amount: 500, date: new Date('2025-12-01') },
        { description: 'Service fee', amount: 25, date: new Date('2025-12-05') }
      ],
      creditEntries: [
        { description: 'Payment to supplier', amount: 300, date: new Date('2025-12-03') },
        { description: 'ATM withdrawal', amount: 100, date: new Date('2025-12-10') }
      ]
    },
    {
      title: 'Savings Account',
      user: sampleUserId,
      debitEntries: [{ description: 'Interest credit', amount: 10.5, date: new Date('2025-12-08') }],
      creditEntries: [{ description: 'Transfer out', amount: 200, date: new Date('2025-12-07') }]
    }
  ]);

  console.log('Seeded sample ledgers!');
  process.exit(0);
}

seed().catch(console.error);