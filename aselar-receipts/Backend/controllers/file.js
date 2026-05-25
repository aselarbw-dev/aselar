const fileModel=require("../models/fileModel")

const cloudinary = require('cloudinary').v2;
const asyncHandler=require("express-async-handler")
const fileLogic=asyncHandler(async(req,res)=>{
    const {files}=req.body
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    console.log('Received file:', file);

    // Upload to Cloudinary
    cloudinary.config({
     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
     api_key: process.env.CLOUDINARY_API_KEY,
     api_secret: process.env.CLOUDINARY_SECRET
   });
   let result;
    try {
      result = await cloudinary.uploader.upload(file.path, {
       folder: "Files"
       
     });
     console.log('Cloudinary Response:', result);
     // Optional: Clean up the local file after upload
     const fs = require('fs');
     fs.unlink(file.path, (err) => {
       if (err) console.error('Error deleting local file:', err);
     });
    } catch (error) {
     console.log(error.message)
    }
    
})
module.exports={fileLogic}