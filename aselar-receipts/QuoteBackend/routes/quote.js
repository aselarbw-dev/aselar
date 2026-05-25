const express=require("express")
const {quote,getAllQuotes,deleteQuote,getQuote}=require("../controllers/quote.js")
const { protect } = require('../../Shared/protect'); // Correct path to Backend service
const router=express.Router()
router.post("/quote",protect,quote)
router.get("/get-new-quote",protect,getQuote)
router.get("/get-all-quotes",protect,getAllQuotes)
router.delete("/quotes/:id", protect, deleteQuote);
module.exports=router