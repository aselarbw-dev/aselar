const {connectDB} = require('../../Shared/config');


const asyncHandler=require("express-async-handler")
// Create a receiver
const receiver = asyncHandler(async (req, res) => {
    const {companyName, addressedTo, phone, email, preparedBy} = req.body;
    
    try {
        await connectDB();
        const ReceiversModel = require("../models/receivers.js");
        
        // Debug logging
        console.log('Request body:', req.body);
        console.log('User from request:', req.user);
        
        // Check if user exists
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "User authentication required" });
        }
        
        const newReceiver = await ReceiversModel.create({
            companyName,
            addressedTo,
            phone,
            email,
            preparedBy,
            user: req.user._id
        });
        
        // Remove the redundant .save() call
        res.status(201).json(newReceiver);
        
    } catch (error) {
        console.error('Controller error:', error);
        res.status(400).json({ message: error.message });
    }
});
// get receiver
const getReceiver=asyncHandler(async(req,res)=>{
    await connectDB(); // Ensure DB is connected before proceeding
  const ReceiversModel = require("../models/receivers.js");
    const receiver = await ReceiversModel.findOne().sort({ createdAt: -1 });
    if (!receiver) {
        return res.status(404).json({ message: "No receiver found" });
    }
    res.status(200).json(receiver);
    
})
module.exports={
    receiver,
    getReceiver
}