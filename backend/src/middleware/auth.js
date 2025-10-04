const { User } = require('../models');
const { verifyAccessToken } = require('../utils/jwt');

// Middleware xác thực token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    // Verify token
    const decoded = verifyAccessToken(token);
    
    // Lấy thông tin user
    const user = await User.findById(decoded.userId).populate('profile');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Kiểm tra tài khoản có active không
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Kiểm tra email đã verify chưa
    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        message: 'Email is not verified'
      });
    }
    
    // Kiểm tra tài khoản có bị khóa không
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts'
      });
    }
    
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Middleware phân quyền theo role
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

// Middleware kiểm tra quyền truy cập resource
const authorizeResource = (resourceType) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Admin có quyền truy cập tất cả
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Kiểm tra quyền truy cập resource
    if (!req.user.canAccess(resourceType)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this resource'
      });
    }
    
    next();
  };
};

// Middleware kiểm tra ownership của resource
const authorizeOwnership = (ownerField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Admin có quyền truy cập tất cả
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Kiểm tra ownership qua params
    const resourceUserId = req.params.userId || req.params.id;
    
    if (resourceUserId && resourceUserId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only access your own resources'
      });
    }
    
    next();
  };
};

// Middleware chỉ cho phép user chưa login
const guestOnly = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    try {
      verifyAccessToken(token);
      return res.status(400).json({
        success: false,
        message: 'Already authenticated'
      });
    } catch (error) {
      // Token không hợp lệ, cho phép tiếp tục
    }
  }
  
  next();
};

// Middleware kiểm tra quyền admin cụ thể
const authorizeAdminPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    // Lấy admin profile
    const adminProfile = req.user.profile;
    
    if (!adminProfile || !adminProfile.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission '${permission}' required`
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeResource,
  authorizeOwnership,
  guestOnly,
  authorizeAdminPermission
};