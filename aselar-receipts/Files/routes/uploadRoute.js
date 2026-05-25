const express = require('express');
const { uploadFiles, getAllFiles, deleteFile } = require('../controllers/uploadController');
const multer = require('multer');
const { protect } = require('../../Shared/protect'); // Correct path to Backend service

const router = express.Router();

// Use memory storage with better error handling
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 4 // Max 4 files
  },
  fileFilter: (req, file, cb) => {
    // Add file type validation if needed
    cb(null, true);
  }
});

// Custom middleware to handle multer errors
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files' });
    }
    return res.status(400).json({ message: 'File upload error', error: error.message });
  }
  next(error);
};

// Enhanced error handling middleware for auth failures
const handleAuthError = (error, req, res, next) => {
  console.error('Route error:', error);
  
  // Handle specific database connection errors
  if (error.name === 'MongoNetworkError' || 
      error.name === 'MongooseServerSelectionError' ||
      error.message?.includes('buffering timed out')) {
    return res.status(503).json({ 
      message: 'Database service temporarily unavailable' 
    });
  }
  
  // Handle auth-related errors
  if (error.message?.includes('Not authorized') || 
      error.message?.includes('Authentication failed')) {
    return res.status(401).json({ message: error.message });
  }
  
  // Generic server error
  return res.status(500).json({ message: 'Internal server error' });
};

// Routes with better error handling
router.post('/upload', 
  protect, 
  upload.array('files', 4), 
  handleMulterError,
  uploadFiles,
  handleAuthError
);

router.get('/files', 
  protect, 
  getAllFiles,
  handleAuthError
);

router.delete('/files/:id', 
  protect, 
  deleteFile,
  handleAuthError
);

// Add a test route to verify the route file is working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Upload routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;