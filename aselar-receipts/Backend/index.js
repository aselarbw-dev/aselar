const express = require("express");

const mongoose = require("mongoose");

const dotenv = require("dotenv");
const bodyParser = require("body-parser");

const fs = require('fs');
const path = require('path');
// Import security middleware
const { setupCookieSecurity } = require('./middlewares/cookieSecurity.js');


const app = express();
dotenv.config();
// Trust proxy (important for rate limiting and IP detection)
app.set('trust proxy', 1);
// Basic parsing middleware
app.use(bodyParser.json({ limit: '5mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
setupCookieSecurity(app);

    const smsRoute = require('./routes/sms.js');
const businessRoute = require("./routes/business.js");
const businessAuth = require("./routes/users.js");
const receiptRoute = require("./routes/receipt.js");
const categoryRoute = require("./routes/categories.js");
const quoteRoute = require("./routes/quote.js");
const invoiceRoute = require("./routes/invoice.js");
const legderRoute = require("./routes/ledger.js");
const servicesRoute = require("./routes/services.js");
const scannedProducts = require("./routes/product.js");
const expenseList = require("./routes/expenses.js");
const paySlips = require("./routes/payslip.js");
const passcode = require("./routes/passcode.js");
const inventoryReceipt = require("./routes/inventoryRoute.js");
const bankingRoute = require("./routes/banking.js");
const drawerRoute = require("./routes/drawer.js");
const sellersRoute = require("./routes/dailySeller.js");
// Apply routes
app.use("/api", smsRoute);
app.use("/api", businessRoute);
app.use("/api", businessAuth);
app.use("/api", receiptRoute);
app.use("/api", categoryRoute);
app.use("/api", quoteRoute);
app.use("/api", invoiceRoute);
app.use("/api", legderRoute);
app.use("/api", servicesRoute);
app.use("/api", scannedProducts);
app.use("/api", expenseList);
app.use("/api", paySlips);
app.use("/api", passcode);
app.use("/api",inventoryReceipt);
app.use("/api", bankingRoute);
app.use("/api", drawerRoute);
app.use("/api", sellersRoute);


// 5. Static file serving
app.use('/upload', express.static('upload'));



app.get('/test-cookie', (req, res) => {
  console.log('Cookies:', req.cookies);
  res.json({ cookies: req.cookies });
});

app.get("/", (req, res) => {
  res.send('Hello, Helmet is working!');
  console.log("Home route...");
});

//  Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'upload/receipts');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// mongoose

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
  })
  //  Connect to MongoDB
  .then(() => {
    console.log("Connected to MongoDB");



    // Start server only after successful DB connection
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`Server running on port ${port}, connected to Database`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });


  /*
  app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://avelarai.vercel.app',
    'https://avelarai-git-main-avelarai269-4786s-projects.vercel.app'
  ],
  credentials: true
}));
*/
  // Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Clear cookies on authentication errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    const { clearAuthCookies } = require('./middlewares/cookieSecurity.js');
    clearAuthCookies(res);
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});