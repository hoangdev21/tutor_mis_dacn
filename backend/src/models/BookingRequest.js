const mongoose = require('mongoose');

const bookingRequestSchema = new mongoose.Schema({
  // Thông tin học viên
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Thông tin gia sư
  tutor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Subject and level
  subject: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: String,
      enum: ['Tiểu học', 'THCS', 'THPT', 'Đại học', 'Người đi làm', 'Khác'],
      default: 'THCS'
    }
  },
  
  // lịch học
  schedule: {
    startDate: {
      type: Date,
      required: true
    },
    preferredTime: {
      type: String,
      required: true,
      trim: true
    },
    daysOfWeek: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      lowercase: true
    }],
    daysPerWeek: {
      type: Number,
      min: 1,
      max: 7,
      default: 2
    },
    hoursPerSession: {
      type: Number,
      min: 1,
      max: 5,
      default: 1.5
    },
    duration: {
      type: Number, // Số tuần
      min: 1,
      default: 4
    }
  },
  
  // Teaching location
  location: {
    type: {
      type: String,
      enum: ['online', 'student_home', 'tutor_home', 'other'],
      required: true
    },
    address: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    }
  },
  
  // Financial details
  pricing: {
    hourlyRate: {
      type: Number,
      required: true,
      min: 0
    },
    totalHours: {
      type: Number,
      min: 0
    },
    totalAmount: {
      type: Number,
      min: 0
    }
  },
  
  // Request details
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  studentNote: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Status management
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
    default: 'pending',
    index: true
  },
  
  // Response từ gia sư
  tutorResponse: {
    message: {
      type: String,
      trim: true,
      maxlength: 500
    },
    respondedAt: {
      type: Date
    }
  },
  
  // Cancellation
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      trim: true
    },
    cancelledAt: {
      type: Date
    }
  },
  
  // hoàn thành
  completedAt: {
    type: Date
  },
  
  // đánh giá
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500
    },
    ratedAt: {
      type: Date
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

bookingRequestSchema.index({ student: 1, status: 1 });
bookingRequestSchema.index({ tutor: 1, status: 1 });
bookingRequestSchema.index({ createdAt: -1 });
bookingRequestSchema.index({ 'schedule.startDate': 1 });

bookingRequestSchema.virtual('daysUntilStart').get(function() {
  if (!this.schedule.startDate) return null;
  const now = new Date();
  const start = new Date(this.schedule.startDate);
  const diffTime = start - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

bookingRequestSchema.pre('save', function(next) {
  if (this.schedule && this.pricing) {
    const totalHours = (this.schedule.hoursPerSession || 0) * 
                       (this.schedule.daysPerWeek || 0) * 
                       (this.schedule.duration || 0);
    this.pricing.totalHours = totalHours;
    this.pricing.totalAmount = totalHours * (this.pricing.hourlyRate || 0);
  }
  next();
});

// Methods
bookingRequestSchema.methods.accept = function(tutorMessage) {
  this.status = 'accepted';
  this.tutorResponse = {
    message: tutorMessage,
    respondedAt: new Date()
  };
  return this.save();
};

bookingRequestSchema.methods.reject = function(tutorMessage) {
  this.status = 'rejected';
  this.tutorResponse = {
    message: tutorMessage,
    respondedAt: new Date()
  };
  return this.save();
};

bookingRequestSchema.methods.cancel = function(userId, reason) {
  this.status = 'cancelled';
  this.cancellation = {
    cancelledBy: userId,
    reason: reason,
    cancelledAt: new Date()
  };
  return this.save();
};

bookingRequestSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

bookingRequestSchema.methods.addRating = function(score, comment) {
  this.rating = {
    score: score,
    comment: comment,
    ratedAt: new Date()
  };
  return this.save();
};

// Static methods
bookingRequestSchema.statics.getStudentBookings = function(studentId, status = null) {
  const query = { student: studentId };
  if (status) query.status = status;
  return this.find(query)
    .populate('tutor', 'email profile')
    .sort({ createdAt: -1 });
};

bookingRequestSchema.statics.getTutorBookings = function(tutorId, status = null) {
  const query = { tutor: tutorId };
  if (status) query.status = status;
  return this.find(query)
    .populate('student', 'email profile')
    .sort({ createdAt: -1 });
};

bookingRequestSchema.statics.getPendingBookings = function(tutorId) {
  return this.find({ tutor: tutorId, status: 'pending' })
    .populate('student', 'email profile')
    .sort({ createdAt: -1 });
};

bookingRequestSchema.statics.getUpcomingBookings = function(userId, userRole) {
  const field = userRole === 'student' ? 'student' : 'tutor';
  const now = new Date();
  
  return this.find({
    [field]: userId,
    status: 'accepted',
    'schedule.startDate': { $gte: now }
  })
    .populate(userRole === 'student' ? 'tutor' : 'student', 'email profile')
    .sort({ 'schedule.startDate': 1 });
};

const BookingRequest = mongoose.model('BookingRequest', bookingRequestSchema);

module.exports = BookingRequest;
