const express=require("express")
const {quote,getAllQuotes,getQuote}=require("../controllers/quote.js")
const router=express.Router()
router.post("/quote",quote)
router.get("/get-new-quote",getQuote)
router.get("/get-all-quotes",getAllQuotes)
module.exports=router