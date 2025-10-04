const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  tutorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
    maxlength: 1000
  },
  objectives: [{
    type: String
  }],
  // Thông tin khóa học
  hourlyRate: {
    type: Number,
    required: true,
    min: 0
  },
  totalHours: {
    type: Number,
    default: 0
  },
  completedHours: {
    type: Number,
    default: 0
  },
  // Lịch học
  schedule: {
    daysOfWeek: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    timeSlots: [{
      startTime: String, // Format: "HH:MM"
      endTime: String,
      duration: Number // Phút
    }],
    timezone: {
      type: String,
      default: 'Asia/Ho_Chi_Minh'
    }
  },
  // Địa điểm
  location: {
    type: {
      type: String,
      enum: ['online', 'student_home', 'tutor_home', 'library', 'cafe', 'other'],
      required: true
    },
    address: String,
    platform: String, // Zoom, Meet, etc. (nếu online)
    notes: String
  },
  // Trạng thái
  status: {
    type: String,
    enum: ['pending', 'active', 'paused', 'completed', 'cancelled'],
    default: 'pending'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  // Thanh toán
  payment: {
    method: {
      type: String,
      enum: ['hourly', 'package', 'monthly'],
      default: 'hourly'
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    pendingAmount: {
      type: Number,
      default: 0
    }
  },
  // Đánh giá
  rating: {
    studentRating: {
      score: { type: Number, min: 1, max: 5 },
      comment: String,
      date: Date
    },
    tutorRating: {
      score: { type: Number, min: 1, max: 5 },
      comment: String,
      date: Date
    }
  },
  // Ghi chú
  notes: {
    type: String,
    maxlength: 500
  },
  // Lý do hủy (nếu có)
  cancellationReason: {
    type: String
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index cho tìm kiếm và hiệu suất
courseSchema.index({ tutorId: 1, status: 1 });
courseSchema.index({ studentId: 1, status: 1 });
courseSchema.index({ subject: 1, level: 1 });
courseSchema.index({ status: 1, startDate: 1 });

// Populate thông tin tutor và student
courseSchema.pre(/^find/, function(next) {
  this.populate([
    {
      path: 'tutorId',
      select: 'email role',
      populate: {
        path: 'profile',
        select: 'fullName avatar phone'
      }
    },
    {
      path: 'studentId',
      select: 'email role',
      populate: {
        path: 'profile',
        select: 'fullName avatar phone'
      }
    }
  ]);
  next();
});

// Virtual cho tỷ lệ hoàn thành
courseSchema.virtual('completionRate').get(function() {
  if (this.totalHours === 0) return 0;
  return Math.round((this.completedHours / this.totalHours) * 100);
});

// Cập nhật số giờ hoàn thành
courseSchema.methods.updateCompletedHours = function(hours) {
  this.completedHours += hours;
  if (this.completedHours >= this.totalHours && this.status === 'active') {
    this.status = 'completed';
  }
  return this.save();
};

// Tính tổng tiền
courseSchema.methods.calculateTotalAmount = function() {
  if (this.payment.method === 'hourly') {
    return this.completedHours * this.hourlyRate;
  }
  return this.payment.totalAmount;
};

module.exports = mongoose.model('Course', courseSchema);