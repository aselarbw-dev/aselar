const rateLimit = require('express-rate-limit');
const User = require("../models/userModel.js");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const cloudinary = require('cloudinary').v2;

// Failed login attempt tracking (you'll need to add this to your User model)
const FailedLoginAttempt = require('../models/failedLoginAttemptModel');

// Rate limiter configuration
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Allow 3 login attempts per window
    handler: async (req, res, next) => {
        const { emailBusiness } = req.body;
        const ip = req.ip;
        
        // Record the failed attempt
        await recordFailedAttempt(emailBusiness, ip);
        
        // Get recent failed attempts count
        const attempts = await getFailedAttempts(emailBusiness, ip);
        
        if (attempts >= 4) {
            // On 4th+ attempt, redirect to waiting page
            return res.status(429).redirect('/waiting-page?warning=suspension');
        }
        
        // For first 3 attempts, show error
        res.status(429).json({ 
            error: 'Too many login attempts. Please try again later.' 
        });
    },
    skipSuccessfulRequests: true // Only count failed attempts
});

// Helper functions for tracking failed attempts
async function recordFailedAttempt(email, ip) {
    try {
        await FailedLoginAttempt.create({
            email,
            ip,
            createdAt: new Date()
        });
    } catch (error) {
        console.error('Error recording failed attempt:', error);
    }
}

async function getFailedAttempts(email, ip) {
    try {
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        return await FailedLoginAttempt.countDocuments({
            email,
            ip,
            createdAt: { $gte: fifteenMinutesAgo }
        });
    } catch (error) {
        console.error('Error getting failed attempts:', error);
        return 0;
    }
}

async function resetFailedAttempts(email, ip) {
    try {
        await FailedLoginAttempt.deleteMany({ email, ip });
    } catch (error) {
        console.error('Error resetting failed attempts:', error);
    }
}

// Modified loginBusiness controller with rate limiting
const loginBusiness = asyncHandler(async (req, res) => {
    const { emailBusiness, password } = req.body;
    
    if (!emailBusiness || !password) {
        res.status(400);
        throw new Error("Please provide both email and password.");
    }

    const user = await User.findOne({ emailBusiness });
    
    if (!user) {
        res.status(400);
        throw new Error("User not found");
    }

    const compareBcryptPassword = await bcrypt.compare(password, user.password);
    
    if (user && compareBcryptPassword) {
        // Reset failed attempts on successful login
        await resetFailedAttempts(emailBusiness, req.ip);
        
        const token = generateToken(user._id);
        
        // Send HTTP-only cookie
        res.cookie("token", token, {
            path: "/",
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            sameSite: "strict",
            secure: false
        });

        const { _id, name, nameOfBusiness, emailBusiness, businessPhone } = user;
        res.status(200).json({
            _id, name,
            nameOfBusiness,
            emailBusiness,
            businessPhone
        });
    } else {
        // Record failed attempt for incorrect password
        await recordFailedAttempt(emailBusiness, req.ip);
        
        // Check if we should send password reset email
        const attempts = await getFailedAttempts(emailBusiness, req.ip);
        if (attempts >= 6) {
            await sendPasswordResetEmail(emailBusiness);
        }
        
        res.status(400);
        throw new Error("Invalid email or password");
    }
});

// Password reset email function
async function sendPasswordResetEmail(email) {
    try {
        const user = await User.findOne({ emailBusiness: email });
        if (!user) return;

        const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { 
            expiresIn: '15m' 
        });

        // Save reset token to user (add this field to your User model)
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
        await user.save();

        // Send email with reset link (implement your email service)
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        console.log(`Password reset link for ${email}: ${resetUrl}`);
        // In production: send actual email here
    } catch (error) {
        console.error('Error sending password reset email:', error);
    }
}

// ... rest of your existing controller code ...

module.exports = {
    registerBusiness,
    loginBusiness: [loginLimiter, loginBusiness], // Apply rate limiter middleware
    logoutBusiness,
    getUserProfile
};