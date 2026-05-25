const express=require("express")
const { protect } = require('../../Shared/protect'); // Correct path to Backend service
const router=express.Router()
const { SMSInvoiceUpload, generateQRInvoice }=require("../config/smsUpload")
router.post("/sms-invoice",protect,SMSInvoiceUpload)
router.post('/generate-invoice-qr',protect, generateQRInvoice);
module.exports=router