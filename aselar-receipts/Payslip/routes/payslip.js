const express = require('express');
const {postPaySlip,getPaySlips,getAllPayslips,getNewlatest}=require("../controllers/payslip")
const { protect } = require('../../Shared/protect'); // Correct path to Backend service
const router = express.Router();
router.post("/pay-slips",protect,postPaySlip)
router.get("/pay-slips",protect,getPaySlips)
router.get("/latest-payslip",protect,getNewlatest)
router.get("/all-pays",protect,getAllPayslips)
module.exports=router