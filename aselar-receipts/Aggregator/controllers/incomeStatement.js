const {connectDB}=require("../../Shared/config");

// Helper: Sum matching ledger entries for a specific user
const sumLedgerEntries = async (entryType, keywords, userId) => {
    await connectDB(); // Ensure DB connection is established
  
    const Ledger = require("../../LedgerBackend/models/ledgerModel");
    
    // Filter ledgers by user ID
    const ledgers = await Ledger.find({ userId: userId });
    let total = 0;

    for (const ledger of ledgers) {
        const entries = ledger[entryType]; // 'debitEntries' or 'creditEntries'
        for (const entry of entries) {
            if (
                entry.description &&
                keywords.some(keyword =>
                    entry.description.toLowerCase().includes(keyword.toLowerCase())
                )
            ) {
                total += entry.amount;
            }
        }
    }

    return total;
};

// Helper: Sum total sales from receipts for a specific user
const getTotalSales = async (userId) => {
    await connectDB(); // Ensure DB connection is established
    const Receipt = require("../../ReceiptBackend/models/receiptModel");
    
    // Filter receipts by user ID
    const receipts = await Receipt.find({ userId: userId });
    if (!receipts || receipts.length === 0) {
        return 0;
    }

    return receipts.reduce((sum, receipt) => sum + receipt.grandTotal, 0);
};

// Controller: Main Income Statement generator
const getIncomeStatement = async (req, res) => {
    try {
        // Get user ID from the protect middleware
        const userId = req.user._id;
        
        // Log for debugging (remove in production)
        console.log("🔍 Generating Income Statement for User:", userId);

        const totalSales = await getTotalSales(userId);

        if (totalSales === 0) {
            return res.status(404).json({ 
                message: "No sales data found for this user.",
                userId: userId 
            });
        }

        const returns = await sumLedgerEntries("creditEntries", ["return", "returns"], userId);
        const purchases = await sumLedgerEntries("debitEntries", ["purchase", "purchases"], userId);
        const carriageInwards = await sumLedgerEntries("debitEntries", ["carriage inwards"], userId);

        const grossProfit = totalSales + returns - (purchases + carriageInwards);

        // Log for debugging (remove in production)
        console.log("📊 Income Statement Data:", {
            userId,
            totalSales,
            returns,
            purchases,
            carriageInwards,
            grossProfit
        });

        res.json({
            totalSales,
            returns,
            purchases,
            carriageInwards,
            grossProfit,
            userId: userId // Optional: include user ID in response for debugging
        });
    } catch (err) {
        console.error("❌ Income Statement Error:", err);
        res.status(500).json({ 
            message: "Error computing income statement",
            error: err.message 
        });
    }
};

module.exports = { getIncomeStatement };
