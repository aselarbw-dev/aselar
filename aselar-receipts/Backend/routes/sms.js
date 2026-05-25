const express=require("express")
const multer = require('multer');
const {sendSMS}=require("../controllers/sms")
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
router.post("/sms-receipt", upload.none(),sendSMS)
module.exports=router