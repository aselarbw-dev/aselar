const express = require('express');
const {postPaySlip,getPaySlips,getNewlatest}=require("../controllers/payslip")
const router = express.Router();
router.post("/pay-slips",postPaySlip)
router.get("/pay-slips",getPaySlips)
router.get("/latest-payslip",getNewlatest)
module.exports=router