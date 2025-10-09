const multer = require('multer');
const path = require('path');

// Use memory storage for Cloudinary upload
const memoryStorage = multer.memoryStorage();

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif)'));
  }
};

// File filter for certificates (images and PDFs)
const certificateFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /jpeg|jpg|png|pdf/.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh hoặc PDF'));
  }
};

// Avatar upload middleware (using memory storage for Cloudinary)
const uploadAvatar = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: imageFileFilter
}).single('avatar');

// Certificate upload middleware (using memory storage for Cloudinary)
const uploadCertificate = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: certificateFileFilter
}).single('certificate');

// Multiple files upload middleware for support tickets
const uploadMultiple = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /jpeg|jpg|png|pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document/.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh, PDF, hoặc DOC'));
    }
  }
}).array('attachments', 5);

// Message attachment upload middleware (supports various file types)
const uploadMessageAttachment = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB per file
  },
  fileFilter: (req, file, cb) => {
    // Allow images, documents, videos, and audio files
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|html|py|cpp|c|java|js|mp4|mp3|wav|avi|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    // Check mimetype patterns
    const isImage = /^image\//i.test(file.mimetype);
    const isDocument = /pdf|msword|vnd\.openxmlformats-officedocument|text\/plain|text\/html/i.test(file.mimetype);
    const isVideo = /^video\//i.test(file.mimetype);
    const isAudio = /^audio\//i.test(file.mimetype);
    const isCode = /text\/(plain|html|x-python|x-c|x-java|javascript)/i.test(file.mimetype);
    
    if (extname && (isImage || isDocument || isVideo || isAudio || isCode)) {
      return cb(null, true);
    } else {
      cb(new Error('Định dạng file không được hỗ trợ'));
    }
  }
}).single('attachment');

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File quá lớn. Kích thước tối đa là 5MB cho ảnh và 10MB cho chứng chỉ'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Lỗi khi tải file lên: ' + err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

module.exports = {
  uploadAvatar,
  uploadCertificate,
  uploadMultiple,
  uploadMessageAttachment,
  handleMulterError
};
