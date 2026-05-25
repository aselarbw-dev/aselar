const express=require("express")
const {ledgerController,getRecentLedger,getAllLedgers}=require("../controllers/ledger.js")
const router=express.Router()
router.post("/ledger",ledgerController)
router.get("/recent-ledger",getRecentLedger)
router.get("/all-ledgers",getAllLedgers)
//router.delete("/ledger/:id",deleteLedger)
module.exports=router