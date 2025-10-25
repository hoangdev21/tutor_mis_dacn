const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
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
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  avatar: {
    type: String,
    default: null
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  district: {
    type: String,
    trim: true
  },
  // Thông tin học tập
  schoolName: {
    type: String,
    trim: true
  },
  currentGrade: {
    type: String,
    trim: true
  },
  interestedSubjects: [{
    type: String
  }],
  bio: {
    type: String,
    maxlength: 1000
  },
  learningGoals: {
    type: String,
    maxlength: 500
  },
  preferredSchedule: {
    type: String,
    maxlength: 300
  },
  // Thông tin phụ huynh (nếu là học sinh)
  isParent: {
    type: Boolean,
    default: false
  },
  parentInfo: {
    relationship: {
      type: String,
      enum: ['father', 'mother', 'guardian']
    },
    studentName: String,
    studentAge: Number,
    studentGrade: String
  },
  // Tùy chọn gia sư
  tutorPreferences: {
    gender: {
      type: String,
      enum: ['male', 'female', 'no_preference'],
      default: 'no_preference'
    },
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'experienced', 'expert', 'no_preference'],
      default: 'no_preference'
    },
    maxHourlyRate: {
      type: Number,
      min: 0
    },
    location: {
      type: String,
      enum: ['online', 'in_person', 'both'],
      default: 'both'
    }
  },
  // Thống kê
  totalCourses: {
    type: Number,
    default: 0
  },
  completedCourses: {
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
  }
}, {
  timestamps: true
});

studentProfileSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'userId',
    select: 'email role isEmailVerified isActive'
  });
  next();
});

module.exports = mongoose.model('StudentProfile', studentProfileSchema);