// controllers/returnsController.js
const { mongoose, connectDB } = require("../../Shared/config");
const Category = require('../models/categories.js');
const ReturnRecord = require('../models/returnRecord.js');
const NewReceipt = require('../../CategoryReceipts/models/inventoryReceipts.js'); // confirm this matches your actual receipt model path

/**
 * POST /api/returns/process
 * Body: {
 *   originalReceiptId,
 *   returnedItems: [{ name, quantity, price }],  // no ids — resolved below by name
 *   sellerName,
 *   reason
 * }
 *
 * Since receipts store only name/quantity/price (no categoryId/itemId),
 * each returned item is matched back to current inventory by exact name
 * within this business's own categories. If an item was renamed or
 * deleted since the original sale, that item is skipped and flagged —
 * the return still processes for everything that DID match.
 */
const processReturn = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { originalReceiptId, returnedItems, sellerName, reason } = req.body;

    if (!originalReceiptId || !returnedItems || !Array.isArray(returnedItems) || returnedItems.length === 0) {
      return res.status(400).json({ message: 'Missing return details' });
    }

    await connectDB();

    const originalReceipt = await NewReceipt.findOne({
      _id: originalReceiptId,
      user: req.user._id.toString(),
    });

    if (!originalReceipt) {
      return res.status(404).json({ message: 'Original receipt not found' });
    }

    // Load all this business's categories once — matching happens in memory
    const categories = await Category.find({ user: req.user._id.toString() });

    let refundAmount = 0;
    const restockResults = [];
    const matchedReturnedItems = []; // what actually gets saved on the ReturnRecord

    for (const returned of returnedItems) {
      const { name, quantity, price } = returned;

      // Find the item by exact name across all this business's categories
      let matchedCategory = null;
      let matchedItem = null;

      for (const category of categories) {
        const found = category.items.find(i => i.name === name);
        if (found) {
          matchedCategory = category;
          matchedItem = found;
          break;
        }
      }

      if (!matchedCategory || !matchedItem) {
        restockResults.push({
          name,
          status: 'failed',
          message: 'No matching item found in current inventory — may have been renamed or deleted. Inventory NOT adjusted for this item.',
        });
        continue; // still counts toward refund? No — see note below
      }

      // Restock — add the returned quantity back
      matchedItem.quantity = matchedItem.quantity + quantity;
      matchedItem.lowStock = matchedItem.quantity <= 10;
      await matchedCategory.save();

      refundAmount += quantity * price;
      restockResults.push({ name, status: 'success', newQuantity: matchedItem.quantity });

      matchedReturnedItems.push({
        itemId: matchedItem._id,
        categoryId: matchedCategory._id,
        name,
        quantity,
        price,
      });
    }

    if (matchedReturnedItems.length === 0) {
      return res.status(400).json({
        message: 'None of the returned items could be matched to current inventory. No changes were made.',
        restockResults,
      });
    }

    // Create the permanent return record — the original receipt is NEVER modified
    const returnRecord = await ReturnRecord.create({
      user: req.user._id,
      originalReceiptId,
      returnedItems: matchedReturnedItems,
      refundAmount,
      processedBy: sellerName || 'Unknown',
      reason: reason || '',
    });

    res.status(200).json({
      message: 'Return processed successfully',
      refundAmount,
      returnRecord,
      restockResults,
    });

  } catch (error) {
    console.error('Process return error:', error);
    res.status(500).json({ message: 'Failed to process return', error: error.message });
  }
};

module.exports = { processReturn };