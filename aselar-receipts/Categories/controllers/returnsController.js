// controllers/returnsController.js
const { mongoose, connectDB } = require("../../Shared/config");
const Category = require('../models/categories.js');
const ReturnRecord = require('../models/returnRecord.js');
const NewReceipt = require('../../CategoryReceipts/models/inventoryReceipts.js'); // confirm this matches your actual receipt model path

/**
 * POST /api/returns/process
 * Body: {
 *   originalReceiptId,
 *   returnedItems: [{ name, quantity, price }],  // price is IGNORED; the saved receipt price is used
 *   sellerName,
 *   reason
 * }
 *
 * Since receipts store only name/quantity/price (no categoryId/itemId),
 * each returned item is matched back to current inventory by exact name
 * within this business's own categories. If an item was renamed or
 * deleted since the original sale, that item is skipped and flagged —
 * the return still processes for everything that DID match.
 *
 * Security notes:
 * - originalReceiptId must be a plain ObjectId string (blocks query-operator injection).
 * - Quantities are capped at what the original receipt sold, and prices come
 *   from the saved receipt, never from the browser.
 */
const processReturn = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { originalReceiptId, returnedItems, sellerName, reason } = req.body;

    // Gap 2 fix: the id must be a string that is a valid ObjectId, so an object
    // such as { "$ne": null } can never reach a Mongoose query.
    if (typeof originalReceiptId !== 'string' || !mongoose.isValidObjectId(originalReceiptId)) {
      return res.status(400).json({ message: 'Invalid receipt id' });
    }

    if (!Array.isArray(returnedItems) || returnedItems.length === 0 || returnedItems.length > 200) {
      return res.status(400).json({ message: 'Missing return details' });
    }

    // Each entry needs a real name and a positive numeric quantity
    for (const entry of returnedItems) {
      if (
        !entry ||
        typeof entry.name !== 'string' ||
        entry.name.trim() === '' ||
        typeof entry.quantity !== 'number' ||
        !Number.isFinite(entry.quantity) ||
        entry.quantity <= 0
      ) {
        return res.status(400).json({ message: 'Invalid returned item details' });
      }
    }

    const safeSellerName = typeof sellerName === 'string' ? sellerName.trim().slice(0, 100) : '';
    const safeReason = typeof reason === 'string' ? reason.trim().slice(0, 500) : '';

    await connectDB();

    const originalReceipt = await NewReceipt.findOne({
      _id: originalReceiptId,
      user: req.user._id.toString(),
    });

    if (!originalReceipt) {
      return res.status(404).json({ message: 'Original receipt not found' });
    }

    // Block double returns — a receipt can only be returned once.
    // Must run BEFORE any restocking so inventory is never adjusted twice.
    const existingReturn = await ReturnRecord.findOne({ originalReceiptId });
    if (existingReturn) {
      return res.status(409).json({
        message: 'A return has already been processed for this receipt.',
      });
    }

    // Gap 1 fix: validate every returned item against what the receipt actually sold.
    // A receipt can contain the same product on several lines (e.g. "Marq x3" and
    // "Marq x2"), so quantity is tracked per receipt line and allocated in order.
    // Prices come from the receipt line, not from the request.
    const remainingPerLine = originalReceipt.items.map(line => line.quantity);
    const validatedItems = []; // { name, quantity, price } with trusted values

    for (const entry of returnedItems) {
      const name = entry.name;
      let needed = entry.quantity;

      for (let idx = 0; idx < originalReceipt.items.length && needed > 1e-9; idx++) {
        const line = originalReceipt.items[idx];
        if (line.name !== name || remainingPerLine[idx] <= 0) continue;

        const take = Math.min(needed, remainingPerLine[idx]);
        remainingPerLine[idx] -= take;
        needed -= take;
        validatedItems.push({ name, quantity: take, price: line.price });
      }

      if (needed > 1e-9) {
        // Runs before any restocking, so nothing has been changed yet
        return res.status(400).json({
          message: `Cannot return ${entry.quantity} x ${name}: that is more than was sold on this receipt.`,
        });
      }
    }

    // Load all this business's categories once — matching happens in memory
    const categories = await Category.find({ user: req.user._id.toString() });

    let refundAmount = 0;
    const restockResults = [];
    const matchedReturnedItems = []; // what actually gets saved on the ReturnRecord

    for (const returned of validatedItems) {
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
        continue;
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

    refundAmount = Math.round(refundAmount * 100) / 100;

    // Create the permanent return record — the original receipt is NEVER modified
    const returnRecord = await ReturnRecord.create({
      user: req.user._id,
      originalReceiptId,
      returnedItems: matchedReturnedItems,
      refundAmount,
      processedBy: safeSellerName || 'Unknown',
      reason: safeReason,
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