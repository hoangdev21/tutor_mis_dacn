const helmet = require('helmet');
const cors = require('cors');

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    console.log('🔍 CORS Check - Origin:', origin);
    console.log('🔍 CORS Check - FRONTEND_URL:', process.env.FRONTEND_URL);
    
    // Cho phép requests từ frontend và các domain được phép
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8000'
    ].filter(Boolean); // Remove undefined values
    
    console.log('🔍 CORS Check - Allowed Origins:', allowedOrigins);
    
    // Cho phép requests không có origin (mobile apps, postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      console.log('✅ CORS Check - Origin allowed:', origin || 'no origin');
      callback(null, true);
    } else {
      console.log('❌ CORS Check - Origin blocked:', origin);
      callback(new Error('Not allowed by CORS'));
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

// Helmet security configuration
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
  // Handle preflight OPTIONS requests
  app.options('*', cors(corsOptions));
  
  // Basic security headers
  app.use(helmet(helmetOptions));
  
  // CORS
  app.use(cors(corsOptions));
  
  // Disable X-Powered-By header
  app.disable('x-powered-by');
  
  // Trust proxy if behind reverse proxy
  app.set('trust proxy', 1);
  
  // Custom security headers
  app.use((req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking
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

// Error handler for CORS errors
const handleCorsError = (err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation: Origin not allowed'
    });
  }
  next(err);
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Recursive function to sanitize object properties
  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        } else if (typeof obj[key] === 'string') {
          // Remove potential XSS characters
          obj[key] = obj[key]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
        }
      }
    }
  };
  
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
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
      message: 'Request entity too large'
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