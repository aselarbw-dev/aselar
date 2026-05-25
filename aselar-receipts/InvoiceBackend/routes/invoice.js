const express=require("express")
const {invoice, getAllInvoices, getInvoice,markAsPaid,deleteInvoice, getAgingReport}=require("../controllers/invoice")
const { protect } = require('../../Shared/protect'); // Correct path to Backend service
const router=express.Router()
router.post("/invoice",protect,invoice)
router.get("/get-invoices",protect,getAllInvoices)
router.get("/recent-invoice",protect,getInvoice)
router.get("/aging-report",protect,getAgingReport);
router.patch("/invoices/:id/pay",protect,markAsPaid);
router.delete("/invoices/:id", protect, deleteInvoice);
module.exports=router