const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
// Import shared auth system and DB connector
const { initializeAuth, connectDB, isConnected } = require('../Shared/protect');

const app = express();
app.use('/upload', express.static('upload'));
const uploadsDir = path.join(__dirname, 'upload/receipts');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: [
    'https://aselarbw.com',
          'http://localhost:5173',
         process.env.FRONTEND_URL,
    'https://aselar.vercel.app',
           
         ],
  credentials: true
}));

// Routes
const receiptRoute = require("./routes/receipt.js");
const smsRoute=require("./routes/sms.js");
const qrReceipt=require("./routes/sms.js");
app.use('/api', receiptRoute);
app.use('/api', smsRoute);
app.use('/api',qrReceipt)
// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'File Service',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('🔥 Global error handler:', error);
  
  if (error.name === 'MongoNetworkError' || 
      error.name === 'MongooseServerSelectionError') {
    return res.status(503).json({ 
      message: 'Database service temporarily unavailable' 
    });
  }
  
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Initialize and start server
const startServer = async () => {
  try {
    console.log('📁 Initializing File Service...');

    // Step 1: Auth system (also connects DB for auth)
    const authInitialized = await initializeAuth();
    if (!authInitialized) {
      console.error('❌ Failed to initialize auth system');
      process.exit(1);
    }

    // Step 2: Connect DB for File Service local models if needed
    if (!isConnected()) {
      console.log('📂 Connecting DB for File Service models...');
      await connectDB();
    }

    const port = process.env.PORT || 5005;
    app.listen(port, () => {
      console.log(`📁 Receipt Service running on port ${port}, with shared auth system`);
    });
  } catch (error) {
    console.error('❌ Failed to start File Service:', error);
    process.exit(1);
  }
};

startServer();
