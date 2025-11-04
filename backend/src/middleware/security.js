const helmet = require('helmet');
const cors = require('cors');

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    console.log('CORS Check - Origin:', origin);
    console.log('CORS Check - FRONTEND_URL:', process.env.FRONTEND_URL);
    
    // Cho phép requests từ frontend và các domain được phép
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:8000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8000',
      'http://192.168.1.11:5173' // Cho phép truy cập từ mạng local
    ].filter(Boolean); 

    console.log('CORS Check - Allowed Origins:', allowedOrigins);

    // Cho phép requests không có origin (mobile apps, postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      console.log('CORS Check - Origin allowed:', origin || 'no origin');
      callback(null, true);
    } else {
      console.log('CORS Check - Origin blocked:', origin);
      callback(new Error('Không được phép bởi CORS'));
    }
  },
  credentials: true, // Cho phép cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Total-Pages'],
  maxAge: 86400 // 24 hours
};

// Cấu hình Helmet nâng cao
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Để có thể nhúng content từ bên ngoài
  crossOriginResourcePolicy: { policy: "cross-origin" }
};

// Security middleware function
const setupSecurity = (app) => {
  app.options('*', cors(corsOptions));
  app.use(helmet(helmetOptions));
  // CORS
  app.use(cors(corsOptions));
  // Disable X-Powered-By header
  app.disable('x-powered-by');
  // Tin tưởng proxy nếu có (nếu triển khai trên Heroku, Nginx, v.v.)
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    // Ngăn chan MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Ngăn chặn clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy
    res.setHeader('Permissions-Policy', 
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    
    next();
  });
};

// Lỗi CORS handler
const handleCorsError = (err, req, res, next) => {
  if (err.message === 'Không được phép bởi CORS') {
    return res.status(403).json({
      success: false,
      message: 'Vi phạm chính sách CORS: Origin không được phép'
    });
  }
  next(err);
};

const sanitizeInput = (req, res, next) => {
  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        } else if (typeof obj[key] === 'string') {
          obj[key] = obj[key]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
        }
      }
    }
  };
  
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }
  
  next();
};

// Request size limiter
const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length']);
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength && contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      message: 'Yêu cầu quá lớn. Kích thước tối đa là 10MB.'
    });
  }
  
  next();
};

module.exports = {
  setupSecurity,
  handleCorsError,
  sanitizeInput,
  requestSizeLimiter,
  corsOptions,
  helmetOptions
};