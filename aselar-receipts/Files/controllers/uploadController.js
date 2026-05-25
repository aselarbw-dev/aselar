const multer = require('multer');
const cloudinary = require('../Utils/cloudinary');

const stream = require('stream');
const {mongoose} = require('../../Shared/config');
const {connectDB} = require('../../Shared/config');

// Use memory storage to avoid ENAMETOOLONG errors
const upload = multer({ storage: multer.memoryStorage() });

const uploadFiles = async (req, res) => {
  try {
    // Debug logging
    await connectDB(); // Ensure DB is connected before proceeding
   
    console.log('🚀 Upload request started');
    console.log('👤 User from middleware:', req.user ? `ID: ${req.user._id}` : 'MISSING');
    console.log('📊 DB Connection State:', mongoose.connection.readyState);
    console.log('📁 Files received:', req.files ? req.files.length : 0);
    
    // Check critical dependencies
    if (!req.user) {
      console.log('❌ No user attached by protect middleware');
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (mongoose.connection.readyState !== 1) {
      console.log('❌ Database not connected in file service');
      return res.status(503).json({ 
        message: 'Database service unavailable',
        dbState: mongoose.connection.readyState 
      });
    }

    if (!req.files || req.files.length === 0) {
      console.log('❌ No files in request');
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const files = req.files;
    const uploadedFiles = [];
    console.log(`📤 Processing ${files.length} files for user ${req.user._id}`);

    for (const file of files) {
      console.log(`📎 Processing file: ${file.originalname}`);
      
      // Create a readable stream from the file buffer
      const bufferStream = new stream.PassThrough();
      bufferStream.end(file.buffer);

      // Upload the stream to Cloudinary
      console.log('☁️  Uploading to Cloudinary...');
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto' }, // Automatically detect file type
          (error, result) => {
            if (error) {
              console.error('❌ Cloudinary upload error:', error);
              reject(error);
            } else {
              console.log('✅ Cloudinary upload success:', result.secure_url);
              resolve(result);
            }
          }
        );

        // Pipe the buffer stream to Cloudinary
        bufferStream.pipe(uploadStream);
      });

      // Save file metadata to MongoDB
      console.log('💾 Saving file metadata to database...');
       const File = require('../models/fileModel');
      const newFile = new File({
        filename: file.originalname,
        url: result.secure_url,
        format: result.format || 'raw',
        size: result.bytes,
        user: req.user._id,
      });

      const savedFile = await newFile.save();
      console.log('✅ File metadata saved:', savedFile._id);
      uploadedFiles.push(savedFile);
    }

    console.log(`🎉 Upload complete! ${uploadedFiles.length} files processed`);
    res.status(200).json({ 
      message: 'Files uploaded successfully', 
      files: uploadedFiles,
      totalUploaded: uploadedFiles.length
    });
    
  } catch (error) {
    console.error('❌ Upload error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: error.message 
      });
    }
    
    if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
      return res.status(503).json({ 
        message: 'Database connection error',
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getAllFiles = async (req, res) => {
  try {  
    await connectDB(); // Ensure DB is connected before proceeding
    
    console.log('📋 Get files request started');
    console.log('👤 User:', req.user ? `ID: ${req.user._id}` : 'MISSING');
    console.log('📊 DB Connection State:', mongoose.connection.readyState);
    
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database service unavailable',
        dbState: mongoose.connection.readyState 
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    console.log(`📊 Querying files for user ${req.user._id}, page ${page}, limit ${limit}`);
const File = require('../models/fileModel');
    const files = await File.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalFiles = await File.countDocuments({ user: req.user._id });
    const totalPages = Math.ceil(totalFiles / limit);

    console.log(`✅ Found ${files.length} files (${totalFiles} total)`);

    res.status(200).json({
      files,
      currentPage: page,
      totalPages,
      totalFiles,
    });
  } catch (error) {
    console.error('❌ Get files error:', error);
    
    if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
      return res.status(503).json({ 
        message: 'Database connection error',
        error: error.message 
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteFile = async (req, res) => {
  try {
    await connectDB(); // Ensure DB is connected before proceeding
  
    const { id } = req.params;
    console.log('🗑️ Delete request started');
    console.log('👤 User:', req.user ? `ID: ${req.user._id}` : 'MISSING');
    console.log('📊 DB Connection State:', mongoose.connection.readyState);
    console.log('🆔 File ID to delete:', id);

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database service unavailable',
        dbState: mongoose.connection.readyState 
      });
    }

    // Find the file in MongoDB
    console.log('🔍 Looking for file in database...');
      const File = require('../models/fileModel');
    const file = await File.findById(id);
    if (!file) {
      console.log('❌ File not found in database');
      return res.status(404).json({ message: 'File not found' });
    }

    console.log('🔒 Checking file ownership...');
    // Check if the file belongs to the current user
    if (file.user.toString() !== req.user._id.toString()) {
      console.log('❌ Unauthorized: File belongs to different user');
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Delete the file from Cloudinary
    console.log('☁️ Deleting from Cloudinary...');
    const publicId = file.url.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(publicId);
    console.log('✅ Deleted from Cloudinary');

    // Delete the file from MongoDB
    console.log('💾 Deleting from database...');
    await File.findByIdAndDelete(id);
    console.log('✅ Deleted from database');

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('❌ Delete error:', error);
    
    if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
      return res.status(503).json({ 
        message: 'Database connection error',
        error: error.message 
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  uploadFiles,
  getAllFiles,
  deleteFile
};