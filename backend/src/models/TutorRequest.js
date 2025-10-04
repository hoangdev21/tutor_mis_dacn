const mongoose = require('mongoose');

const tutorRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  level: {
    type: String,
    enum: ['elementary', 'middle_school', 'high_school', 'university'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  requirements: {
    type: String,
    maxlength: 500
  },
  // Thông tin yêu cầu
  budgetRange: {
    min: {
      type: Number,
      required: true,
      min: 0
    },
    max: {
      type: Number,
      required: true,
      min: 0
    }
  },
  preferredSchedule: {
    daysOfWeek: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    timeSlots: [{
      startTime: String,
      endTime: String
    }],
    frequency: {
      type: String,
      enum: ['once', 'weekly', 'biweekly', 'monthly'],
      default: 'weekly'
    },
    duration: Number // Số tuần/tháng cần học
  },
  location: {
    type: {
      type: String,
      enum: ['online', 'student_home', 'tutor_home', 'library', 'cafe', 'flexible'],
      required: true
    },
    address: String,
    city: String,
    district: String
  },
  // Yêu cầu về gia sư
  tutorPreferences: {
    gender: {
      type: String,
      enum: ['male', 'female', 'no_preference'],
      default: 'no_preference'
    },
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'experienced', 'expert'],
      default: 'no_preference'
    },
    ageRange: {
      min: Number,
      max: Number
    },
    qualifications: [String]
  },
  // Trạng thái
  status: {
    type: String,
    enum: ['open', 'in_progress', 'matched', 'closed', 'expired'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  expiryDate: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 ngày
    }
  },
  // Gia sư đã ứng tuyển
  applications: [{
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    coverLetter: {
      type: String,
      maxlength: 1000
    },
    proposedRate: {
      type: Number,
      required: true
    },
    estimatedDuration: String,
    status: {
      type: String,
      enum: ['pending', 'shortlisted', 'accepted', 'rejected'],
      default: 'pending'
    },
    responseDate: Date
  }],
  // Gia sư được chọn
  selectedTutor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  selectedAt: {
    type: Date
  },
  // Thống kê
  views: {
    type: Number,
    default: 0
  },
  totalApplications: {
    type: Number,
    default: 0
  },
  // Admin moderation
  isApproved: {
    type: Boolean,
    default: false
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
  }
}, {
  timestamps: true
});

// Index
tutorRequestSchema.index({ studentId: 1, status: 1 });
tutorRequestSchema.index({ subject: 1, level: 1, status: 1 });
tutorRequestSchema.index({ 'location.city': 1, status: 1 });
tutorRequestSchema.index({ expiryDate: 1 });
tutorRequestSchema.index({ createdAt: -1 });

// Populate thông tin student
tutorRequestSchema.pre(/^find/, function(next) {
  this.populate([
    {
      path: 'studentId',
      select: 'email role',
      populate: {
        path: 'profile',
        select: 'fullName avatar'
      }
    },
    {
      path: 'applications.tutorId',
      select: 'email role',
      populate: {
        path: 'profile',
        select: 'fullName avatar stats.averageRating'
      }
    },
    {
      path: 'selectedTutor',
      select: 'email role',
      populate: {
        path: 'profile',
        select: 'fullName avatar'
      }
    }
  ]);
  next();
});

// Virtual cho trạng thái hết hạn
tutorRequestSchema.virtual('isExpired').get(function() {
  return this.expiryDate < new Date();
});

// Tăng lượt xem
tutorRequestSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Gia sư ứng tuyển
tutorRequestSchema.methods.addApplication = function(tutorId, applicationData) {
  // Kiểm tra gia sư đã ứng tuyển chưa
  const existingApplication = this.applications.find(
    app => app.tutorId.toString() === tutorId.toString()
  );
  
  if (existingApplication) {
    throw new Error('Gia sư đã ứng tuyển cho yêu cầu này');
  }
  
  this.applications.push({
    tutorId,
    ...applicationData
  });
  this.totalApplications += 1;
  
  return this.save();
};

// Chọn gia sư
tutorRequestSchema.methods.selectTutor = function(tutorId) {
  const application = this.applications.find(
    app => app.tutorId.toString() === tutorId.toString()
  );
  
  if (!application) {
    throw new Error('Gia sư chưa ứng tuyển cho yêu cầu này');
  }
  
  // Cập nhật trạng thái application
  application.status = 'accepted';
  application.responseDate = new Date();
  
  // Từ chối các application khác
  this.applications.forEach(app => {
    if (app.tutorId.toString() !== tutorId.toString()) {
      app.status = 'rejected';
      app.responseDate = new Date();
    }
  });
  
  this.selectedTutor = tutorId;
  this.selectedAt = new Date();
  this.status = 'matched';
  
  return this.save();
};

module.exports = mongoose.model('TutorRequest', tutorRequestSchema);