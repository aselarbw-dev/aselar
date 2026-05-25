const Ledger = require("../models/ledgerModel")
const asyncHandler = require("express-async-handler")
// controller function
const ledgerController = async (req, res) => {
  try {
    const { title, debitEntries, creditEntries } = req.body;
    
    const newLedger = await Ledger.create({
      title,
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
/*
const ledgerController = asyncHandler(async (req, res) => {
    const { title, debitEntries, creditEntries } = req.body;
    try {
      const ledger = await Ledger.create({ title, debitEntries, 
        creditEntries,  createdAt: new Date(), // Manually set
        updatedAt: new Date() });
      await ledger.save();
      res.status(201).json(ledger);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
   
})

*/
const getRecentLedger =async (req, res) => {
  try {
    const recentLedger = await Ledger.findOne()
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
// Get ALL ledgers (sorted newest first)
const getAllLedgers = async (req, res) => {
  try {
    const ledgers = await Ledger.find()
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
  
module.exports = { ledgerController,getRecentLedger,getAllLedgers}