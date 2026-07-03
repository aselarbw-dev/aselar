const express=require("express")
const cookieParser=require("cookie-parser")
const bodyParser=require("body-parser")
const dotenv=require("dotenv")
const fs = require('fs');
const path = require('path');
const { initializeAuth, connectDB, isConnected } = require('../Shared/protect');
dotenv.config()
const cors=require("cors")
// initiate app 
const app=express()
app.use(express.json())
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.json({ limit: '10mb' }));

app.use(cookieParser())

app.use(cors(
    {
        origin:['https://aselarbw.com',
          'http://localhost:5173',
         process.env.FRONTEND_URL,
    'https://aselar.vercel.app',
      ],
        //https://aselarbw.com
      credentials: true,
       methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
      }
))
//const incomeStatementRoutes = require("./routes/incomeStatement.js");
const categoryRoute = require("./routes/categories.js");
app.use("/api", categoryRoute);



// connect to database

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Category Service',
    timestamp: new Date().toISOString()
  });
});
const uploadsDir = path.join(__dirname, 'upload/receipts');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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
    console.log('📁 Initializing Categories Service...');

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

    const port = process.env.PORT || 5009;
    app.listen(port, () => {
      console.log(`📁 Categories Service running on port ${port}, with shared auth system`);
    });
  } catch (error) {
    console.error('❌ Failed to start File Service:', error);
    process.exit(1);
  }
};

startServer();