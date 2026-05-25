// shared/auth/middleware.js
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connectDB, isConnected } = require('./config');

const protect = async (req, res, next) => {
    try {
        // Add this debug log inside the function
        console.log("🔥 protect middleware hit — DB state:", mongoose.connection.readyState);
        
        // Ensure database connection
        if (!isConnected()) {
            console.log('🔐 Auth middleware: Connecting to database...');
            await connectDB();
        }

        // Quick check - if still not connected, return 503
        if (mongoose.connection.readyState !== 1) {
            console.log(`🚨 Auth middleware: DB not ready. State: ${mongoose.connection.readyState}`);
            return res.status(503).json({ 
                message: "Service temporarily unavailable",
                dbState: mongoose.connection.readyState
            });
        }

        // Import User model after ensuring DB connection
        const User = require('./model');

        const token = req.cookies.token;
        console.log('🔐 Token from cookies:', token ? 'Present' : 'Missing');

        if (!token) {
            return res.status(401).json({
                message: "Not authorized, please login"
            });
        }

        const verified = jwt.verify(token, process.env.JWT_SECRET);
        const userId = verified.id;
        console.log('🔐 Verified user ID:', userId);

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: "Invalid token" });
        }

        const user = await User.findById(userId).select("-password");
        console.log('🔐 User found:', user ? 'Yes' : 'No');

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        console.log('🔐 User attached to request:', req.user._id);
        next();
    } catch (error) {
        console.error('🔐 JWT Error:', error);
        
        // Handle specific MongoDB connection errors
        if (error.name === 'MongoNetworkError' || 
            error.name === 'MongooseServerSelectionError' ||
            error.message?.includes('buffering timed out')) {
            return res.status(503).json({ 
                message: "Database service unavailable" 
            });
        }
        
        // Handle JWT errors
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Invalid or expired token" });
        }
        
        return res.status(401).json({ message: "Authentication failed" });
    }
};

// Additional utility function for services that need to initialize auth
const initializeAuth = async () => {
    try {
        await connectDB();
        console.log('🔐 Shared auth system initialized');
        return true;
    } catch (error) {
        console.error('🔐 Failed to initialize auth system:', error);
        return false;
    }
};

module.exports = { 
    protect,
    initializeAuth,
    connectDB,
    isConnected
};