const express=require("express")
const cookieParser=require("cookie-parser")
const bodyParser=require("body-parser")
const dotenv=require("dotenv")
const { initializeAuth, connectDB, isConnected } = require('../Shared/protect');
dotenv.config()
const cors=require("cors")
// initiate app 
const app=express()
app.use(express.json())
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors(
    {
        origin: process.env.FRONTEND_URL || "http://localhost:5173", 
      credentials: true
      }
))
const incomeStatementRoutes = require("./routes/incomeStatement.js");
app.use("/api", incomeStatementRoutes);



// connect to database

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
      console.log('📂 Connecting DB for Aggregator Service models...');
      await connectDB();
    }

    const port = process.env.PORT || 5008;
    app.listen(port, () => {
      console.log(`📁 Aggregator Service running on port ${port}, with shared auth system`);
    });
  } catch (error) {
    console.error('❌ Failed to start File Service:', error);
    process.exit(1);
  }
};

startServer();