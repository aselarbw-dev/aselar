const express=require("express")
const {fileLogic}=require("../controllers/file.js")
const router=express.Router()
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });  
const {protect}=require("../middlewares/protect.js")
router.post("/file-uploads",upload.array('documents'), fileLogic)
module.exports=router