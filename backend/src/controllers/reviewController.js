const Review = require('../models/Review');
const BookingRequest = require('../models/BookingRequest');
const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const StudentProfile = require('../models/StudentProfile');
const { sendEmail } = require('../utils/email');
const { 
  notifyNewReview,
  notifyReviewApproved,
  notifyReviewRejected,
  notifyTutorResponse
} = require('../utils/notifications');

/**
 * @desc    Create a new review for a tutor
 * @route   POST /api/reviews
 * @access  Private (Student only)
 */
exports.createReview = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { bookingId, rating, comment, criteria, attachments, subject, level } = req.body;

    // Xác thực người dùng là học sinh
    const reviewer = await User.findById(reviewerId);
    if (!reviewer || reviewer.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ học sinh mới có thể đánh giá'
      });
    }

    // Tìm booking request
    const booking = await BookingRequest.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu đặt lịch'
      });
    }

    // Kiểm tra người đánh giá có phải là học sinh của booking này không
    if (booking.student.toString() !== reviewerId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền đánh giá lịch học này'
      });
    }

    // Kiểm tra booking có hoàn thành và có thể đánh giá không
    if (!booking.isReviewable) {
      return res.status(400).json({
        success: false,
        message: 'Không thể đánh giá lịch học này',
        reason: booking.reviewBlockReason || 'Lịch học chưa hoàn thành hoặc không đủ điều kiện để đánh giá'
      });
    }

    // Kiểm tra đã đánh giá booking này rồi chưa
    const existingReview = await Review.findOne({
      reviewer: reviewerId,
      booking: bookingId,
      status: { $ne: 'rejected' }
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã đánh giá lịch học này rồi'
      });
    }

    // Xác thực rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Điểm đánh giá phải từ 1 đến 5'
      });
    }

    // Xác thực các tiêu chí nếu có
    if (criteria) {
      const validCriteria = ['professionalism', 'communication', 'knowledgeLevel', 'patience', 'effectiveness'];
      for (const key in criteria) {
        if (validCriteria.includes(key)) {
          if (criteria[key] < 1 || criteria[key] > 5) {
            return res.status(400).json({
              success: false,
              message: `Tiêu chí ${key} phải từ 1 đến 5`
            });
          }
        }
      }
    }

    // Tạo review mới
    const review = new Review({
      reviewer: reviewerId,
      tutor: booking.tutor,
      booking: bookingId,
      rating: rating,
      comment: comment || '',
      criteria: criteria || {},
      attachments: attachments || [],
      subject: subject || booking.subject?.name,
      level: level || booking.subject?.level,
      paid: booking.status === 'completed',
      status: 'pending' // Chờ phê duyệt
    });

    await review.save();

    // Liên kết review với booking
    booking.review = review._id;
    booking.rating = {
      score: rating,
      comment: comment || '',
      ratedAt: new Date()
    };
    await booking.save();

    // Populate dữ liệu
    await review.populate([
      {
        path: 'reviewer',
        select: 'email',
        populate: {
          path: 'profile',
          select: 'fullName avatar'
        }
      },
      {
        path: 'tutor',
        select: 'email',
        populate: {
          path: 'profile',
          select: 'fullName'
        }
      }
    ]);

    // Gửi thông báo cho gia sư
    try {
      const tutorEmail = booking.tutor.email || (await User.findById(booking.tutor)).email;
      const tutorProfile = await TutorProfile.findOne({ userId: booking.tutor });
      const tutorName = tutorProfile?.fullName || 'Gia sư';

      const reviewerProfile = await StudentProfile.findOne({ userId: reviewerId });
      const reviewerName = reviewerProfile?.fullName || 'Học sinh';

      const emailTemplate = {
        subject: '📋 Bạn nhận được một đánh giá mới từ học sinh',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">Tutornis</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Nền tảng gia sư hàng đầu</p>
            </div>
            
            <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">Xin chào ${tutorName}!</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                <strong>${reviewerName}</strong> vừa đánh giá lịch học của bạn.
              </p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #667eea;">
                <div style="margin-bottom: 15px;">
                  <strong style="color: #333;">Điểm đánh giá:</strong>
                  <div style="font-size: 24px; color: #ff9800; margin-top: 5px;">
                    ${'⭐'.repeat(rating)}<span style="color: #ccc;">${'⭐'.repeat(5 - rating)}</span>
                  </div>
                </div>
                
                ${comment ? `
                <div style="margin-bottom: 15px;">
                  <strong style="color: #333;">Bình luận:</strong>
                  <p style="color: #666; margin: 10px 0; font-style: italic;">"${comment}"</p>
                </div>
                ` : ''}
                
                ${criteria ? `
                <div>
                  <strong style="color: #333;">Đánh giá chi tiết:</strong>
                  <table style="width: 100%; margin-top: 10px; border-collapse: collapse;">
                    ${criteria.professionalism ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">Chuyên nghiệp:</td><td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">${criteria.professionalism}/5 ⭐</td></tr>` : ''}
                    ${criteria.communication ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">Giao tiếp:</td><td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">${criteria.communication}/5 ⭐</td></tr>` : ''}
                    ${criteria.knowledgeLevel ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">Kiến thức:</td><td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">${criteria.knowledgeLevel}/5 ⭐</td></tr>` : ''}
                    ${criteria.patience ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">Kiên nhẫn:</td><td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">${criteria.patience}/5 ⭐</td></tr>` : ''}
                    ${criteria.effectiveness ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">Hiệu quả:</td><td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">${criteria.effectiveness}/5 ⭐</td></tr>` : ''}
                  </table>
                </div>
                ` : ''}
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Đánh giá này sẽ được hiển thị trên hồ sơ của bạn sau khi được phê duyệt. Bạn có thể phản hồi lại đánh giá này nếu cần.
              </p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pages/tutor/reviews.html" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                           color: white; padding: 12px 30px; text-decoration: none; 
                           border-radius: 5px; display: inline-block; font-weight: bold;">
                  Xem Đánh Giá Của Bạn
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 40px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center;">
                Cảm ơn bạn đã sử dụng Tutornis!<br>
                © 2024 Tutornis. All rights reserved.
              </p>
            </div>
          </div>
        `
      };

      await sendEmail(tutorEmail, emailTemplate);
      console.log('✅ Gửi thông báo đánh giá mới cho gia sư:', tutorEmail);
    } catch (emailError) {
      console.error('⚠️ Gửi email thông báo đánh giá thất bại:', emailError);
    }

    // Tạo thông báo cho gia sư
    try {
      const tutorProfile = await TutorProfile.findOne({ userId: booking.tutor });
      const tutorName = tutorProfile?.fullName || 'Gia sư';
      await notifyNewReview(review, booking.tutor, reviewerName, rating);
    } catch (notifError) {
      console.error('⚠️ Tạo thông báo đánh giá thất bại:', notifError);
    }

    res.status(201).json({
      success: true,
      message: 'Đánh giá của bạn đã được gửi và chờ phê duyệt',
      data: review
    });

  } catch (error) {
    console.error('Lỗi khi tạo đánh giá:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo đánh giá',
      error: error.message
    });
  }
};

/**
 * @desc    Get all reviews for a tutor (approved only)
 * @route   GET /api/reviews/tutor/:tutorId
 * @access  Public
 */
exports.getReviewsByTutor = async (req, res) => {
  try {
    const { tutorId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    console.log(`📡 [getReviewsByTutor] Fetching reviews for tutor: ${tutorId}`);

    // Xác thực gia sư tồn tại
    const tutor = await User.findById(tutorId);
    if (!tutor || tutor.role !== 'tutor') {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy gia sư'
      });
    }

    const reviews = await Review.getTutorReviews(tutorId, { page, limit });
    console.log(`✅ [getReviewsByTutor] Reviews returned: ${reviews.length}`);
    
    // Lấy thống kê
    const stats = await Review.getTutorReviewStats(tutorId);
    console.log(`📊 [getReviewsByTutor] Stats returned: ${stats.length}`, stats);
    
    // Format stats để thêm averageCriteria
    const statsData = stats.length > 0 ? stats[0] : null;
    let formattedStats = null;
    
    if (statsData) {
      formattedStats = {
        averageRating: statsData.averageRating || 0,
        totalReviews: statsData.totalReviews || 0,
        ratingDistribution: statsData.ratingDistribution || [],
        averageCriteria: {
          professionalism: statsData.averageProfessionalism || 0,
          communication: statsData.averageCommunication || 0,
          knowledgeLevel: statsData.averageKnowledgeLevel || 0,
          patience: statsData.averagePatience || 0,
          effectiveness: statsData.averageEffectiveness || 0
        }
      };
      console.log(`✅ [getReviewsByTutor] Stats formatted:`, formattedStats);
    } else {
      console.log(`⚠️  [getReviewsByTutor] No stats data!`);
    }

    res.json({
      success: true,
      count: reviews.length,
      stats: formattedStats,
      data: {
        reviews: reviews,
        stats: formattedStats
      }
    });

  } catch (error) {
    console.error('Lỗi khi lấy đánh giá:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy đánh giá',
      error: error.message
    });
  }
};

/**
 * @desc    Get my reviews (student viewing their own reviews)
 * @route   GET /api/reviews/my
 * @access  Private (Student)
 */
exports.getMyReviews = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const reviews = await Review.find({ reviewer: reviewerId })
      .populate('tutor', 'email')
      .populate({
        path: 'tutor',
        populate: {
          path: 'profile',
          select: 'fullName avatar'
        }
      })
      .populate('booking', 'subject status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ reviewer: reviewerId });

    res.json({
      success: true,
      count: reviews.length,
      total: total,
      page: page,
      pages: Math.ceil(total / limit),
      data: reviews
    });

  } catch (error) {
    console.error('Lỗi khi lấy đánh giá của tôi:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy đánh giá',
      error: error.message
    });
  }
};

/**
 * @desc    Update a review (student can update their own review)
 * @route   PUT /api/reviews/:reviewId
 * @access  Private (Student who created the review)
 */
exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const reviewerId = req.user.id;
    const { rating, comment, criteria, attachments } = req.body;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    // Kiểm tra quyền
    if (review.reviewer.toString() !== reviewerId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật đánh giá này'
      });
    }

    // Không được cập nhật đánh giá đã bị từ chối hoặc ẩn
    if (review.status === 'rejected' || review.status === 'hidden') {
      return res.status(400).json({
        success: false,
        message: 'Không thể cập nhật đánh giá này'
      });
    }

    // Cập nhật các trường
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Điểm đánh giá phải từ 1 đến 5'
        });
      }
      review.rating = rating;
    }

    if (comment !== undefined) {
      review.comment = comment;
    }

    if (criteria) {
      review.criteria = criteria;
    }

    if (attachments !== undefined) {
      review.attachments = attachments;
    }

    // Reset trạng thái về pending khi cập nhật
    review.status = 'pending';

    await review.save();

    await review.populate([
      {
        path: 'reviewer',
        select: 'email',
        populate: {
          path: 'profile',
          select: 'fullName avatar'
        }
      },
      {
        path: 'tutor',
        select: 'email',
        populate: {
          path: 'profile',
          select: 'fullName'
        }
      }
    ]);

    res.json({
      success: true,
      message: 'Cập nhật đánh giá thành công',
      data: review
    });

  } catch (error) {
    console.error('Lỗi khi cập nhật đánh giá:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật đánh giá',
      error: error.message
    });
  }
};

/**
 * @desc    Delete a review (student can delete their own review)
 * @route   DELETE /api/reviews/:reviewId
 * @access  Private (Student who created the review)
 */
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const reviewerId = req.user.id;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    // Kiểm tra quyền
    if (review.reviewer.toString() !== reviewerId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa đánh giá này'
      });
    }

    const tutorId = review.tutor;

    // Xóa đánh giá
    await Review.deleteOne({ _id: reviewId });

    // Xóa reference trong booking
    const booking = await BookingRequest.findById(review.booking);
    if (booking) {
      booking.review = undefined;
      booking.rating = {};
      await booking.save();
    }

    // Cập nhật thống kê của gia sư (vì số lượng review thay đổi)
    await updateTutorStats(tutorId);

    res.json({
      success: true,
      message: 'Xóa đánh giá thành công'
    });

  } catch (error) {
    console.error('Lỗi khi xóa đánh giá:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa đánh giá',
      error: error.message
    });
  }
};

/**
 * @desc    Get reviews by status (for admin)
 * @route   GET /api/reviews/status/:status
 * @access  Private (Admin)
 */
exports.getReviewsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const adminId = req.user.id;

    // Kiểm tra quyền admin
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có thể xem đánh giá theo trạng thái'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ status })
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
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ status });

    res.json({
      success: true,
      count: reviews.length,
      total: total,
      page: page,
      pages: Math.ceil(total / limit),
      data: reviews
    });

  } catch (error) {
    console.error('Lỗi khi lấy đánh giá theo trạng thái:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy đánh giá',
      error: error.message
    });
  }
};

/**
 * @desc    Approve a review (admin only)
 * @route   PUT /api/reviews/:reviewId/approve
 * @access  Private (Admin)
 */
exports.approveReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const adminId = req.user.id;

    // Kiểm tra quyền admin
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có thể phê duyệt đánh giá'
      });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    await review.approve(adminId);

    // Cập nhật thống kê của gia sư
    await updateTutorStats(review.tutor);

    await review.populate([
      {
        path: 'reviewer',
        select: 'email',
        populate: {
          path: 'profile',
          select: 'fullName'
        }
      },
      {
        path: 'tutor',
        select: 'email',
        populate: {
          path: 'profile',
          select: 'fullName'
        }
      }
    ]);

    // Tạo thông báo cho học sinh
    try {
      const reviewerProfile = await StudentProfile.findOne({ userId: review.reviewer });
      const reviewerName = reviewerProfile?.fullName || 'Học sinh';
      await notifyReviewApproved(review, review.reviewer, reviewerName);
    } catch (notifError) {
      console.error('⚠️ Tạo thông báo phê duyệt thất bại:', notifError);
    }

    res.json({
      success: true,
      message: 'Phê duyệt đánh giá thành công',
      data: review
    });

  } catch (error) {
    console.error('Lỗi khi phê duyệt đánh giá:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi phê duyệt đánh giá',
      error: error.message
    });
  }
};

/**
 * @desc    Reject a review (admin only)
 * @route   PUT /api/reviews/:reviewId/reject
 * @access  Private (Admin)
 */
exports.rejectReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    // Kiểm tra quyền admin
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có thể từ chối đánh giá'
      });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    const tutorId = review.tutor;
    await review.reject(reason || 'Không có lý do', adminId);

    // Cập nhật thống kê của gia sư (vì status thay đổi)
    await updateTutorStats(tutorId);

    await review.populate([
      {
        path: 'reviewer',
        select: 'email',
        populate: {
          path: 'profile',
          select: 'fullName'
        }
      }
    ]);

    // Tạo thông báo cho học sinh
    try {
      await notifyReviewRejected(review, review.reviewer, reason || 'Không có lý do');
    } catch (notifError) {
      console.error('⚠️ Tạo thông báo từ chối thất bại:', notifError);
    }

    res.json({
      success: true,
      message: 'Từ chối đánh giá thành công',
      data: review
    });

  } catch (error) {
    console.error('Lỗi khi từ chối đánh giá:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi từ chối đánh giá',
      error: error.message
    });
  }
};

/**
 * @desc    Tutor responds to a review
 * @route   PUT /api/reviews/:reviewId/respond
 * @access  Private (Tutor who received the review)
 */
exports.respondToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const tutorId = req.user.id;
    const { message } = req.body;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    // Kiểm tra quyền
    if (review.tutor.toString() !== tutorId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền phản hồi đánh giá này'
      });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Phản hồi không được để trống'
      });
    }

    await review.addTutorResponse(message);

    await review.populate([
      {
        path: 'reviewer',
        select: 'email',
        populate: {
          path: 'profile',
          select: 'fullName'
        }
      },
      {
        path: 'tutor',
        select: 'email',
        populate: {
          path: 'profile',
          select: 'fullName'
        }
      }
    ]);

    // Gửi email thông báo cho học sinh
    try {
      const reviewerEmail = review.reviewer.email;
      const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
      const tutorName = tutorProfile?.fullName || 'Gia sư';

      const emailTemplate = {
        subject: '📨 Gia sư đã phản hồi lại đánh giá của bạn',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">Tutornis</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Nền tảng gia sư hàng đầu</p>
            </div>
            
            <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">Xin chào!</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                <strong>${tutorName}</strong> vừa phản hồi lại đánh giá của bạn:
              </p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #667eea;">
                <p style="color: #666; margin: 0; font-style: italic;">"${message}"</p>
              </div>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pages/student/reviews.html" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                           color: white; padding: 12px 30px; text-decoration: none; 
                           border-radius: 5px; display: inline-block; font-weight: bold;">
                  Xem Phản Hồi
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 40px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center;">
                Cảm ơn bạn đã sử dụng Tutornis!<br>
                © 2024 Tutornis. All rights reserved.
              </p>
            </div>
          </div>
        `
      };

      await sendEmail(reviewerEmail, emailTemplate);
      console.log('✅ Gửi email phản hồi cho học sinh:', reviewerEmail);
    } catch (emailError) {
      console.error('⚠️ Gửi email phản hồi thất bại:', emailError);
    }

    // Tạo thông báo cho học sinh
    try {
      const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
      const tutorName = tutorProfile?.fullName || 'Gia sư';
      await notifyTutorResponse(review, review.reviewer._id, tutorName);
    } catch (notifError) {
      console.error('⚠️ Tạo thông báo phản hồi thất bại:', notifError);
    }

    res.json({
      success: true,
      message: 'Phản hồi đánh giá thành công',
      data: review
    });

  } catch (error) {
    console.error('Lỗi khi phản hồi đánh giá:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi phản hồi đánh giá',
      error: error.message
    });
  }
};

/**
 * @desc    Mark review as helpful
 * @route   PUT /api/reviews/:reviewId/helpful
 * @access  Private
 */
exports.markHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    await review.toggleHelpful(userId);

    res.json({
      success: true,
      message: 'Cập nhật trạng thái hữu ích thành công',
      data: {
        reviewId: review._id,
        helpfulCount: review.helpfulCount,
        isHelpful: review.helpfulBy.includes(userId)
      }
    });

  } catch (error) {
    console.error('Lỗi khi đánh dấu hữu ích:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật',
      error: error.message
    });
  }
};

/**
 * @desc    Get review by ID
 * @route   GET /api/reviews/:reviewId
 * @access  Public
 */
exports.getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId)
      .populate('reviewer', 'email')
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
      .populate('booking', 'subject level status');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    res.json({
      success: true,
      data: review
    });

  } catch (error) {
    console.error('Lỗi khi lấy đánh giá:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy đánh giá',
      error: error.message
    });
  }
};

// Helper function: Cập nhật thống kê của gia sư
async function updateTutorStats(tutorId) {
  try {
    console.log('🔄 Updating tutor stats for:', tutorId);
    
    const stats = await Review.getTutorReviewStats(tutorId);
    console.log('📊 Stats calculated:', stats);
    
    if (stats && stats.length > 0) {
      const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
      if (tutorProfile) {
        console.log('📝 Updating profile with stats:', {
          averageRating: stats[0].averageRating,
          totalReviews: stats[0].totalReviews
        });
        
        tutorProfile.averageRating = stats[0].averageRating || 0;
        tutorProfile.totalReviews = stats[0].totalReviews || 0;
        
        // Also update nested stats if exists
        if (tutorProfile.stats) {
          tutorProfile.stats.averageRating = stats[0].averageRating || 0;
          tutorProfile.stats.totalReviews = stats[0].totalReviews || 0;
        }
        
        const result = await tutorProfile.save();
        console.log('✅ Profile updated successfully:', {
          averageRating: result.averageRating,
          totalReviews: result.totalReviews
        });
      } else {
        console.warn('⚠️ Tutor profile not found for userId:', tutorId);
      }
    } else {
      console.log('⚠️ No review stats returned');
    }
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật thống kê gia sư:', error);
  }
}

module.exports = exports;
