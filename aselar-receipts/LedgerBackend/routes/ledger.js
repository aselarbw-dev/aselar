const express=require("express")
const {protect}=require("../../Shared/protect.js") // Correct path to Shared service
const {ledgerController,getRecentLedger,getAllLedgers,getReconciliationData,importBankStatement, getUnreconciled, autoMatch, manualMatch, finalizeRecon}=require("../controllers/ledger.js")
const router=express.Router()
router.post("/ledger",protect,ledgerController)
router.get("/recent-ledger",protect,getRecentLedger)
router.get("/all-ledgers",protect,getAllLedgers)
router.post('/import-statement',protect, importBankStatement); // Multer handles upload
router.get('/unreconciled',protect, getUnreconciled);

router.post('/manual-match',protect, manualMatch);
router.post('/finalize-recon',protect, finalizeRecon);
// GET /api/ledgers/recon-data
router.get('/recon-data',protect, getReconciliationData);

// POST /api/ledgers/auto-match (already exists, but now updated)
router.post('/auto-match',protect, autoMatch);
//router.delete("/ledger/:id",deleteLedger)
module.exports=router