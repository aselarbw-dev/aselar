const { connectDB } = require("../../Shared/config");
const fs = require('fs');
const csv = require('csv-parser'); // npm i csv-parser
const multer = require('multer'); // npm i multer
const upload = multer({ dest: 'uploads/' }); // Temp uploads dir; configure as needed

// Existing: ledgerController (CREATE)—UNCHANGED
const ledgerController = async (req, res) => {
  try {
    await connectDB(); // Added await
    const Ledger = require("../models/ledgerModel");
    const { title, debitEntries, creditEntries } = req.body;
    
    const newLedger = await Ledger.create({
      title,
      user: req.user._id, // Ensure user ID is included
      debitEntries: debitEntries.map(entry => ({
        ...entry,
        date: entry.date || new Date() // Ensure entry dates exist
      })),
      creditEntries: creditEntries.map(entry => ({
        ...entry,
        date: entry.date || new Date() // Ensure entry dates exist
      })),
      // These override timestamps if schema option fails:
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json(newLedger);
  } catch (error) {
    console.error("Error creating ledger:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Existing: getRecentLedger—UNCHANGED (added await connectDB)
const getRecentLedger = async (req, res) => {
  try {
    await connectDB();
    const Ledger = require("../models/ledgerModel");
    const recentLedger = await Ledger.findOne({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    if (!recentLedger) {
      return res.status(404).json({ message: "No ledgers found" });
    }

    // Verify timestamp exists (fallback to current date if missing)
    if (!recentLedger.createdAt) {
      recentLedger.createdAt = new Date();
    }

    res.status(200).json(recentLedger);
  } catch (error) {
    console.error("Error fetching recent ledger:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Existing: getAllLedgers—UNCHANGED (added await connectDB)
const getAllLedgers = async (req, res) => {
  try {
    await connectDB();
    const Ledger = require("../models/ledgerModel");
    const ledgers = await Ledger.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
      
    if (!ledgers.length) {
      return res.status(404).json({ message: "No ledgers found" });
    }
    res.status(200).json(ledgers);
  } catch (error) {
    console.error("Error fetching ledgers:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// NEW: Import bank statement CSV (POST /api/ledgers/import-statement) — Use multer middleware in routes
const importBankStatement = [
  upload.single('csvFile'), // Route: app.post('/import-statement', upload.single('csvFile'), importBankStatement);
  async (req, res) => {
    try {
      await connectDB();
      const BankStatement = require("../models/BankStatement"); // Your new model
      const { bankTitle } = req.body; // bankTitle e.g., 'Bank XYZ'
      const results = [];

      fs.createReadStream(req.file.path)
        .pipe(csv()) // Expects CSV cols: txnDate,description,debit,credit,balance,reference
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          fs.unlinkSync(req.file.path); // Cleanup temp file
          const statement = await new BankStatement({
            bankAccountTitle: bankTitle,
            statementDate: new Date(results[0]?.txnDate), // First row date
            startBalance: parseFloat(results[0]?.balance || 0),
            endBalance: parseFloat(results[results.length - 1]?.balance || 0),
            importFilePath: req.file.originalname,
            user: req.user._id
          }).save();

          const BankTxn = require("../models/BankTxn"); // Your new model
          const bankTxns = results.map(row => ({
            statementId: statement._id,
            txnDate: new Date(row.txnDate),
            description: row.description,
            debit: parseFloat(row.debit || 0),
            credit: parseFloat(row.credit || 0),
            balance: parseFloat(row.balance || 0),
            reference: row.reference,
            matchStatus: 'pending'
          }));
          await BankTxn.insertMany(bankTxns);
          res.status(201).json({ 
            message: 'Statement imported successfully', 
            count: bankTxns.length, 
            statementId: statement._id 
          });
        })
        .on('error', (err) => {
          res.status(400).json({ message: 'CSV parse error', error: err.message });
        });
    } catch (error) {
      console.error("Error importing statement:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
];

// Existing: getUnreconciled—UNCHANGED (fetches business entries only)
const getUnreconciled = async (req, res) => {
  try {
    await connectDB();
    const Ledger = require("../models/ledgerModel");
    const { bankTitle, startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const match = {
      title: bankTitle, // Exact match; use { $regex: bankTitle, $options: 'i' } for fuzzy
      user: req.user._id,
      createdAt: { $gte: start, $lte: end } // Or use entry dates below
    };

    const ledgers = await Ledger.find(match).lean();
    const unreconciled = []; // Flatten with indices for updates

    ledgers.forEach((ledger, ledgerIndex) => {
      ledger.debitEntries?.forEach((entry, entryIndex) => {
        if (!entry.reconciledAt && entry.date >= start && entry.date <= end) {
          unreconciled.push({ 
            ...entry, 
            ledgerId: ledger._id, 
            ledgerIndex, 
            entryIndex, 
            side: 'debit', 
            title: ledger.title 
          });
        }
      });
      ledger.creditEntries?.forEach((entry, entryIndex) => {
        if (!entry.reconciledAt && entry.date >= start && entry.date <= end) {
          unreconciled.push({ 
            ...entry, 
            ledgerId: ledger._id, 
            ledgerIndex, 
            entryIndex, 
            side: 'credit', 
            title: ledger.title 
          });
        }
      });
    });

    res.status(200).json(unreconciled);
  } catch (error) {
    console.error("Error fetching unreconciled:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// NEW: Get reconciliation data (GET /api/ledgers/recon-data?bankTitle=BankXYZ&startDate=2025-01-01&endDate=2025-01-31)
const getReconciliationData = async (req, res) => {
  try {
    await connectDB();
    const Ledger = require("../models/ledgerModel");
    const BankTxn = require("../models/BankTxn");
    const BankStatement = require("../models/BankStatement");
    const { bankTitle, startDate, endDate, statementId } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch unreconciled business entries (debit/credit for bank account)
    const match = {
      title: bankTitle,
      user: req.user._id,
      createdAt: { $gte: start, $lte: end }
    };
    const ledgers = await Ledger.find(match).lean();
    const businessEntries = [];
    ledgers.forEach((ledger) => {
      ledger.debitEntries?.forEach((entry) => {
        if (!entry.reconciledAt && entry.date >= start && entry.date <= end) {
          businessEntries.push({ ...entry, ledgerId: ledger._id, side: 'debit' });
        }
      });
      ledger.creditEntries?.forEach((entry) => {
        if (!entry.reconciledAt && entry.date >= start && entry.date <= end) {
          businessEntries.push({ ...entry, ledgerId: ledger._id, side: 'credit' });
        }
      });
    });

    // Fetch pending bank txns (filter by statement if provided)
    const bankFilter = { matchStatus: 'pending' };
    if (statementId) {
      bankFilter.statementId = statementId;
    } else {
      // Fallback to date range if no statement
      bankFilter.txnDate = { $gte: start, $lte: end };
    }
    const bankTxns = await BankTxn.find(bankFilter).lean();

    // Fetch statement for totals/balances if ID provided
    const statement = statementId ? await BankStatement.findById(statementId).lean() : null;

    res.status(200).json({
      businessEntries,
      bankTxns,
      statement,
      period: { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] }
    });
  } catch (error) {
    console.error("Error fetching recon data:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATED: Auto-match with new side-specific logic (POST /api/ledgers/auto-match) — Matches business debits to bank credits, business credits to bank debits
const autoMatch = async (req, res) => {
  try {
    await connectDB();
    const Ledger = require("../models/ledgerModel");
    const BankTxn = require("../models/BankTxn");
    const { statementId, bankTitle, startDate, endDate } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get pending bank txns
    const bankFilter = { matchStatus: 'pending' };
    if (statementId) bankFilter.statementId = statementId;
    else bankFilter.txnDate = { $gte: start, $lte: end };
    const bankTxns = await BankTxn.find(bankFilter).lean();

    // Get unreconciled business entries
    const match = { title: bankTitle, user: req.user._id, createdAt: { $gte: start, $lte: end } };
    const ledgers = await Ledger.find(match).lean();
    const businessDebits = [];
    const businessCredits = [];
    ledgers.forEach((ledger) => {
      ledger.debitEntries?.forEach((entry, entryIndex) => {
        if (!entry.reconciledAt && entry.date >= start && entry.date <= end) {
          businessDebits.push({ ...entry, ledgerId: ledger._id, entryIndex, side: 'debit' });
        }
      });
      ledger.creditEntries?.forEach((entry, entryIndex) => {
        if (!entry.reconciledAt && entry.date >= start && entry.date <= end) {
          businessCredits.push({ ...entry, ledgerId: ledger._id, entryIndex, side: 'credit' });
        }
      });
    });

    let matches = 0;

    // Match business debits (increases) to bank credits (deposits)
    for (const entry of businessDebits) {
      const entryDate = entry.date;
      const potentialMatch = bankTxns.find(btxn => 
        btxn.matchStatus === 'pending' &&
        Math.abs(btxn.credit - entry.amount) < 0.01 && // Exact amount match on bank credit
        Math.abs(new Date(btxn.txnDate) - entryDate) <= 2 * 24 * 60 * 60 * 1000 && // ±2 days
        (entry.description?.toLowerCase() || '').includes(btxn.description.toLowerCase()) || // Desc fuzzy (reversed for leniency)
        btxn.description.toLowerCase().includes(entry.description?.toLowerCase() || '')
      );

      if (potentialMatch) {
        const updatePath = `debitEntries.${entry.entryIndex}`;
        await Ledger.updateOne(
          { _id: entry.ledgerId },
          {
            $set: {
              [updatePath + '.reconciledAt']: new Date(),
              [updatePath + '.bankMatchId']: potentialMatch._id.toString(),
              [updatePath + '.matchStatus']: 'matched'
            }
          }
        );
        await BankTxn.updateOne({ _id: potentialMatch._id }, { matchStatus: 'matched' });
        matches++;
      }
    }

    // Match business credits (decreases) to bank debits (withdrawals)
    for (const entry of businessCredits) {
      const entryDate = entry.date;
      const potentialMatch = bankTxns.find(btxn => 
        btxn.matchStatus === 'pending' &&
        Math.abs(btxn.debit - entry.amount) < 0.01 && // Exact amount match on bank debit
        Math.abs(new Date(btxn.txnDate) - entryDate) <= 2 * 24 * 60 * 60 * 1000 && // ±2 days
        (entry.description?.toLowerCase() || '').includes(btxn.description.toLowerCase()) ||
        btxn.description.toLowerCase().includes(entry.description?.toLowerCase() || '')
      );

      if (potentialMatch) {
        const updatePath = `creditEntries.${entry.entryIndex}`;
        await Ledger.updateOne(
          { _id: entry.ledgerId },
          {
            $set: {
              [updatePath + '.reconciledAt']: new Date(),
              [updatePath + '.bankMatchId']: potentialMatch._id.toString(),
              [updatePath + '.matchStatus']: 'matched'
            }
          }
        );
        await BankTxn.updateOne({ _id: potentialMatch._id }, { matchStatus: 'matched' });
        matches++;
      }
    }

    res.status(200).json({ matched: matches, totalAttempted: businessDebits.length + businessCredits.length, pending: (businessDebits.length + businessCredits.length) - matches });
  } catch (error) {
    console.error("Error auto-matching:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Existing: Manual match—UNCHANGED (but now assumes side-specific in frontend calls)
const manualMatch = async (req, res) => {
  try {
    await connectDB();
    const Ledger = require("../models/ledgerModel");
    const BankTxn = require("../models/BankTxn");
    const { ledgerId, entryIndex, side, bankTxnId, notes } = req.body;

    const updatePath = `${side}Entries.${entryIndex}`;
    await Ledger.updateOne(
      { _id: ledgerId },
      {
        $set: {
          [updatePath + '.reconciledAt']: new Date(),
          [updatePath + '.bankMatchId']: bankTxnId,
          [updatePath + '.matchStatus']: 'matched',
          [updatePath + '.reconNotes']: notes || null
        }
      }
    );
    await BankTxn.updateOne({ _id: bankTxnId }, { matchStatus: 'matched' });

    res.status(200).json({ success: true, message: 'Manually matched' });
  } catch (error) {
    console.error("Error manual matching:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Existing: Finalize recon & simple report—UNCHANGED
const finalizeRecon = async (req, res) => {
  try {
    await connectDB();
    const BankStatement = require("../models/BankStatement");
    const Ledger = require("../models/ledgerModel");
    const { statementId } = req.body;

    // Lock statement
    const statement = await BankStatement.findByIdAndUpdate(
      statementId,
      
      { status: 'locked' },
      { new: true }
    );

    // Basic report via aggregation (assumes reconBatchId set during import if grouping; else filter by title/date)
    const report = await Ledger.aggregate([
      { 
        $match: { 
          title: statement.bankAccountTitle, 
          createdAt: { $gte: statement.statementDate } // Approx; refine with dates
        } 
      },
      {
        $addFields: {
          reconciledDebits: { 
            $size: { 
              $filter: { 
                input: '$debitEntries', 
                cond: { $eq: ['$$this.matchStatus', 'matched'] } 
              } 
            } 
          },
          reconciledCredits: { 
            $size: { 
              $filter: { 
                input: '$creditEntries', 
                cond: { $eq: ['$$this.matchStatus', 'matched'] } 
              } 
            } 
          },
          totalDebits: { $sum: '$debitEntries.amount' },
          totalCredits: { $sum: '$creditEntries.amount' }
        }
      },
      {
        $group: {
          _id: null,
          totalReconciled: { $sum: { $add: ['$reconciledDebits', '$reconciledCredits'] } },
          totalEntries: { $sum: { $add: [{ $size: '$debitEntries' }, { $size: '$creditEntries' }] } },
          variance: { $sum: { $subtract: ['$totalDebits', '$totalCredits'] } }
        }
      }
    ]);

    res.status(200).json({ 
      message: 'Reconciliation finalized', 
      report: report[0] || { totalReconciled: 0, totalEntries: 0, variance: 0 },
      statement: statement 
    });
  } catch (error) {
    console.error("Error finalizing recon:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { 
  ledgerController, 
  getRecentLedger, 
  getAllLedgers,
  // NEW/UPDATED EXPORTS
  importBankStatement,
  getUnreconciled,
  getReconciliationData, // NEW: For fetching data to display in React
  autoMatch, // UPDATED: Side-specific matching logic
  manualMatch,
  finalizeRecon
};