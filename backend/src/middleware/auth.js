const { User } = require('../models');
const { verifyAccessToken } = require('../utils/jwt');

// Middleware xác thực token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      console.log('Không có token trong yêu cầu');
      return res.status(401).json({
        success: false,
        message: 'Truy c cập bị từ chối: Không có token'
      });
    }
    
    // Verify token
    const decoded = verifyAccessToken(token);
    console.log('Mã token:', { userId: decoded.userId, role: decoded.role });
    
    // Lấy thông tin user
    const user = await User.findById(decoded.userId).populate('profile');
    
    if (!user) {
      console.log('Không tìm thấy người dùng:', decoded.userId);
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    
    console.log('Tìm thấy người dùng:', { id: user._id, email: user.email, role: user.role });
    
    // Kiểm tra tài khoản có active không
    if (!user.isActive) {
      console.log('❌ Tài khoản không hoạt động');
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không hoạt động'
      });
    }
    
    // Kiểm tra email đã verify chưa
    if (!user.isEmailVerified) {
      console.log('Email chưa được xác minh');
      return res.status(401).json({
        success: false,
        message: 'Email chưa được xác minh'
      });
    }
    
    // Kiểm tra tài khoản có bị khóa không
    if (user.isLocked) {
      console.log('Tài khoản bị khóa');
      return res.status(423).json({
        success: false,
        message: 'Tài khoản bị khóa do nhiều lần đăng nhập không thành công'
      });
    }
    
    console.log('Xác thực thành công');
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Lỗi xác thực:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Xác thực không thành công'
    });
  }
};

// Middleware phân quyền theo role
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Xác thực yêu cầu'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Quyền truy cập không đủ'
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
        message: 'Xác thực yêu cầu'
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
        message: 'Quyền truy cập không đủ'
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
        message: 'Xác thực yêu cầu'
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
        message: 'Quyền truy cập không đủ: Bạn chỉ có thể truy cập tài nguyên của chính mình'
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
        message: 'Người dùng đã được xác thực'
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
    console.log('authorizeAdminPermission middleware:', permission);
    console.log('User:', req.user?._id, req.user?.role);
    
    if (!req.user || req.user.role !== 'admin') {
      console.log('Không phải admin');
      return res.status(403).json({
        success: false,
        message: 'Cần quyền truy cập admin'
      });
    }
    
    try {
      // Lấy admin profile
      const AdminProfile = require('../models/AdminProfile');
      const adminProfile = await AdminProfile.findOne({ userId: req.user._id });

      console.log('Hồ sơ admin:', adminProfile?._id);

      if (!adminProfile) {
        console.log('Không có hồ sơ admin');
        return res.status(403).json({
          success: false,
          message: 'Không tìm thấy hồ sơ admin'
        });
      }
      
      // Kiểm tra quyền
      if (!adminProfile.hasPermission(permission)) {
        console.log('Không có quyền:', permission);
        console.log('Quyền có sẵn:', adminProfile.permissions);
        return res.status(403).json({
          success: false,
          message: `Cần quyền '${permission}' để thực hiện hành động này`
        });
      }
      
      console.log('Quyền admin được xác nhận:', permission);
      // Gắn hồ sơ admin vào req.user để sử dụng sau
      req.user.adminProfile = adminProfile;
      next();
    } catch (error) {
      console.error('Lỗi kiểm tra quyền:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể xác minh quyền'
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