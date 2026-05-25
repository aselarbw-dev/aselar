const DailySeller = require('../models/DailySeller');

// POST: Submit new seller for the day (per user)
exports.createDailySeller = async (req, res) => {
  try {
    const { name, date } = req.body;
    const userId = req.user._id; // Pulled from protect middleware

    if (!name || !date || !userId) {
      return res.status(400).json({ error: 'Name, date, and authenticated user are required' });
    }

    // Check for existing entry for this user/date
    const existing = await DailySeller.findOne({ user: userId, date }).sort({ timestamp: -1 });
    if (existing) {
      // Update timestamp for re-login same day
      existing.timestamp = new Date();
      await existing.save();
      // Optionally populate user for full response
      await existing.populate('user', 'name'); // Just name, if needed
      return res.status(200).json(existing);
    }

    const newSeller = new DailySeller({
      name,
      user: userId,
      date,
      timestamp: new Date() // Precise time
    });
    await newSeller.save();
    // Optionally populate user
    await newSeller.populate('user', 'name');
    res.status(201).json(newSeller);
  } catch (error) {
    console.error(error); // For debugging
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /:date - Most recent seller for that day (optional ?userId=...)
exports.getMostRecentForDay = async (req, res) => {
  try {
    const { date } = req.params;
    const { userId } = req.query; // Optional filter

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    let query = { date };
    if (userId) {
      query.user = userId;
    }

    const seller = await DailySeller.findOne(query).sort({ timestamp: -1 }).populate('user', 'name');
    if (!seller) {
      return res.status(404).json({ error: 'No seller found for this date' });
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