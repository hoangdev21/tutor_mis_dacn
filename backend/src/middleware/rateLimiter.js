const rateLimit = require('express-rate-limit');

// Rate limiting cho API chung
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Có quá nhiều yêu cầu, vui lòng thử lại sau'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: message || 'Có quá nhiều yêu cầu, vui lòng thử lại sau'
      });
    }
  });
};

// Rate limit cho đăng nhập (relax for development)
const loginLimiter = createRateLimit(
  15 * 60 * 1000, // 15 phút
  process.env.NODE_ENV === 'production' ? 5 : 50, // 50 in dev, 5 in prod
  'Có quá nhiều yêu cầu đăng nhập, vui lòng thử lại sau 15 phút.'
);

// Rate limit cho đăng ký
const registerLimiter = createRateLimit(
  60 * 60 * 1000, // 1 giờ
  10, // 10 lần đăng ký (tăng cho development testing)
  'Có quá nhiều yêu cầu đăng ký, vui lòng thử lại sau 1 giờ.'
);

// Rate limit cho gửi email
const emailLimiter = createRateLimit(
  60 * 60 * 1000, // 1 giờ
  5, // 5 email
  'Có quá nhiều email đã được gửi, vui lòng thử lại sau 1 giờ.'
);

// Rate limit cho API chung (relax for development)
const apiLimiter = createRateLimit(
  1 * 60 * 1000, // 1 phút
  process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests in dev, 100 in prod
  'Quá nhiều yêu cầu API, vui lòng thử lại sau 1 phút.'
);

// Rate limit cho upload file
const uploadLimiter = createRateLimit(
  60 * 60 * 1000, // 1 giờ
  20, // 20 uploads
  'Quá nhiều yêu cầu tải lên, vui lòng thử lại sau 1 giờ.'
);

// Rate limit cho search
const searchLimiter = createRateLimit(
  60 * 1000, // 1 phút
  30, // 30 searches
  'Có quá nhiều yêu cầu tìm kiếm, vui lòng chậm lại.'
);

// Rate limit cho message
const messageLimiter = createRateLimit(
  60 * 1000, // 1 phút
  20, // 20 messages
  'Có quá nhiều tin nhắn đã được gửi, vui lòng chậm lại.'
);

// Giới hạn cho admin
const adminLimiter = createRateLimit(
  60 * 1000, // 1 phút
  process.env.NODE_ENV === 'production' ? 50 : 500, // 500 in dev, 50 in prod
  'Quá nhiều yêu cầu từ admin, vui lòng thử lại sau 1 phút.'
);

module.exports = {
  loginLimiter,
  registerLimiter,
  emailLimiter,
  apiLimiter,
  uploadLimiter,
  searchLimiter,
  messageLimiter,
  adminLimiter
};