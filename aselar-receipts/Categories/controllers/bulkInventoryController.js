const { mongoose, connectDB } = require("../../Shared/config");
const Category = require('../models/categories.js');
const stringSimilarity = require('string-similarity'); // npm install string-similarity
const multer = require('multer');
const Papa = require('papaparse');
const XLSX = require('xlsx');
// ─────────────────────────────────────────────
// MATCHING HELPERS
// ─────────────────────────────────────────────

/**
 * Normalize a name for comparison: lowercase, trim, collapse whitespace.
 */
function normalize(name = '') {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Find the best matching category from a user's existing categories.
 */
function matchCategory(incomingName, existingCategories) {
  if (!existingCategories.length) return { match: null, confidence: 0 };

  const target = normalize(incomingName);
  const names = existingCategories.map(c => normalize(c.name));

  const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(target, names);

  return {
    match: bestMatch.rating >= 0.6 ? existingCategories[bestMatchIndex] : null,
    confidence: bestMatch.rating,
  };
}

/**
 * Find the best matching item WITHIN a specific category's items array.
 */
function matchItem(incomingName, existingItems) {
  if (!existingItems || !existingItems.length) return { match: null, confidence: 0 };

  const target = normalize(incomingName);
  const names = existingItems.map(i => normalize(i.name));

  const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(target, names);

  return {
    match: bestMatch.rating >= 0.6 ? existingItems[bestMatchIndex] : null,
    confidence: bestMatch.rating,
  };
}

/**
 * Turn a raw similarity score into a UI-friendly status.
 */
function classifyConfidence(confidence) {
  if (confidence >= 0.85) return 'matched';
  if (confidence >= 0.6) return 'possible_match';
  return 'new';
}
/**
 * POST /bulk/preview
 * Body: { rows: [{ category, name, costPrice, sellingPrice, quantity, unit, expiryDate }, ...] }
 *
 * Does NOT write to the DB. Returns each row tagged with a match status
 * so the frontend can render a review table before commit.
 */
const previewBulkImport = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'No rows provided for preview' });
    }

    await connectDB();

    // Fetch this user's existing categories once, up front — reused for every row
    const existingCategories = await Category.find({ user: req.user._id.toString() });

    const preview = rows.map((row, index) => {
      const { category: categoryName, name: itemName } = row;

      if (!categoryName || !itemName) {
        return {
          rowIndex: index,
          original: row,
          status: 'invalid',
          reason: 'Missing category or item name',
        };
      }

      // Step 1: try to match the category
      const categoryResult = matchCategory(categoryName, existingCategories);
      const categoryStatus = classifyConfidence(categoryResult.confidence);

      // Step 2: if we found a likely category, try to match the item within it
      let itemResult = { match: null, confidence: 0 };
      if (categoryResult.match) {
        itemResult = matchItem(itemName, categoryResult.match.items);
      }
      const itemStatus = categoryResult.match
        ? classifyConfidence(itemResult.confidence)
        : 'new'; // no category match means item is necessarily new

      return {
        rowIndex: index,
        original: row,
        category: {
          status: categoryStatus,               // 'matched' | 'possible_match' | 'new'
          confidence: categoryResult.confidence,
          matchedId: categoryResult.match?._id || null,
          matchedName: categoryResult.match?.name || null,
        },
        item: {
          status: itemStatus,                    // 'matched' | 'possible_match' | 'new'
          confidence: itemResult.confidence,
          matchedId: itemResult.match?._id || null,
          matchedName: itemResult.match?.name || null,
        },
      };
    });

    res.status(200).json({ preview });
  } catch (error) {
    console.error('Preview bulk import error:', error);
    res.status(500).json({ message: 'Failed to preview bulk import', error: error.message });
  }
};
const commitBulkImport = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'No rows provided for commit' });
    }

    await connectDB();

    const results = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        const {
          category: categoryName,
          name: itemName,
          costPrice,
          sellingPrice,
          quantity,
          unit,
          expiryDate,
          categoryDecision,
          itemDecision,
        } = row;

        if (!categoryName || !itemName || !categoryDecision || !itemDecision) {
          results.push({ rowIndex: i, status: 'failed', message: 'Missing required fields or decisions' });
          continue;
        }

        // ── Step 1: resolve the category (existing or new) ──
        let category;

        if (categoryDecision.action === 'use_existing') {
          category = await Category.findOne({
            _id: categoryDecision.categoryId,
            user: req.user._id.toString(),
          });

          if (!category) {
            results.push({ rowIndex: i, status: 'failed', message: 'Existing category not found' });
            continue;
          }
        } else if (categoryDecision.action === 'create_new') {
          category = await Category.create({
            name: categoryName,
    description: `Imported via bulk upload`, // was '' — schema requires a non-empty string
            image: '',
            items: [],
            user: req.user._id.toString(),
          });
        } else {
          results.push({ rowIndex: i, status: 'failed', message: 'Invalid categoryDecision.action' });
          continue;
        }

        // ── Step 2: resolve the item (restock existing or create new) ──
        const parsedQuantity = parseInt(quantity, 10) || 0;

        if (itemDecision.action === 'use_existing') {
          const existingItem = category.items.id(itemDecision.itemId);

          if (!existingItem) {
            results.push({ rowIndex: i, status: 'failed', message: 'Existing item not found in category' });
            continue;
          }

          // Restock: ALWAYS increment quantity, never overwrite it
          existingItem.quantity = existingItem.quantity + parsedQuantity;
          existingItem.lowStock = existingItem.quantity <= 10;

          // Price/unit/expiry: apply whatever the confirmed row carries —
          // by the time it reaches commit, that value is either the
          // original import or whatever the user edited in the review table
          if (costPrice !== undefined) existingItem.costPrice = costPrice;
          if (sellingPrice !== undefined) existingItem.sellingPrice = sellingPrice;
          if (unit !== undefined) existingItem.unit = unit;
          if (expiryDate !== undefined) existingItem.expiryDate = expiryDate;

          await category.save();

          results.push({
            rowIndex: i,
            status: 'success',
            action: 'restocked',
            categoryId: category._id,
            itemId: existingItem._id,
            newQuantity: existingItem.quantity,
          });

        } else if (itemDecision.action === 'create_new') {
          const newItem = {
            name: itemName,
            costPrice,
            sellingPrice,
            quantity: parsedQuantity,
            unit: unit || '',
            expiryDate: expiryDate || '',
            lowStock: parsedQuantity <= 10,
          };

          category.items.push(newItem);
          await category.save();

          const createdItem = category.items[category.items.length - 1];

          results.push({
            rowIndex: i,
            status: 'success',
            action: 'created',
            categoryId: category._id,
            itemId: createdItem._id,
            newQuantity: createdItem.quantity,
          });

        } else {
          results.push({ rowIndex: i, status: 'failed', message: 'Invalid itemDecision.action' });
        }

      } catch (rowError) {
        console.error(`Bulk commit row ${i} error:`, rowError);
        results.push({ rowIndex: i, status: 'failed', message: rowError.message });
      }
    }

    const succeeded = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    res.status(200).json({
      message: `Bulk import complete: ${succeeded} succeeded, ${failed} failed`,
      totalRows: rows.length,
      succeeded,
      failed,
      results,
    });

  } catch (error) {
    console.error('Commit bulk import error:', error);
    res.status(500).json({ message: 'Failed to commit bulk import', error: error.message });
  }
};
// Multer config: keep the file in memory (no need to save to disk for a quick parse)
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Maps a raw parsed row (whatever headers the user's file has) into our
 * expected shape. Handles common header variations so we're not too rigid
 * about exact column names.
 */
function normalizeRow(rawRow) {
  // Lowercase all keys for easier matching against variations
  const keys = Object.keys(rawRow).reduce((acc, key) => {
    acc[key.toLowerCase().trim()] = rawRow[key];
    return acc;
  }, {});

  const get = (...aliases) => {
    for (const alias of aliases) {
      if (keys[alias] !== undefined && keys[alias] !== '') return keys[alias];
    }
    return undefined;
  };

  return {
    category: get('category', 'category name'),
    name: get('name', 'item name', 'product name'),
    costPrice: parseFloat(get('costprice', 'cost price', 'cost')) || 0,
    sellingPrice: parseFloat(get('sellingprice', 'selling price', 'price')) || 0,
    quantity: parseInt(get('quantity', 'qty'), 10) || 0,
    unit: get('unit') || '',
    expiryDate: get('expirydate', 'expiry date', 'expiry') || '',
  };
}

/**
 * POST /bulk/parse
 * Multipart form upload, field name: "file"
 * Accepts .csv, .xlsx, .xls
 *
 * Parses the file and returns normalized rows — does NOT match or write
 * to the DB. Frontend takes this response and calls /bulk/preview next.
 */
const parseBulkFile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filename = req.file.originalname.toLowerCase();
    let rawRows = [];

    if (filename.endsWith('.csv')) {
      const csvText = req.file.buffer.toString('utf-8');
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

      if (parsed.errors.length > 0) {
        return res.status(400).json({
          message: 'CSV parsing encountered errors',
          errors: parsed.errors,
        });
      }
      rawRows = parsed.data;

    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    } else {
      return res.status(400).json({ message: 'Unsupported file type. Please upload .csv, .xlsx, or .xls' });
    }

    if (rawRows.length === 0) {
      return res.status(400).json({ message: 'File contains no rows' });
    }

    const normalizedRows = rawRows.map(normalizeRow);

    // Flag rows missing required fields so the frontend can warn the user early
    const rowsWithValidation = normalizedRows.map((row, index) => ({
      ...row,
      rowIndex: index,
      valid: !!(row.category && row.name),
    }));

    res.status(200).json({
      totalRows: rowsWithValidation.length,
      validRows: rowsWithValidation.filter(r => r.valid).length,
      invalidRows: rowsWithValidation.filter(r => !r.valid).length,
      rows: rowsWithValidation,
    });

  } catch (error) {
    console.error('Parse bulk file error:', error);
    res.status(500).json({ message: 'Failed to parse file', error: error.message });
  }
};
module.exports = {
  // matching helpers exported for now so we can test them independently;
  // the actual route handlers (preview, commit) get added next
  normalize,
  matchCategory,
  previewBulkImport,
  matchItem,
  classifyConfidence,
  commitBulkImport,
  parseBulkFile,
  upload, // export multer config so the route can use it
};