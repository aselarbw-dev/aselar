const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false // Disable deprecated headers
});

// Authentication-specific rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  handler: (req, res) => {
    res.set({
      'X-RateLimit-Remaining': req.rateLimit.remaining,
      'X-RateLimit-Reset': Math.ceil(req.rateLimit.resetTime / 1000)
    });
    res.status(429).json({ 
      message: 'Too many login attempts, please try again later' 
    });
  }
});


// Password reset rate limiter (very strict)
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset attempts per hour
  message: {
    status: 'fail',
    message: 'Too many password reset attempts, please try again later'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter
};