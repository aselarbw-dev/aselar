const express=require("express")
const { protect } = require('../../Shared/protect'); // Correct path to Backend service
const { SMSUpload, generateQR,EmailUpload}=require("../config/SMSUpload")
const router=express.Router()
router.post("/sms-receipt",protect,SMSUpload)
router.post('/generate-qr',protect, generateQR);
router.post ('/email-receipt',protect,EmailUpload)
module.exports=router