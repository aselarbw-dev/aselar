const express=require("express")
const multer = require('multer');
const {sendSMS,sendWhatsApp}=require("../controllers/sms")
const {SMSUpload, generateQR, WhatsAppUpload,EmailUpload  }=require("../config/smsUpload")
const {protect}=require("../../Shared/protect.js") // Adjust the path as necessary
const router=express.Router()
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = 'upload/receipts/';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-receipt.pdf`);
    },
  });
  const upload = multer({ storage });
  
//app.post('/send-sms', upload.single('pdf')
router.post("/sms-receipt",protect, SMSUpload)
router.post("/whatsapp-receipt", protect,WhatsAppUpload);
router.post('/generate-qr',protect, generateQR);
router.post('/email-receipt',protect, EmailUpload);
module.exports=router