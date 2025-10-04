const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['student', 'tutor', 'admin'],
    required: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String
  },
  emailVerificationExpires: {
    type: Date
  },
  // OTP for email verification
  emailVerificationOTP: {
    type: String
  },
  emailVerificationOTPExpires: {
    type: Date
  },
  otpAttempts: {
    type: Number,
    default: 0
  },
  otpLockUntil: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Trạng thái duyệt cho gia sư
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: function() {
      return this.role === 'tutor' ? 'pending' : 'approved';
    }
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  }
}, {
  timestamps: true
});

// Virtual cho profile dựa trên role
userSchema.virtual('profile', {
  ref: function() {
    if (this.role === 'student') return 'StudentProfile';
    if (this.role === 'tutor') return 'TutorProfile';
    if (this.role === 'admin') return 'AdminProfile';
  },
  localField: '_id',
  foreignField: 'userId',
  justOne: true
});

// Kiểm tra tài khoản bị khóa
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password trước khi lưu
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// So sánh password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Tăng số lần đăng nhập sai
userSchema.methods.incLoginAttempts = function() {
  // Nếu đã có lockUntil và đã hết hạn
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Khóa tài khoản nếu đăng nhập sai quá 5 lần
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + 2 * 60 * 60 * 1000 // Khóa 2 tiếng
    };
  }
  
  return this.updateOne(updates);
};

// Reset số lần đăng nhập sai khi đăng nhập thành công
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    },
    $set: {
      lastLogin: new Date()
    }
  });
};

// Kiểm tra quyền
userSchema.methods.hasPermission = function(requiredRole) {
  const roleHierarchy = {
    'admin': 3,
    'tutor': 2,
    'student': 1
  };
  
  return roleHierarchy[this.role] >= roleHierarchy[requiredRole];
};

// Kiểm tra có thể truy cập tài nguyên
userSchema.methods.canAccess = function(resource) {
  if (this.role === 'admin') return true;
  
  const permissions = {
    'student': ['profile', 'courses', 'messages', 'findTutor', 'blog'],
    'tutor': ['profile', 'requests', 'students', 'schedule', 'income', 'blog'],
    'admin': ['dashboard', 'users', 'content', 'finance', 'settings', 'support']
  };
  
  return permissions[this.role]?.includes(resource) || false;
};

userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.emailVerificationToken;
    delete ret.loginAttempts;
    delete ret.lockUntil;
    delete ret.id; // Remove duplicate id field
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);