const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Người đánh giá (học sinh/phụ huynh)
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Gia sư được đánh giá
  tutor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Yêu cầu đặt lịch liên quan
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BookingRequest',
    required: true
  },
  
  // Điểm đánh giá (1-5)
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  
  // Bình luận từ học sinh
  comment: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Các tiêu chí đánh giá chi tiết (optional)
  criteria: {
    professionalism: {
      type: Number,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    knowledgeLevel: {
      type: Number,
      min: 1,
      max: 5
    },
    patience: {
      type: Number,
      min: 1,
      max: 5
    },
    effectiveness: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  
  // Trạng thái đánh giá
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'hidden'],
    default: 'pending',
    index: true
  },
  
  // Nếu bị ẩn, lý do
  hiddenReason: {
    type: String,
    trim: true
  },
  
  // Admin xử lý
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Phản hồi từ gia sư
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
  
  // Hữu ích - số người cảm thấy đánh giá hữu ích
  helpfulCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Danh sách người thấy hữu ích (để tránh duplicate)
  helpfulBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Ảnh/Video (nếu có)
  attachments: [{
    type: String // URL của ảnh hoặc video
  }],
  
  // Thông tin bổ sung
  subject: {
    type: String,
    trim: true
  },
  
  level: {
    type: String,
    enum: ['Tiểu học', 'THCS', 'THPT', 'Đại học', 'Người đi làm', 'Khác']
  },
  
  // Trạng thái thanh toán
  paid: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index để tìm kiếm hiệu quả
reviewSchema.index({ tutor: 1, status: 1 });
reviewSchema.index({ reviewer: 1, createdAt: -1 });
reviewSchema.index({ tutor: 1, rating: 1 });
reviewSchema.index({ tutor: 1, createdAt: -1 });
reviewSchema.index({ 'criteria.effectiveness': -1 });

// Virtual: Trung bình các tiêu chí
reviewSchema.virtual('averageCriteria').get(function() {
  if (!this.criteria) return null;
  
  const values = Object.values(this.criteria).filter(v => v !== undefined);
  if (values.length === 0) return null;
  
  const sum = values.reduce((a, b) => a + b, 0);
  return (sum / values.length).toFixed(2);
});

// Methods

// Phương thức cập nhật độ hữu ích
reviewSchema.methods.toggleHelpful = function(userId) {
  const index = this.helpfulBy.indexOf(userId);
  if (index > -1) {
    // Bỏ hữu ích
    this.helpfulBy.splice(index, 1);
    this.helpfulCount = Math.max(0, this.helpfulCount - 1);
  } else {
    // Thêm hữu ích
    this.helpfulBy.push(userId);
    this.helpfulCount += 1;
  }
  return this.save();
};

// Phương thức phản hồi từ gia sư
reviewSchema.methods.addTutorResponse = function(message) {
  this.tutorResponse = {
    message: message,
    respondedAt: new Date()
  };
  return this.save();
};

// Phương thức ẩn/unhide đánh giá
reviewSchema.methods.hide = function(reason, reviewedBy) {
  this.status = 'hidden';
  this.hiddenReason = reason;
  this.reviewedBy = reviewedBy;
  return this.save();
};

reviewSchema.methods.unhide = function() {
  this.status = 'approved';
  this.hiddenReason = null;
  this.reviewedBy = null;
  return this.save();
};

// Phương thức phê duyệt đánh giá
reviewSchema.methods.approve = function(reviewedBy) {
  this.status = 'approved';
  this.reviewedBy = reviewedBy;
  return this.save();
};

// Phương thức từ chối đánh giá
reviewSchema.methods.reject = function(reason, reviewedBy) {
  this.status = 'rejected';
  this.hiddenReason = reason;
  this.reviewedBy = reviewedBy;
  return this.save();
};

// Static methods

// Lấy tất cả đánh giá của gia sư (chỉ approved)
reviewSchema.statics.getTutorReviews = function(tutorId, options = {}) {
  const mongoose = require('mongoose');
  // Convert tutorId to ObjectId for consistent querying
  const tutorObjectId = mongoose.Types.ObjectId.isValid(tutorId) 
    ? new mongoose.Types.ObjectId(tutorId) 
    : tutorId;
  
  const query = { 
    tutor: tutorObjectId, 
    // Only show approved reviews on tutor profile
    status: 'approved'
  };
  
  const skip = (options.page - 1) * options.limit || 0;
  const limit = options.limit || 10;
  
  return this.find(query)
    .populate('reviewer', 'email avatar')
    .populate({
      path: 'reviewer',
      populate: {
        path: 'profile',
        select: 'fullName avatar'
      }
    })
    .populate('tutor', 'email')
    .populate({
      path: 'tutor',
      populate: {
        path: 'profile',
        select: 'fullName avatar'
      }
    })
    .select('reviewer rating comment criteria tutorResponse createdAt status')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Lấy thống kê đánh giá của gia sư
reviewSchema.statics.getTutorReviewStats = function(tutorId) {
  const mongoose = require('mongoose');
  
  console.log(`[getTutorReviewStats] Input tutorId:`, tutorId, `(type: ${typeof tutorId})`);
  
  // Convert tutorId to ObjectId if it's a string
  let tutorObjectId;
  if (mongoose.Types.ObjectId.isValid(tutorId)) {
    tutorObjectId = new mongoose.Types.ObjectId(tutorId);
  } else {
    tutorObjectId = tutorId;
  }
  
  console.log(`[getTutorReviewStats] Converted ObjectId:`, tutorObjectId);
  
  const pipeline = [
    { $match: { tutor: tutorObjectId, status: 'approved' } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        },
        averageProfessionalism: { $avg: '$criteria.professionalism' },
        averageCommunication: { $avg: '$criteria.communication' },
        averageKnowledgeLevel: { $avg: '$criteria.knowledgeLevel' },
        averagePatience: { $avg: '$criteria.patience' },
        averageEffectiveness: { $avg: '$criteria.effectiveness' }
      }
    },
    {
      $project: {
        _id: 0,
        averageRating: { $round: ['$averageRating', 2] },
        totalReviews: 1,
        ratingDistribution: 1,
        averageProfessionalism: { $round: ['$averageProfessionalism', 2] },
        averageCommunication: { $round: ['$averageCommunication', 2] },
        averageKnowledgeLevel: { $round: ['$averageKnowledgeLevel', 2] },
        averagePatience: { $round: ['$averagePatience', 2] },
        averageEffectiveness: { $round: ['$averageEffectiveness', 2] }
      }
    }
  ];
  
  console.log(`[getTutorReviewStats] Pipeline:`, JSON.stringify(pipeline, null, 2));
  
  return this.aggregate(pipeline).then(result => {
    console.log(`[getTutorReviewStats] Result:`, result);
    return result;
  });
};

// Lấy các đánh giá chưa được xử lý
reviewSchema.statics.getPendingReviews = function() {
  return this.find({ status: 'pending' })
    .populate('reviewer', 'email')
    .populate({
      path: 'reviewer',
      populate: {
        path: 'profile',
        select: 'fullName'
      }
    })
    .populate('tutor', 'email')
    .populate({
      path: 'tutor',
      populate: {
        path: 'profile',
        select: 'fullName'
      }
    })
    .sort({ createdAt: -1 });
};

// Kiểm tra học sinh đã đánh giá booking này chưa
reviewSchema.statics.hasReviewedBooking = function(reviewerId, bookingId) {
  return this.findOne({
    reviewer: reviewerId,
    booking: bookingId,
    status: { $ne: 'rejected' }
  });
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
