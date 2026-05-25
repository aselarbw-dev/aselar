const express=require("express")
const { protect } = require('../../Shared/protect'); // Correct path to Backend service
const {SMSUpload, generateQR, EmailUpload}=require("../config/smsUpload")
const router=express.Router()
router.post("/sms-quote",protect,SMSUpload)
router.post('/generate-qr',protect, generateQR);
router.post('/email-quote',protect, EmailUpload);
module.exports=router