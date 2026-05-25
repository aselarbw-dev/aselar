const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});
  
const uploadToCloudinary = async (fileStr) => {
  try {
    const uploadResponse = await cloudinary.uploader.upload(fileStr, {
      resource_type: 'auto',
      folder: 'Aselar',
    });
    return uploadResponse;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

module.exports = { uploadToCloudinary }; 