// middlewares/csrfProtection.js
const csrf = require('csurf');

// Configure CSRF protection
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Use 'lax' in development
    key:'X-CSRF-Token', // Cookie name
    path: '/'
  }
});

// Token generation middleware
const generateCsrfToken = (req, res, next) => {
  // Check if the csrfToken function exists (middleware applied correctly)
  if (!req.csrfToken || typeof req.csrfToken !== 'function') {
    console.error('CSRF middleware error: csrfToken function not available');
    return next();
  }

  try {
    // Generate token for GET requests to set cookie for subsequent requests
    if (req.method === 'GET') {
      const token = req.csrfToken();
      res.cookie('XSRF-TOKEN', token, {
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });
    }
    next();
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    next(error);
  }
};

module.exports = {
  csrfProtection,
  generateCsrfToken
};