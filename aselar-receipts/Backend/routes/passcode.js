const express=require("express")
const {protect}=require("../middlewares/protect.js")
const {passcodeController,verifypasscode}=require("../controllers/passcode")

const router=express.Router()
router.post("/set-passcode",protect,passcodeController)
router.post("/verify-passcode",protect,verifypasscode)
module.exports=router