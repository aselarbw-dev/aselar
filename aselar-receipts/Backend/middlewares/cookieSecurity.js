// middleware/cookieSecurity.js - Cookie-specific security middleware
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// Cookie security middleware setup
const setupCookieSecurity = (app) => {
  // Cookie parser middleware
  app.use(cookieParser());

  // Enhanced Helmet configuration for cookie security
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    // Enhanced cookie security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    }
  }));

  // CORS with cookie support
  const corsOptions = {
    origin: function (origin, callback) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173',
         'https://aselar.vercel.app',
    'https://aselar-git-main-aselarbw-5973s-projects.vercel.app'
      ];
      
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Essential for cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
  };

  app.use(cors(corsOptions));

  // Rate limiting
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests to avoid penalizing normal usage
    skipSuccessfulRequests: false,
    // Custom key generator to handle proxies
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    }
  });

  app.use('/api', globalLimiter);

  // Auth-specific rate limiting
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    skipSuccessfulRequests: true,
    message: { error: 'Too many authentication attempts, please try again later.' },
    // Store failed attempts per IP + User combination
    keyGenerator: (req) => {
      const ip = req.ip || req.connection.remoteAddress;
      const email = req.body?.emailBusiness || 'unknown';
      return `${ip}:${email}`;
    }
  });

  app.use('/api/business-login', authLimiter);

  // Data sanitization
  app.use(mongoSanitize({ replaceWith: '_' }));

  // Custom security headers for cookies
  app.use((req, res, next) => {
    // Prevent XSS
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions policy
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // Cookie security headers
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    next();
  });

  // Cookie validation middleware for protected routes
  const validateCookieSession = (req, res, next) => {
    const authToken = req.cookies.token;
    
    if (!authToken && req.path.startsWith('/api') && 
        !req.path.includes('/business-login') && 
        !req.path.includes('/health')) {
      
      // Log potential session hijacking attempt
      console.warn(`⚠️  Unauthorized access attempt: ${req.ip} - ${req.path} - UA: ${req.get('User-Agent')}`);
      
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    next();
  };

  // Apply cookie validation to protected API routes
  app.use('/api', validateCookieSession);

  // Request logging with cookie info
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const hasAuthCookie = !!req.cookies.token;
    
    // Log suspicious cookie behavior
    const suspiciousPatterns = [
      /document\.cookie/i, // Cookie manipulation attempts
      /%2Edocument%2Ecookie/i, // Encoded cookie access
      /javascript:.*cookie/i, // XSS cookie theft
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(req.url) || 
      pattern.test(req.get('User-Agent') || '') ||
      pattern.test(JSON.stringify(req.body || ''))
    );

    if (isSuspicious) {
      console.warn(`🚨 SUSPICIOUS COOKIE REQUEST: ${timestamp} - IP: ${ip} - HasAuth: ${hasAuthCookie} - UA: ${userAgent} - URL: ${req.url}`);
    }

    // Log authentication state changes
    if (req.path.includes('/login') || req.path.includes('/logout')) {
      console.log(`🔐 Auth Event: ${req.method} ${req.path} - IP: ${ip} - HasAuth: ${hasAuthCookie}`);
    }

    next();
  });

  // Error handler for CORS and cookie issues
  app.use((err, req, res, next) => {
    if (err.message === 'Not allowed by CORS') {
      console.warn(`❌ CORS blocked: ${req.ip} - Origin: ${req.get('Origin')} - ${req.path}`);
      return res.status(403).json({
        success: false,
        message: 'CORS policy violation'
      });
    }

    next(err);
  });
};

// Utility function to clear all auth cookies
const clearAuthCookies = (res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  };

  res.clearCookie('token', cookieOptions);
  // Clear any other auth-related cookies
  res.clearCookie('sessionId', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};

// Utility function to validate cookie format
const validateCookieFormat = (cookieValue) => {
  if (!cookieValue || typeof cookieValue !== 'string') {
    return false;
  }

  // Basic JWT format validation (header.payload.signature)
  const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  return jwtPattern.test(cookieValue);
};

module.exports = { 
  setupCookieSecurity, 
  clearAuthCookies, 
  validateCookieFormat 
};