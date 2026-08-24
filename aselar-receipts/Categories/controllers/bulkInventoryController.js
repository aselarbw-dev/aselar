const { mongoose, connectDB } = require("../../Shared/config");
const Category = require('../models/categories.js');
const stringSimilarity = require('string-similarity'); // npm install string-similarity
const multer = require('multer');
const Papa = require('papaparse');
const XLSX = require('xlsx');

/**
 * Find the best matching item WITHIN a specific category's items array.
 */
// ─────────────────────────────────────────────
// MATCHING HELPERS
// ─────────────────────────────────────────────

function normalize(name = '') {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

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
 * Barcode match takes priority over fuzzy name matching — it's an exact
 * identifier, not a guess. Falls back to fuzzy name matching if no
 * barcode was provided or no item in this category has a matching one.
 */
function matchItem(incomingName, existingItems, incomingBarcode) {
  if (!existingItems || !existingItems.length) {
    return { match: null, confidence: 0, matchType: 'none' };
  }

  if (incomingBarcode) {
    const barcodeMatch = existingItems.find(i => i.barcode && i.barcode === incomingBarcode);
    if (barcodeMatch) {
      return { match: barcodeMatch, confidence: 1, matchType: 'barcode' };
    }
  }

  const target = normalize(incomingName);
  const names = existingItems.map(i => normalize(i.name));
  const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(target, names);

  return {
    match: bestMatch.rating >= 0.6 ? existingItems[bestMatchIndex] : null,
    confidence: bestMatch.rating,
    matchType: 'name',
  };
}

function classifyConfidence(confidence) {
  if (confidence >= 0.85) return 'matched';
  if (confidence >= 0.6) return 'possible_match';
  return 'new';
}

// ─────────────────────────────────────────────
// PREVIEW ENDPOINT
// ─────────────────────────────────────────────

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

    const existingCategories = await Category.find({ user: req.user._id.toString() });

    const preview = rows.map((row, index) => {
      const { category: categoryName, name: itemName, barcode: incomingBarcode } = row;

      if (!categoryName || !itemName) {
        return {
          rowIndex: index,
          original: row,
          status: 'invalid',
          reason: 'Missing category or item name',
        };
      }

      const categoryResult = matchCategory(categoryName, existingCategories);
      const categoryStatus = classifyConfidence(categoryResult.confidence);

      let itemResult = { match: null, confidence: 0, matchType: 'none' };
      if (categoryResult.match) {
        itemResult = matchItem(itemName, categoryResult.match.items, incomingBarcode);
      }

      // Barcode matches are always treated as 'matched' — certain, not a guess
      const itemStatus = itemResult.matchType === 'barcode'
        ? 'matched'
        : (categoryResult.match ? classifyConfidence(itemResult.confidence) : 'new');

      return {
        rowIndex: index,
        original: row,
        category: {
          status: categoryStatus,
          confidence: categoryResult.confidence,
          matchedId: categoryResult.match?._id || null,
          matchedName: categoryResult.match?.name || null,
        },
        item: {
          status: itemStatus,
          confidence: itemResult.confidence,
          matchType: itemResult.matchType,   // 'barcode' | 'name' | 'none'
          matchedId: itemResult.match?._id || null,
          matchedName: itemResult.match?.name || null,
          currentValues: itemResult.match ? {
            costPrice: itemResult.match.costPrice,
            sellingPrice: itemResult.match.sellingPrice,
            quantity: itemResult.match.quantity,
            unit: itemResult.match.unit,
            expiryDate: itemResult.match.expiryDate,
          } : null,
        },
      };
    });

    res.status(200).json({ preview });
  } catch (error) {
    console.error('Preview bulk import error:', error);
    res.status(500).json({ message: 'Failed to preview bulk import', error: error.message });
  }
};

// ─────────────────────────────────────────────
// COMMIT ENDPOINT
// ─────────────────────────────────────────────

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
          barcode,
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
            description: `Imported via bulk upload`,
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

          if (costPrice !== undefined) existingItem.costPrice = costPrice;
          if (sellingPrice !== undefined) existingItem.sellingPrice = sellingPrice;
          if (unit !== undefined) existingItem.unit = unit;
          if (expiryDate !== undefined) existingItem.expiryDate = expiryDate;

          // Fill in a barcode if this item didn't already have one
          if (barcode) existingItem.barcode = barcode;

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
            barcode: barcode || '',
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
    barcode: get('barcode', 'bar code', 'upc', 'ean') || '',
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
// ─────────────────────────────────────────────
// BARCODE LOOKUP ENDPOINT (real-time, single scan)
// ─────────────────────────────────────────────

 // was the cross-service require
const ScanLog = require('../models/scanLog.js');
const lookupBarcode = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

   const { code } = req.params;
    const { sellerName } = req.query; // NEW —
    if (!code) {
      return res.status(400).json({ message: 'No barcode provided' });
    }

    await connectDB();

    const category = await Category.findOne({
      user: req.user._id.toString(),
      'items.barcode': code,
    });

  if (category) {
  const item = category.items.find(i => i.barcode === code);

  // ── Scan logging — genuinely non-blocking now. We don't await this,
  // so a slow or failing write can never delay the cashier's response.
  // Errors still get logged server-side via .catch(), just not awaited. ──
  ScanLog.create({
    user: req.user._id,
    sellerName: sellerName || 'Unknown',
    barcode: code,
    categoryId: category._id,
    itemId: item._id,
    itemName: item.name,
    priceAtScan: item.sellingPrice,
    outcome: 'added_to_cart',
  }).catch(logError => {
    console.error('Scan log write failed (non-blocking):', logError.message);
  });

  // Response fires immediately — doesn't wait for the log write above
  return res.status(200).json({
    found: true,
    source: 'business',
    categoryId: category._id,
    categoryName: category.name,
    item: {
      _id: item._id,
      name: item.name,
      barcode: item.barcode,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      quantity: item.quantity,
      unit: item.unit,
    },
  });
}

    return res.status(200).json({
      found: false,
      source: null,
      message: 'No item in your inventory matches this barcode.',
    });

  } catch (error) {
    console.error('Barcode lookup error:', error);
    res.status(500).json({ message: 'Failed to look up barcode', error: error.message });
  }
};
// ─────────────────────────────────────────────
// SCAN HISTORY ENDPOINT (read-only reporting)
// ─────────────────────────────────────────────



const getScanLogs = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };

    // Optional date range filter
    if (req.query.startDate && req.query.endDate) {
      const start = new Date(req.query.startDate);
      const end = new Date(req.query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    // Optional seller filter — lets Notwane check one staff member's activity
    if (req.query.sellerName) {
      filter.sellerName = req.query.sellerName;
    }

    await connectDB();

    const [logs, totalCount] = await Promise.all([
      ScanLog.find(filter)
        .sort({ createdAt: -1 }) // most recent first
        .skip(skip)
        .limit(limit),
      ScanLog.countDocuments(filter),
    ]);

    res.status(200).json({
      logs,
      totalCount,
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    });
  } catch (error) {
    console.error('Get scan logs error:', error);
    res.status(500).json({ message: 'Failed to fetch scan logs', error: error.message });
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
   lookupBarcode,
  getScanLogs,
  upload, // export multer config so the route can use it
};