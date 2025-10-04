const rateLimit = require('express-rate-limit');

// Rate limiting cho API chung
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: message || 'Too many requests, please try again later.'
      });
    }
  });
};

// Rate limit cho đăng nhập (relax for development)
const loginLimiter = createRateLimit(
  15 * 60 * 1000, // 15 phút
  process.env.NODE_ENV === 'production' ? 5 : 50, // 50 in dev, 5 in prod
  'Too many login attempts, please try again after 15 minutes.'
);

// Rate limit cho đăng ký
const registerLimiter = createRateLimit(
  60 * 60 * 1000, // 1 giờ
  10, // 10 lần đăng ký (tăng cho development testing)
  'Too many registration attempts, please try again after 1 hour.'
);

// Rate limit cho gửi email
const emailLimiter = createRateLimit(
  60 * 60 * 1000, // 1 giờ
  5, // 5 email
  'Too many emails sent, please try again after 1 hour.'
);

// Rate limit cho API chung (relax for development)
const apiLimiter = createRateLimit(
  1 * 60 * 1000, // 1 phút
  process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests in dev, 100 in prod
  'API rate limit exceeded, please try again later.'
);

// Rate limit cho upload file
const uploadLimiter = createRateLimit(
  60 * 60 * 1000, // 1 giờ
  20, // 20 uploads
  'Too many file uploads, please try again after 1 hour.'
);

// Rate limit cho search
const searchLimiter = createRateLimit(
  60 * 1000, // 1 phút
  30, // 30 searches
  'Too many search requests, please slow down.'
);

// Rate limit cho message
const messageLimiter = createRateLimit(
  60 * 1000, // 1 phút
  20, // 20 messages
  'Too many messages sent, please slow down.'
);

// Rate limit cho admin operations (relax for development)
const adminLimiter = createRateLimit(
  60 * 1000, // 1 phút
  process.env.NODE_ENV === 'production' ? 50 : 500, // 500 in dev, 50 in prod
  'Admin rate limit exceeded, please slow down.'
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