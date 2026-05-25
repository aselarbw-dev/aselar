const express=require('express')
const router=express.Router()
const {receipt,getReceipts,getAllReceipts,deleteReceipt}=require("../controllers/receipt.js")

const { protect } = require('../../Shared/protect'); // Correct path to Backend service

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
router.post("/quick-receipt",protect,receipt,handleAuthError)
router.get("/get-receipts",protect,getReceipts,handleAuthError)
router.get("/all-receipts",protect,getAllReceipts,handleAuthError)
router.delete("/receipts/:id", protect, deleteReceipt, handleAuthError);
module.exports=router
