const mongoose = require('mongoose');

const adminProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  // Quyền admin
  permissions: {
    manageUsers: {
      type: Boolean,
      default: true
    },
    manageContent: {
      type: Boolean,
      default: true
    },
    manageFinance: {
      type: Boolean,
      default: true
    },
    manageSystem: {
      type: Boolean,
      default: false // Chỉ super admin mới có
    },
    customerSupport: {
      type: Boolean,
      default: true
    }
  },
  // Cấp độ admin
  level: {
    type: String,
    enum: ['admin', 'super_admin'],
    default: 'admin'
  },
  // Thông tin công việc
  department: {
    type: String,
    enum: ['user_management', 'content_moderation', 'customer_support', 'finance', 'technical'],
    required: true
  },
  position: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  // Thống kê hoạt động
  stats: {
    usersManaged: {
      type: Number,
      default: 0
    },
    tutorsApproved: {
      type: Number,
      default: 0
    },
    tutorsRejected: {
      type: Number,
      default: 0
    },
    contentModerated: {
      type: Number,
      default: 0
    },
    supportTicketsResolved: {
      type: Number,
      default: 0
    },
    lastActiveDate: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Populate user khi query
adminProfileSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'userId',
    select: 'email role isEmailVerified isActive lastLogin'
  });
  next();
});

// Kiểm tra quyền
adminProfileSchema.methods.hasPermission = function(permission) {
  return this.permissions[permission] === true;
};

// Kiểm tra có phải super admin không
adminProfileSchema.methods.isSuperAdmin = function() {
  return this.level === 'super_admin';
};

module.exports = mongoose.model('AdminProfile', adminProfileSchema);