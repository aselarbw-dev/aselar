const QuoteModel=require("../models/quoteModel.js")
const asyncHandler=require("express-async-handler")
//create controller quote function
const quote=asyncHandler(async(req,res)=>{
const {data,totalSum}=req.body
try {
    const newQuote =await QuoteModel.create({
        data, // Now an array of input objects
        totalSum
        
    });

    await newQuote.save();
    res.status(201).json(newQuote);
} catch (error) {
    res.status(400).json({ message: error.message });
}
})
// get current most quote
const getQuote = asyncHandler(async (req, res) => {
  try {
    const recentQuote = await QuoteModel.findOne().sort({ createdAt: -1 });

    if (!recentQuote) {
      return res.status(404).json({ message: "No receipts found" });
    }

    res.status(200).json(recentQuote);
  } catch (error) {
    console.error("Error fetching the latest receipt:", error);
    res.status(500).json({ message: "Error fetching the latest receipt" });
  }
});
// Get all quotes
const getAllQuotes = asyncHandler(async (req, res) => {
  try {
    const quotes = await QuoteModel.find().sort({ createdAt: -1 }); // Fetch all receipts sorted by newest first

    if (!quotes.length) {
      return res.status(404).json({ message: "No receipts found" });
    }

    res.status(200).json(quotes);
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(500).json({ message: "Error fetching receipts" });
  }
});

module.exports={quote,getAllQuotes,getQuote}