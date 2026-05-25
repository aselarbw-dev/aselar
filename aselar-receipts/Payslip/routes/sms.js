const express=require("express")
const { protect } = require('../../Shared/protect'); // Correct path to Backend service
const {payslipSMSUpload, generatePayslipQR}=require("../config/payslipSMS")
const router=express.Router()
router.post("/sms-payslip",protect,payslipSMSUpload)
router.post('/generate-qr-payslip',protect, generatePayslipQR);
module.exports=router