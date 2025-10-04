const mongoose = require('mongoose');

const tutorProfileSchema = new mongoose.Schema({
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
  dateOfBirth: {
    type: Date,
    required: false // Không bắt buộc khi đăng ký, có thể cập nhật sau
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: false // Không bắt buộc khi đăng ký, có thể cập nhật sau
  },
  avatar: {
    type: String,
    default: null
  },
  idCard: {
    type: String,
    trim: true,
    default: null
  },
  universityImage: {
    type: String,
    default: null
  },
  address: {
    street: String,
    ward: String,
    district: String,
    city: String
  },
  // Thông tin học vấn
  education: [{
    degree: {
      type: String,
      required: true
    },
    institution: String,      // Tên trường (dùng thay university)
    startYear: Number,        // Năm bắt đầu
    endYear: Number,          // Năm kết thúc (thay graduationYear)
    description: String,      // Mô tả chi tiết
    // Keep for backward compatibility
    major: String,
    university: String,
    graduationYear: Number,
    gpa: Number,
    certificate: String // URL file chứng chỉ
  }],
  // Chứng chỉ và bằng cấp
  certificates: [{
    name: {
      type: String,
      required: true
    },
    organization: {
      type: String,
      required: true
    },
    issueDate: {
      type: Date,
      required: true
    },
    expiryDate: Date,
    certificateUrl: String,
    verified: {
      type: Boolean,
      default: false
    }
  }],
  // Môn học có thể dạy
  subjects: [{
    subject: {
      type: String,
      required: true
    },
    level: {
      type: String,
      enum: ['elementary', 'middle_school', 'high_school', 'university'],
      required: true
    },
    experience: {
      type: Number, // Số năm kinh nghiệm
      min: 0
    },
    hourlyRate: {
      type: Number,
      required: false,  // Changed to optional
      min: 0
    }
  }],
  // Top-level hourly rate (general rate)
  hourlyRate: {
    type: Number,
    default: 0,
    min: 0
  },
  // Years of experience (top-level)
  yearsOfExperience: {
    type: Number,
    default: 0,
    min: 0
  },
  // Teaching location (top-level)
  teachingLocation: {
    type: [String],
    enum: ['home', 'student_home', 'online', 'library', 'cafe'],
    default: []
  },
  // Work experience
  workExperience: [{
    position: String,
    company: String,
    startYear: Number,
    endYear: Number,
    description: String
  }],
  // Availability
  availability: [{
    day: {
      type: Number,
      min: 1,
      max: 7
    },
    slots: [{
      start: String,
      end: String
    }]
  }],
  // Top-level rating fields
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  totalStudents: {
    type: Number,
    default: 0
  },
  totalLessons: {
    type: Number,
    default: 0
  },
  // Kinh nghiệm giảng dạy
  teachingExperience: {
    totalYears: {
      type: Number,
      default: 0,
      min: 0
    },
    description: {
      type: String,
      maxlength: 1000
    },
    previousJobs: [{
      position: String,
      organization: String,
      startDate: Date,
      endDate: Date,
      description: String
    }]
  },
  // Giới thiệu bản thân
  bio: {
    type: String,
    maxlength: 1000
  },
  teachingStyle: {
    type: String,
    maxlength: 500
  },
  // Tùy chọn dạy học
  teachingOptions: {
    location: {
      type: [String],
      enum: ['online', 'student_home', 'tutor_home', 'library', 'cafe'],
      default: ['online']
    },
    availability: {
      monday: { available: Boolean, timeSlots: [String] },
      tuesday: { available: Boolean, timeSlots: [String] },
      wednesday: { available: Boolean, timeSlots: [String] },
      thursday: { available: Boolean, timeSlots: [String] },
      friday: { available: Boolean, timeSlots: [String] },
      saturday: { available: Boolean, timeSlots: [String] },
      sunday: { available: Boolean, timeSlots: [String] }
    }
  },
  // Video giới thiệu
  introductionVideo: {
    type: String
  },
  // Thống kê
  stats: {
    totalStudents: {
      type: Number,
      default: 0
    },
    activeStudents: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    totalHoursTaught: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    responseRate: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    responseTime: {
      type: Number, // Thời gian phản hồi trung bình (giờ)
      default: 24
    }
  },
  // Trạng thái
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationLevel: {
    type: String,
    enum: ['basic', 'verified', 'premium'],
    default: 'basic'
  },
  isAvailableForNewStudents: {
    type: Boolean,
    default: true
  },
  // Tài liệu xác minh
  verificationDocuments: {
    identityCard: {
      front: String,
      back: String,
      verified: { type: Boolean, default: false }
    },
    diploma: {
      url: String,
      verified: { type: Boolean, default: false }
    },
    criminalRecord: {
      url: String,
      verified: { type: Boolean, default: false }
    }
  },
  // Lý do từ chối (nếu có)
  rejectionReasons: [{
    reason: String,
    date: Date,
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true
});

// Index cho tìm kiếm
tutorProfileSchema.index({ 'subjects.subject': 1 });
tutorProfileSchema.index({ 'subjects.level': 1 });
tutorProfileSchema.index({ 'subjects.hourlyRate': 1 });
tutorProfileSchema.index({ 'stats.averageRating': -1 });
tutorProfileSchema.index({ 'address.city': 1 });

// Populate user khi query
tutorProfileSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'userId',
    select: 'email role isEmailVerified isActive approvalStatus'
  });
  next();
});

// Tính hourly rate trung bình
tutorProfileSchema.virtual('averageHourlyRate').get(function() {
  if (!this.subjects || this.subjects.length === 0) return 0;
  
  const totalRate = this.subjects.reduce((sum, subject) => sum + subject.hourlyRate, 0);
  return Math.round(totalRate / this.subjects.length);
});

// Kiểm tra gia sư có thể dạy môn học nào đó không
tutorProfileSchema.methods.canTeachSubject = function(subject, level) {
  return this.subjects.some(s => 
    s.subject.toLowerCase() === subject.toLowerCase() && 
    s.level === level
  );
};

// Lấy giá theo môn học và cấp độ
tutorProfileSchema.methods.getHourlyRate = function(subject, level) {
  const found = this.subjects.find(s => 
    s.subject.toLowerCase() === subject.toLowerCase() && 
    s.level === level
  );
  return found ? found.hourlyRate : null;
};

module.exports = mongoose.model('TutorProfile', tutorProfileSchema);