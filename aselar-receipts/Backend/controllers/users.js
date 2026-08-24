const User=require("../models/userModel.js")
const jwt=require("jsonwebtoken")
const asyncHandler=require("express-async-handler")
const bcrypt=require("bcryptjs")
const crypto = require("crypto");
const geocodePlace = require("../middlewares/geocode");
const sendEmail = require("../utils/email.js");
const rateLimit = require('express-rate-limit');
const cloudinary = require('cloudinary').v2;
const fs = require("fs");
// Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};
console.log('JWT Secret:', process.env.JWT_SECRET);
const token = jwt.sign({ _id: "testId" }, "temporarySecret", { expiresIn: "1d" });
console.log('Hardcoded Token:', token);
// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, message: 'Too many login attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '2h'; // Longer for cookies since they're httpOnly
const COOKIE_MAX_AGE = 2 * 60 * 60 * 1000; // 2 
// In-memory session store (use Redis in production)
const activeSessions = new Map();

// Generate session and set cookie
const createSession = (res, user) => {
  const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const payload = {
    userId: user._id,
    email: user.emailBusiness,
    sessionId
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  // Store session
  activeSessions.set(sessionId, {
    userId: user._id,
    createdAt: new Date(),
    lastActivity: new Date(),
    userAgent: null
  });

  // Set secure HTTP-only cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/'
  });

  return { sessionId, token };
};
// Middleware to verify cookie-based authentication
const requireAuth = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Check if session is still active
    const session = activeSessions.get(decoded.sessionId);
    if (!session) {
      res.clearCookie('authToken');
      return res.status(401).json({ 
        success: false, 
        message: 'Session expired' 
      });
    }

    // Update last activity
    session.lastActivity = new Date();
    req.session = session;
    
    next();
  } catch (error) {
    res.clearCookie('authToken');
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Session expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid session' 
    });
  }
};
const registerBusiness = asyncHandler(async(req, res) => {
    // extract parameters from the request body
    const {nameOfBusiness, password, emailBusiness, businessPhone, place, city} = req.body
    const file = req.file;

    if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    console.log('Received file:', file);

    // Upload to Cloudinary
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_SECRET
    });
    let result;
    try {
        result = await cloudinary.uploader.upload(file.path, {
            folder: "Aselar"
        });
        console.log('Cloudinary Response:', result);
        // Optional: Clean up the local file after upload
        const fs = require('fs');
        fs.unlink(file.path, (err) => {
            if (err) console.error('Error deleting local file:', err);
        });
    } catch (error) {
        console.log(error.message)
    }

    // validate all parameters
    if (!nameOfBusiness || !password || !emailBusiness || !businessPhone) {
        res.status(400)
        throw new Error("Please enter all fields to register your business")
    }
    
    // validate email strength, do more here
    // Validate email format
    if (!emailBusiness.match(/\S+@\S+\.\S+/)) {
        res.status(400);
        throw new Error("Please provide a valid email address");
    }

    // Enhanced password validation - now handled by the model, but keeping your existing check as backup
    if (password.length < 9 && !password.includes("_")) {
        res.status(401)
        throw new Error("Password is weak, please revise it.")
    }
    
    // check if email exists
    const checkEmailExistence = await User.findOne({emailBusiness})
    if (checkEmailExistence) {
        res.status(400)
        throw new Error("Email has already been registered.")
    }
    
    // if email doesn't exist, create user (model will handle password validation)
   let location;
    try {
        location = await geocodePlace(`${place}, ${city}, Botswana`);
    } catch (err) {
        console.warn("Geocoding failed during registration:", err.message);
    }
    
    try {
        const user = await User.create({
            nameOfBusiness,
            password,
            emailBusiness,
            businessPhone,
            place,   // NEW
            city,    // NEW
            profilePicture: result.secure_url,
            ...(location && { location, geocodedAt: new Date() }), // NEW
        })

        const { sessionId } = createSession(res, user);

        const session = activeSessions.get(sessionId);
        if (session) {
            session.userAgent = req.headers['user-agent'];
        }

        const token = jwt.sign(
            { id: user._id, sessionId },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );
        console.log(token)

        res.cookie("token", token, {
            path: "/",
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: "strict",
            secure: false
        });
        
        if (user) {
            res.status(201).json({
                message: "Business profile created successfully",
                data: {
                    id: user._id,
                    nameOfBusiness: user.nameOfBusiness,
                    emailBusiness: user.emailBusiness,
                    profilePicture: user.profilePicture,
                    businessPhone: user.businessPhone,
                    place: user.place,   // NEW
                    city: user.city,     // NEW
                },
                token,
            });
        } else {
            res.status(500)
            throw new Error("Something went wrong, please try later.")
        }
    } catch (error) {
        if (error.name === 'ValidationError') {
            res.status(400);
            throw new Error(error.message);
        }
        throw error;
    }
})
// Enhanced login controller with rate limiting
const loginBusiness = asyncHandler(async(req, res) => {
    const {emailBusiness, password} = req.body
    
    if (!emailBusiness || !password) {
        res.status(400)  
        throw new Error("Please register, email or password is not correct.")
    }
    if (password!==password){
      res.status(401)
      throw new Error("Invalid email or password.")
    }
    // Use the enhanced authentication method with built-in rate limiting
    const authResult = await User.getAuthenticated(emailBusiness, password);
    
    if (!authResult.success) {
        res.status(400);
        throw new Error(authResult.message);
    }

    // Login successful
    const user = authResult.user;
    const token = generateToken(user._id);
    console.log(token);
   
   const { sessionId } = createSession(res, user);

    // Update session with user agent
    const session = activeSessions.get(sessionId);
    if (session) {
      session.userAgent = req.headers['user-agent'];
    }



    // Send HTTP-only cookie
    res.cookie("token", token, {
  path: "/",
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000,
  sameSite: "none",   // ← changed from "strict"
  secure: true,   // 👈 Automatically true in production
});


    // Return user data (keeping your existing response structure)
    const {_id, name, nameOfBusiness,scanOnlyMode, emailBusiness: userEmail, businessPhone} = user;
    // In your loginBusiness function, replace the final response with:
res.status(200).json({
    success: true,        // ← Add this
    id: user._id,         // ← Use 'id' instead of '_id'
    _id,                  // ← Keep this for backward compatibility
    name,
    nameOfBusiness,
    emailBusiness: userEmail,
    businessPhone,
    scanOnlyMode,
    token                 // ← Add token to response body
});
})


const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password" // Exclude the password field
  );

  if (user) {
    res.status(200).json({
      _id: user._id,
      name: user.name,
      nameOfBusiness: user.nameOfBusiness,
      emailBusiness: user.emailBusiness,
      businessPhone: user.businessPhone,
      profilePicture: user.profilePicture, // Include profile picture
    });
  } else {
    res.status(404);
    throw new Error("User not found. Please register.");
  }
});

// Get Login Status
const loginStatus = asyncHandler(async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json(false);
  }
  // Verify Token
  const verified = jwt.verify(token, process.env.JWT_SECRET);
  if (verified) {
    return res.json(true);
  }
  return res.json(false);
});


// create logout,retired seesion
const BlacklistedToken = require('../models/blacklistedTokenModel'); // Import the model

const logoutBusiness = asyncHandler(async (req, res) => {
  try {
    const token = req.cookies.token;
      const { reason, timestamp, userId } = req.body;
    // Add token to database blacklist
    if (token) {
      await BlacklistedToken.create({ token });
    }
 if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Remove session
        activeSessions.delete(decoded.sessionId);
        
        console.log(`User logout: ${userId || decoded.userId}, Session: ${decoded.sessionId}, Reason: ${reason}, Time: ${timestamp}`);
      } catch (error) {
        // Token might be expired, but still clear cookie
        console.log(`Logout with invalid token: ${userId}, Reason: ${reason}, Time: ${timestamp}`);
      }
    }
    // Clear the cookie
    res.cookie("token", "", {
      path: "/",
      httpOnly: true,
      expires: new Date(0),
      sameSite: "none",
      secure: process.env.NODE_ENV === "production"
    });

    return res.status(200).json({ message: "Successfully Logged Out" });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: "Logout failed" });
  }
});

// validate session
// Session validation endpoint
const validateSession=(async(req, res) => {
  // If we reach here, the session is valid (middleware passed)
  res.json({
    success: true,
    message: 'Session is valid',
    expiresAt: new Date(req.user.exp * 1000).toISOString()
  });
});

// extend session
const extendSession=(async (req, res) => {
  try {
    // Update last activity (already done in middleware)
    // Optionally refresh the cookie with new expiration
    const user = { _id: req.user.userId };
    createSession(res, user);

    res.json({
      success: true,
      message: 'Session extended'
    });

  } catch (error) {
    console.error('Session extension error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend session'
    });
  }
});
// Login success tracking
const successLogin=( async(req, res) => {
  try {
    const { timestamp, userAgent } = req.body;
    
    console.log(`Login success: User ${req.user.userId}, Session: ${req.user.sessionId}, Time: ${timestamp}, UA: ${userAgent}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Login success tracking error:', error);
    res.status(500).json({ success: false });
  }
});
// Session cleanup job
const cleanupExpiredSessions = () => {
  const now = new Date();
  const maxAge = COOKIE_MAX_AGE;

  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastActivity > maxAge) {
      activeSessions.delete(sessionId);
    }
  }
};

// Run cleanup every 30 minutes
setInterval(cleanupExpiredSessions, 30 * 60 * 1000);
// Forgot Password
const forgotPassword = asyncHandler(async (req, res) => {
  const { emailBusiness } = req.body;

  if (!emailBusiness) {
    res.status(400);
    throw new Error("Please provide your business email");
  }

  const user = await User.findOne({ emailBusiness });

  if (!user) {
    res.status(404);
    throw new Error("No account found with this email");
  }

  // Generate and hash reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Save token with expiration (10 mins)
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  // Construct reset URL (use your frontend URL)
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  // Email content (plain text version)
  const message = `
    Hello ${user.nameOfBusiness || "User"},

    You requested a password reset. Click the link below to proceed:
    ${resetUrl}

    This link expires in 10 minutes.
    If you didn't request this, please ignore this email.

    Regards,
    ${process.env.EMAIL_FROM_NAME}
  `;

  try {
    await sendEmail({
      email: user.emailBusiness, // Matches your middleware's expected 'email' field
      subject: "Password Reset Request",
      message: message,
    });

    res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    // Clear token if email fails
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(500);
    throw new Error("Email could not be sent. Please try again later.");
  }
});

// Reset Password
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    res.status(400);
    throw new Error("Please provide a new password");
  }

  // Hash token for DB comparison
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // Find user with valid token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired token");
  }

  // Apply same password rules as registration
  if (password.length < 9 || !password.includes("_")) {
    res.status(400);
    throw new Error("Password must be at least 9 characters and contain an underscore");
  }

  // Update password and clear token
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully. Please login with your new password.",
  });
});
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id; // From JWT middleware

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error("Please provide both current and new password");
  }

  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Verify current password
  const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordCorrect) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  // Validate new password strength (same rules as registration)
  if (newPassword.length < 9 || !newPassword.includes("_")) {
    res.status(400);
    throw new Error("New password must be at least 9 characters and contain an underscore");
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});
const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id; // From JWT middleware

  // 1. Delete user from DB
  const deletedUser = await User.findByIdAndDelete(userId);
  
  if (!deletedUser) {
    res.status(404);
    throw new Error("User not found");
  }

  // 2. Clear cookie (immediate logout)
  res.cookie("token", "", {
    path: "/",
    httpOnly: true,
    expires: new Date(0), // Set to past date
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  // 3. Send response with redirect URL
  res.status(200).json({
    success: true,
    redirectTo: "/goodbye", // Frontend will handle this
    message: "Account deleted successfully",
  });
});
const getMe = async (req, res) => {
  try {
    await connectDB();
    res.status(200).json({
      id: req.user._id, // Your userId
      nameOfBusiness: req.user.nameOfBusiness,
      emailBusiness: req.user.emailBusiness
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
// publicUserBusinesses — new, uses only the User model, no verifyModel involved
const publicBusinesses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12 } = req.query;

  const [businesses, total] = await Promise.all([
    User
      .find({})
      .select("nameOfBusiness profilePicture businessPhone place city location _id")
      .sort({ createdAt: -1 }) // newest first
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(),
    User.countDocuments({}),
  ]);

  res.json({ businesses, total, page: Number(page), pages: Math.ceil(total / limit) });
});
const updateUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { nameOfBusiness, emailBusiness, businessPhone } = req.body;
  const file = req.file; // optional, if they're changing the picture

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // If email is changing, make sure it's not taken by someone else
  if (emailBusiness && emailBusiness !== user.emailBusiness) {
    if (!emailBusiness.match(/\S+@\S+\.\S+/)) {
      res.status(400);
      throw new Error("Please provide a valid email address");
    }
    const emailTaken = await User.findOne({
      emailBusiness,
      _id: { $ne: userId },
    });
    if (emailTaken) {
      res.status(400);
      throw new Error("This email is already in use by another account");
    }
    user.emailBusiness = emailBusiness;
  }

  if (nameOfBusiness) user.nameOfBusiness = nameOfBusiness;
  if (businessPhone) user.businessPhone = businessPhone;

  // Handle profile picture replacement
  if (file) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_SECRET,
    });

    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "Aselar",
      });
      user.profilePicture = result.secure_url;

      fs.unlink(file.path, (err) => {
        if (err) console.error("Error deleting local file:", err);
      });
    } catch (error) {
      console.error("Cloudinary upload failed:", error.message);
      res.status(500);
      throw new Error("Failed to upload profile picture");
    }
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: {
      _id: user._id,
      nameOfBusiness: user.nameOfBusiness,
      emailBusiness: user.emailBusiness,
      businessPhone: user.businessPhone,
      profilePicture: user.profilePicture,
    },
  });
});
// controllers/userController.js (or wherever similar settings live)
const updateScanOnlyMode = async (req, res) => {
  try {
    const { scanOnlyMode } = req.body;

    if (typeof scanOnlyMode !== 'boolean') {
      return res.status(400).json({ message: 'scanOnlyMode must be true or false' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { scanOnlyMode },
      { new: true }
    ).select('-password');

    res.status(200).json({ message: 'Scan-only mode updated', user });
  } catch (error) {
    console.error('Update scan-only mode error:', error);
    res.status(500).json({ message: 'Failed to update setting' });
  }
};


 // add to your existing exports
module.exports={registerBusiness,
  loginBusiness,
  logoutBusiness,
  getUserProfile,
  loginStatus,
  forgotPassword, 
  resetPassword,
  changePassword,
    deleteAccount,
    authLimiter,
    requireAuth,
    updateUserProfile,
    validateSession,
    extendSession,
    successLogin,
    getMe,
    publicBusinesses,
    updateScanOnlyMode
}