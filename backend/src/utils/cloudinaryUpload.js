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
 * Upload message attachment to Cloudinary (supports various file types)
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} userId - User ID for unique naming
 * @param {String} originalName - Original filename
 * @param {String} mimeType - File MIME type
 * @returns {Promise<Object>} Upload result with secure_url
 */
const uploadMessageAttachment = async (fileBuffer, userId, originalName, mimeType) => {
  try {
    // Determine resource type based on MIME type
    let resourceType = 'auto';
    if (mimeType.startsWith('image/')) {
      resourceType = 'image';
    } else if (mimeType.startsWith('video/')) {
      resourceType = 'video';
    } else if (mimeType.startsWith('audio/')) {
      resourceType = 'video'; // Cloudinary uses 'video' for audio files
    } else {
      resourceType = 'raw'; // For documents and other files
    }

    // Clean filename for public_id
    const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();

    const uploadOptions = {
      folder: `${process.env.CLOUDINARY_FOLDER}/messages`,
      public_id: `msg_${userId}_${timestamp}_${cleanName}`,
      resource_type: resourceType,
      type: 'upload', // Public access for all file types
      access_mode: 'public' // Ensure public access
    };

    // Add transformation for images only
    if (resourceType === 'image') {
      uploadOptions.transformation = [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ];
    }

    const result = await new Promise((resolve, reject) => {
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

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      resourceType: result.resource_type
    };
  } catch (error) {
    console.error('Cloudinary message attachment upload error:', error);
    throw new Error(`Failed to upload attachment: ${error.message}`);
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {String} url - Cloudinary URL
 * @param {Boolean} keepExtension - Keep file extension (true for raw files, false for images)
 * @returns {String|null} Public ID or null
 */
const extractPublicId = (url, keepExtension = false) => {
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
    
    // Join parts
    let publicId = relevantParts.join('/');
    
    // For raw files (PDFs, docs, etc.), keep the extension as part of public_id
    // For images/videos, Cloudinary can work without extension
    if (!keepExtension) {
      publicId = publicId.replace(/\.[^/.]+$/, '');
    }
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

/**
 * Generate signed URL for private Cloudinary resources
 * @param {String} publicId - Cloudinary public ID
 * @param {String} resourceType - Resource type (image/video/raw)
 * @param {Number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {String} Signed URL
 */
const generateSignedUrl = (publicId, resourceType = 'raw', expiresIn = 3600) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000) + expiresIn;
    
    const signedUrl = cloudinary.url(publicId, {
      resource_type: resourceType,
      type: 'upload',
      sign_url: true,
      expires_at: timestamp,
      secure: true
    });

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
};

/**
 * Convert existing private URL to public URL (re-upload if needed)
 * @param {String} url - Cloudinary URL
 * @returns {String} Updated URL or original URL
 */
const convertToPublicUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  // If URL already uses /upload/ delivery type, it should work
  // If it uses /authenticated/, we need to convert it
  if (url.includes('/authenticated/')) {
    // Replace /authenticated/ with /upload/
    return url.replace('/authenticated/', '/upload/');
  }

  return url;
};

module.exports = {
  uploadToCloudinary,
  uploadAvatar,
  uploadCertificate,
  uploadMessageAttachment,
  deleteFromCloudinary,
  extractPublicId,
  generateSignedUrl,
  convertToPublicUrl
};
