const { cloudinary } = require('../config/cloudinary');
const streamifier = require('streamifier');

/**
 * Upload image to Cloudinary from buffer
 * @param {Buffer} fileBuffer - File buffer from multer memory storage
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || process.env.CLOUDINARY_FOLDER || 'tutornis',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: options.transformation || [
        { width: 500, height: 500, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ],
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Upload avatar to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} userId - User ID for unique naming
 * @returns {Promise<Object>} Upload result with secure_url
 */
const uploadAvatar = async (fileBuffer, userId) => {
  try {
    const result = await uploadToCloudinary(fileBuffer, {
      folder: `${process.env.CLOUDINARY_FOLDER}/avatars`,
      public_id: `avatar_${userId}_${Date.now()}`,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload avatar: ${error.message}`);
  }
};

/**
 * Upload certificate to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} userId - User ID for unique naming
 * @returns {Promise<Object>} Upload result with secure_url
 */
const uploadCertificate = async (fileBuffer, userId) => {
  try {
    const result = await uploadToCloudinary(fileBuffer, {
      folder: `${process.env.CLOUDINARY_FOLDER}/certificates`,
      public_id: `cert_${userId}_${Date.now()}`,
      resource_type: 'auto', // Allow PDF and images
      transformation: [
        { width: 1200, height: 1600, crop: 'limit' },
        { quality: 'auto:good' }
      ]
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('Cloudinary certificate upload error:', error);
    throw new Error(`Failed to upload certificate: ${error.message}`);
  }
};

/**
 * Delete image from Cloudinary
 * @param {String} publicId - Public ID of the image to delete
 * @returns {Promise<Object>} Deletion result
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {String} url - Cloudinary URL
 * @returns {String|null} Public ID or null
 */
const extractPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) {
    return null;
  }

  try {
    // Extract public_id from URL
    // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/tutornis/avatars/avatar_123.jpg
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    
    const pathParts = parts[1].split('/');
    // Remove version (v1234567890) if present
    const relevantParts = pathParts.filter(part => !part.startsWith('v'));
    
    // Join and remove file extension
    const publicId = relevantParts.join('/').replace(/\.[^/.]+$/, '');
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

module.exports = {
  uploadToCloudinary,
  uploadAvatar,
  uploadCertificate,
  deleteFromCloudinary,
  extractPublicId
};
