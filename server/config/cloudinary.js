const { v2: cloudinary } = require('cloudinary');

// cloudinary.config() reads CLOUDINARY_URL; explicit variables override it
// when a deployment provides them separately.
const fromUrl = cloudinary.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || fromUrl.cloud_name,
  api_key: process.env.CLOUDINARY_API_KEY || fromUrl.api_key,
  api_secret: process.env.CLOUDINARY_API_SECRET || fromUrl.api_secret,
});

module.exports = cloudinary;
