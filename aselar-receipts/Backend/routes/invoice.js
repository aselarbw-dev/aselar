const express=require("express")
const {invoice,getAllInvoices,getInvoice}=require("../controllers/invoice")
const router=express.Router()
router.post("/invoice",invoice)
router.get("/get-invoices",getAllInvoices)
router.get("/recent-invoice",getInvoice)
module.exports=router