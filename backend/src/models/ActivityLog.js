const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  // Loại hoạt động
  type: {
    type: String,
    enum: [
      'auth',           // Đăng nhập, đăng xuất, đăng ký
      'user',           // Tạo, sửa, xóa user
      'profile',        // Cập nhật profile
      'booking',        // Tạo, chấp nhận, từ chối booking
      'transaction',    // Giao dịch tài chính
      'blog',           // Tạo, sửa, xóa blog
      'course',         // Tạo, sửa, xóa khóa học
      'message',        // Gửi tin nhắn
      'support',        // Tạo, xử lý support ticket
      'admin',          // Các hoạt động admin
      'system',         // Hoạt động hệ thống
      'security',       // Cảnh báo bảo mật
      'error'           // Lỗi hệ thống
    ],
    required: true,
    index: true
  },
  
  // Hành động cụ thể
  action: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true
  },
  
  // Người thực hiện (có thể null cho system actions)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Role của người thực hiện
  userRole: {
    type: String,
    enum: ['student', 'tutor', 'admin', 'system'],
    index: true
  },
  
  // Tài nguyên bị tác động
  resource: {
    type: String,
    enum: ['user', 'profile', 'booking', 'transaction', 'blog', 'course', 'message', 'ticket', 'setting', 'system'],
    index: true
  },
  
  // ID của tài nguyên
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  
  // Mô tả chi tiết
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  
  // Mức độ quan trọng
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info',
    index: true
  },
  
  // Trạng thái
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success',
    index: true
  },
  
  // Thông tin trước thay đổi (cho audit trail)
  beforeData: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Thông tin sau thay đổi
  afterData: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Metadata bổ sung
  metadata: {
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    targetEmail: String,
    amount: Number,
    duration: Number, // ms
    endpoint: String,
    method: String,
    statusCode: Number,
    errorMessage: String,
    errorStack: String
  },
  
  // Thông tin request
  request: {
    ip: String,
    userAgent: String,
    device: String,
    browser: String,
    os: String,
    location: {
      country: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    }
  },
  
  // Tags để dễ tìm kiếm
  tags: [{
    type: String,
    trim: true
  }],
  
  // Đã xem chưa (cho admin)
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Đã giải quyết chưa (cho errors/warnings)
  isResolved: {
    type: Boolean,
    default: false
  },
  
  // Người xử lý (cho errors/warnings)
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  resolvedAt: {
    type: Date
  },
  
  // Ghi chú xử lý
  resolutionNote: {
    type: String,
    trim: true
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ type: 1, createdAt: -1 });
activityLogSchema.index({ severity: 1, isRead: 1 });
activityLogSchema.index({ status: 1, createdAt: -1 });
activityLogSchema.index({ tags: 1 });
activityLogSchema.index({ 'request.ip': 1 });

activityLogSchema.virtual('timeAgo').get(function() {
  const seconds = Math.floor((new Date() - this.createdAt) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' năm trước';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' tháng trước';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' ngày trước';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' giờ trước';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' phút trước';
  
  return 'Vừa xong';
});

// Methods
activityLogSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

activityLogSchema.methods.resolve = function(resolvedBy, note) {
  this.isResolved = true;
  this.resolvedBy = resolvedBy;
  this.resolvedAt = new Date();
  this.resolutionNote = note;
  return this.save();
};

// Static methods
activityLogSchema.statics.logActivity = async function(data) {
  try {
    const log = new this(data);
    await log.save();
    return log;
  } catch (error) {
    console.error('Error logging activity:', error);
    // Không throw error để không ảnh hưởng flow chính
    return null;
  }
};

activityLogSchema.statics.getRecentActivities = function(limit = 50, filters = {}) {
  const query = {};
  
  if (filters.type) query.type = filters.type;
  if (filters.user) query.user = filters.user;
  if (filters.severity) query.severity = filters.severity;
  if (filters.status) query.status = filters.status;
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }
  
  return this.find(query)
    .populate('user', 'email name role')
    .populate('resolvedBy', 'email name')
    .populate('metadata.targetUser', 'email name')
    .sort({ createdAt: -1 })
    .limit(limit);
};

activityLogSchema.statics.getUserActivities = function(userId, limit = 50) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

activityLogSchema.statics.getActivityStats = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        failedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

activityLogSchema.statics.getActivityByHour = async function(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      }
    },
    {
      $group: {
        _id: { $hour: '$createdAt' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

activityLogSchema.statics.getUnresolvedErrors = function() {
  return this.find({
    severity: { $in: ['error', 'critical'] },
    isResolved: false
  })
    .populate('user', 'email name role')
    .sort({ createdAt: -1 });
};

activityLogSchema.statics.searchLogs = function(searchTerm, filters = {}, limit = 100) {
  const query = {
    $or: [
      { action: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $regex: searchTerm, $options: 'i' } }
    ]
  };
  
  if (filters.type) query.type = filters.type;
  if (filters.severity) query.severity = filters.severity;
  if (filters.status) query.status = filters.status;
  
  return this.find(query)
    .populate('user', 'email name role')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Auto cleanup old logs (older than 6 months)
activityLogSchema.statics.cleanupOldLogs = async function() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  // Keep only error and critical logs older than 6 months
  return this.deleteMany({
    createdAt: { $lt: sixMonthsAgo },
    severity: { $nin: ['error', 'critical'] }
  });
};

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
