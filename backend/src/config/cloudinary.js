const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

// Tải biến môi trường từ file .env
dotenv.config();

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// xác thực cấu hình Cloudinary
const validateCloudinaryConfig = () => {
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  
  if (!cloud_name || !api_key || !api_secret) {
    console.warn('⚠️  Cloudinary chưa được cấu hình đúng. Vui lòng kiểm tra các biến môi trường.');
    return false;
  }

  console.log('✅ Cloudinary đã được cấu hình thành công');
  return true;
};

module.exports = {
  cloudinary,
  validateCloudinaryConfig
};
