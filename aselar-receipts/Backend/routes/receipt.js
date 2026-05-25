const express=require('express')
const router=express.Router()
const {receipt,getReceipts,getAllReceipts}=require("../controllers/receipt.js")

const {protect}=require("../middlewares/protect.js")
router.post("/quick-receipt",protect,receipt)
router.get("/get-receipts",protect,getReceipts)
router.get("/all-receipts",getAllReceipts)
module.exports=router
