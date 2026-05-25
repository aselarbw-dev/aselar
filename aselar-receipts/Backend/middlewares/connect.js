const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});
const fs = require('fs');

const result = await cloudinary.uploader.upload(file.path, {
  folder: "Aselar",
});

// Clean up local file
fs.unlinkSync(file.path);

module.exports = cloudinary;
