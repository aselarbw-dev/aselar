const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

// Import models
const User = require('../models/userModel');
const BlacklistedToken = require('../models/blacklistedTokenModel'); // Import blacklist model

const protect = asyncHandler(async (req, res, next) => {
  try {
    // Quick check - if not connected, return 503 immediately
    if (mongoose.connection.readyState !== 1) {
      console.log(`🚨 Auth middleware: DB not ready. State: ${mongoose.connection.readyState}`);
      return res.status(503).json({ 
        message: "Service temporarily unavailable",
        dbState: mongoose.connection.readyState
      });
    }

    // Check Authorization header first, fall back to cookie
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        message: 'Access token required',
        sessionExpired: true 
      });
    }

    // CHECK IF TOKEN IS BLACKLISTED
    const blacklistedToken = await BlacklistedToken.findOne({ token });
    if (blacklistedToken) {
      return res.status(401).json({
            success: false, 
                message: 'Token has been invalidated',
                sessionExpired: true 
      });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    const userId = verified.id 

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
  if (user.isLocked) {
            return res.status(423).json({ 
                success: false, 
                message: 'Account is locked due to failed login attempts',
                accountLocked: true 
            });
        }

        // Check if session is locked
        /*
        if (user.sessionLocked) {
            return res.status(423).json({ 
                success: false, 
                message: 'Session has been locked due to inactivity',
                sessionLocked: true,
                sessionExpired: true 
            });
        }
            */
    req.user = user; // Attach user to request object
    next();
  } catch (error) {
    console.error('JWT Error:', error);
    
    // Handle specific MongoDB connection errors
    if (error.name === 'MongoNetworkError' || 
        error.name === 'MongooseServerSelectionError') {
      return res.status(503).json({ 
        message: "Database service unavailable" 
      });
    }
    
    return res.status(401).json({ message: "Authentication failed" });
  }
});

module.exports = { protect };