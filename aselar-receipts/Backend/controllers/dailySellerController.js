const DailySeller = require('../models/DailySeller');
const AuthorizedSeller = require('../models/AuthorizedSeller');

// ---------- helpers ----------
const normalizeName = (name) =>
  String(name || '').trim().replace(/\s+/g, ' ');

const toKey = (name) => normalizeName(name).toLowerCase();

// Finds the active authorized seller matching this name for this owner
const findAuthorized = (ownerId, name) =>
  AuthorizedSeller.findOne({ owner: ownerId, nameKey: toKey(name), active: true });

// ---------- AUTHORIZED SELLERS: CRUD (admin) ----------

// POST /authorized-sellers
exports.createAuthorizedSeller = async (req, res) => {
  try {
    const name = normalizeName(req.body.name);
    if (!name) {
      return res.status(400).json({ error: 'Seller name is required' });
    }

    // Safety net: if the account somehow has no sellers yet, this one becomes the owner
    const total = await AuthorizedSeller.countDocuments({ owner: req.user._id });

    const seller = await AuthorizedSeller.create({
      owner: req.user._id,
      name,
      nameKey: toKey(name),
      isOwner: total === 0,
    });
    res.status(201).json(seller);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'This seller name already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /authorized-sellers  (optional ?active=true|false) - owner listed first
exports.getAuthorizedSellers = async (req, res) => {
  try {
    const query = { owner: req.user._id };
    if (req.query.active === 'true') query.active = true;
    if (req.query.active === 'false') query.active = false;

    const sellers = await AuthorizedSeller.find(query).sort({ isOwner: -1, name: 1 });
    res.status(200).json(sellers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /authorized-sellers/:id  (rename and/or activate/deactivate)
exports.updateAuthorizedSeller = async (req, res) => {
  try {
    const seller = await AuthorizedSeller.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    // The owner entry can be renamed (typo fixes) but never deactivated
    if (req.body.active === false && seller.isOwner) {
      return res.status(400).json({
        error: 'The owner cannot be deactivated.',
        code: 'OWNER_PROTECTED',
      });
    }

    if (req.body.name !== undefined) {
      const name = normalizeName(req.body.name);
      if (!name) {
        return res.status(400).json({ error: 'Seller name cannot be empty' });
      }
      seller.name = name;
      seller.nameKey = toKey(name);
    }

    if (typeof req.body.active === 'boolean') {
      seller.active = req.body.active;
    }

    await seller.save();
    res.status(200).json(seller);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'This seller name already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /authorized-sellers/:id
exports.deleteAuthorizedSeller = async (req, res) => {
  try {
    const seller = await AuthorizedSeller.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    if (seller.isOwner) {
      return res.status(400).json({
        error: 'The owner cannot be removed.',
        code: 'OWNER_PROTECTED',
      });
    }

    await seller.deleteOne();
    res.status(200).json({ message: 'Seller removed', id: seller._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ---------- DAILY SELLER ----------

// POST: Submit new seller for the day (per user)
exports.createDailySeller = async (req, res) => {
  try {
    const { name, date } = req.body;
    const userId = req.user._id; // Pulled from protect middleware

    if (!name || !date || !userId) {
      return res.status(400).json({ error: 'Name, date, and authenticated user are required' });
    }

    let authorized = await findAuthorized(userId, name);
    let firstTimeSetup = false;

    if (!authorized) {
      // First-time setup: no sellers registered yet, so the first name typed
      // becomes the OWNER of this account (permanent, cannot be removed).
      const totalSellers = await AuthorizedSeller.countDocuments({ owner: userId });

      if (totalSellers === 0) {
        try {
          authorized = await AuthorizedSeller.create({
            owner: userId,
            name: normalizeName(name),
            nameKey: toKey(name),
            isOwner: true,
          });
          firstTimeSetup = true;
        } catch (err) {
          // Two simultaneous first logins: just re-check
          if (err.code === 11000) {
            authorized = await findAuthorized(userId, name);
          } else {
            throw err;
          }
        }
      }

      if (!authorized) {
        return res.status(403).json({
          error: 'Seller name not recognised. Ask the admin to add you.',
          code: 'SELLER_NOT_AUTHORIZED',
        });
      }
    }

    // Always store the official name from the system, not what was typed
    const officialName = authorized.name;

    // Check for existing entry for this user/date
    const existing = await DailySeller.findOne({ user: userId, date }).sort({ timestamp: -1 });
    if (existing) {
      // Re-login same day: refresh name and timestamp
      existing.name = officialName;
      existing.timestamp = new Date();
      await existing.save();
      await existing.populate('user', 'name');
      return res.status(200).json(existing);
    }

    const newSeller = new DailySeller({
      name: officialName,
      user: userId,
      date,
      timestamp: new Date() // Precise time
    });
    await newSeller.save();
    await newSeller.populate('user', 'name');

    res.status(201).json(
      firstTimeSetup
        ? { ...newSeller.toObject(), firstTimeSetup: true }
        : newSeller
    );
  } catch (error) {
    console.error(error); // For debugging
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /:date - Most recent seller for that day
exports.getMostRecentForDay = async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user._id; // from protect middleware, not query param

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const seller = await DailySeller.findOne({ date, user: userId })
      .sort({ timestamp: -1 })
      .populate('user', 'name');

    if (!seller) {
      return res.status(404).json({ error: 'No seller found for this date' });
    }

    // Security: if the admin removed/deactivated this name, deny the dashboard
    const stillAuthorized = await findAuthorized(userId, seller.name);
    if (!stillAuthorized) {
      return res.status(403).json({
        error: 'Seller no longer authorized',
        code: 'SELLER_NOT_AUTHORIZED',
      });
    }

    res.status(200).json(seller);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /all - All sellers (optional ?userId=..., ?startDate=..., ?endDate=...)
exports.getAllDailySellers = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    let query = {};

    if (userId) {
      query.user = userId;
    }
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }

    const sellers = await DailySeller.find(query)
      .sort({ date: -1, timestamp: -1 })
      .populate('user', 'name'); // Populate for full user info in responses

    res.status(200).json(sellers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};