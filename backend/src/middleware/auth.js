const { User } = require('../models');
const { verifyAccessToken } = require('../utils/jwt');

// Middleware xác thực token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    // Verify token
    const decoded = verifyAccessToken(token);
    console.log('✅ Token decoded:', { userId: decoded.userId, role: decoded.role });
    
    // Lấy thông tin user
    const user = await User.findById(decoded.userId).populate('profile');
    
    if (!user) {
      console.log('❌ User not found:', decoded.userId);
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('✅ User found:', { id: user._id, email: user.email, role: user.role });
    
    // Kiểm tra tài khoản có active không
    if (!user.isActive) {
      console.log('❌ User not active');
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Kiểm tra email đã verify chưa
    if (!user.isEmailVerified) {
      console.log('❌ Email not verified');
      return res.status(401).json({
        success: false,
        message: 'Email is not verified'
      });
    }
    
    // Kiểm tra tài khoản có bị khóa không
    if (user.isLocked) {
      console.log('❌ User is locked');
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts'
      });
    }
    
    console.log('✅ Authentication successful');
    req.user = user;
    next();
    
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    
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
    console.log('🔐 authorizeAdminPermission middleware:', permission);
    console.log('User:', req.user?._id, req.user?.role);
    
    if (!req.user || req.user.role !== 'admin') {
      console.log('❌ Not admin');
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    try {
      // Load admin profile with methods intact
      const AdminProfile = require('../models/AdminProfile');
      const adminProfile = await AdminProfile.findOne({ userId: req.user._id });
      
      console.log('Admin profile loaded:', adminProfile?._id);
      
      if (!adminProfile) {
        console.log('❌ No admin profile');
        return res.status(403).json({
          success: false,
          message: 'Admin profile not found'
        });
      }
      
      // Check permission using the method
      if (!adminProfile.hasPermission(permission)) {
        console.log('❌ No permission:', permission);
        console.log('Available permissions:', adminProfile.permissions);
        return res.status(403).json({
          success: false,
          message: `Permission '${permission}' required`
        });
      }
      
      console.log('✅ Permission granted');
      // Attach adminProfile to request for later use
      req.user.adminProfile = adminProfile;
      next();
    } catch (error) {
      console.error('❌ Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify permissions'
      });
    }
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