const express=require("express")
const { protect } = require('../../Shared/protect'); // Correct path to Backend service
const {debtNoteSMSUpload, generateDebtNoteQR}=require("../config/smsUpload")
const router=express.Router()
router.post("/sms-debt",protect,debtNoteSMSUpload)
router.post('/generate-qr-debt',protect, generateDebtNoteQR);
module.exports=router