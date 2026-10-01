const ReceiptPolicy = require('../models/receiptPolicy');

// ---------- helpers ----------
const MAX_LENGTH = 1000;

const normalizeClause = (text) =>
  String(text || '').trim().replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');

// POST /receipt-policy - Save a new refund/liability clause for this business
exports.createReceiptPolicy = async (req, res) => {
  try {
    const userId = req.user._id; // from protect middleware
    const clause = normalizeClause(req.body.clause);

    if (!clause) {
      return res.status(400).json({ error: 'Clause text is required' });
    }
    if (clause.length > MAX_LENGTH) {
      return res.status(400).json({
        error: `Clause must be ${MAX_LENGTH} characters or less`,
        code: 'CLAUSE_TOO_LONG',
      });
    }

    const policy = await ReceiptPolicy.create({
      user: userId,
      clause,
      timestamp: new Date(),
    });

    res.status(201).json(policy);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /receipt-policy - Latest clause for this business
// Returns 200 with clause: '' when none is set, so receipts don't hit an error
exports.getReceiptPolicy = async (req, res) => {
  try {
    const userId = req.user._id;

    const policy = await ReceiptPolicy.findOne({ user: userId }).sort({ timestamp: -1 });

    if (!policy) {
      return res.status(200).json({ clause: '' });
    }

    res.status(200).json(policy);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};