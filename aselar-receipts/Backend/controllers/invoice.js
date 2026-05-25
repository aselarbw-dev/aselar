const invoiceSchema=require("../models/invoiceModel.js")
const asyncHandler=require("express-async-handler")
// controller function for invoice
const invoice=asyncHandler(async(req,res)=>{
// get request body
const {fields,addition}=req.body
  try {
    const newInvoice =await invoiceSchema.create({
        fields, // Now an array of input objects
        addition
        
    });

    await newInvoice.save();
    res.status(201).json(newInvoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
 

    
})

// get current most quote
const getInvoice = asyncHandler(async (req, res) => {
  try {
    const recentInvoice = await invoiceSchema.findOne().sort({ createdAt: -1 });

    if (!recentInvoice) {
      return res.status(404).json({ message: "No invoices found" });
    }

    res.status(200).json(recentInvoice);
  } catch (error) {
    console.error("Error fetching the latest invoicet:", error);
    res.status(500).json({ message: "Error fetching the latest invoice" });
  }
});
// Get all quotes
const getAllInvoices = asyncHandler(async (req, res) => {
  try {
    const invoices = await invoiceSchema.find().sort({ createdAt: -1 }); // Fetch all receipts sorted by newest first

    if (!invoices.length) {
      return res.status(404).json({ message: "No invoices found" });
    }

    res.status(200).json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ message: "Error fetching invoices" });
  }
});
module.exports={invoice,getAllInvoices,getInvoice}