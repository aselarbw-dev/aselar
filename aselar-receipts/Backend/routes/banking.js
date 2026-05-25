const express=require("express");
const { protect } = require('../middlewares/protect');
const router=express.Router();
const {createBankingDetails,
  getAllBankingDetails,getMostRecentBankingDetails}= require("../controllers/banking");
// Route to create banking details
  router.post("/banking",protect, createBankingDetails);
  router.get("/banking", protect, getAllBankingDetails);
   router.get("/user-banking", protect, getMostRecentBankingDetails);
  module.exports=router;