const BookingRequest = require('../models/BookingRequest');
const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const StudentProfile = require('../models/StudentProfile');
const { 
  sendEmail, 
  newBookingNotificationTemplate,
  bookingAcceptedNotificationTemplate,
  bookingRejectedNotificationTemplate
} = require('../utils/email');
const {
  notifyBookingRequest,
  notifyBookingAccepted,
  notifyBookingRejected,
  notifyBookingCompleted
} = require('../utils/notifications');

// @desc    Create a new booking request
// @route   POST /api/bookings
// @access  Private (Student only)
exports.createBookingRequest = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Verify student role
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ học sinh mới có thể tạo yêu cầu đặt lịch'
      });
    }

    const {
      tutorId,
      subject,
      schedule,
      location,
      pricing,
      description,
      studentNote
    } = req.body;

    // Validate tutor exists and is approved
    const tutor = await User.findById(tutorId);
    if (!tutor || tutor.role !== 'tutor') {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy gia sư'
      });
    }

    if (tutor.approvalStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Gia sư này chưa được xác thực'
      });
    }

    // Get tutor profile to fetch actual hourly rate
    const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
    
    // Determine hourly rate - Priority: 1. Subject-specific, 2. General, 3. Provided in request
    let hourlyRate = 0;
    
    // Try subject-specific rate first
    if (tutorProfile && tutorProfile.subjects && tutorProfile.subjects.length > 0) {
      const matchingSubject = tutorProfile.subjects.find(s => s.subject === subject.name);
      if (matchingSubject && matchingSubject.hourlyRate > 0) {
        hourlyRate = matchingSubject.hourlyRate;
      }
    }
    
    // Fallback to general tutor rate - calculate from all subjects
    if (hourlyRate === 0 && tutorProfile?.subjects && tutorProfile.subjects.length > 0) {
      const rates = tutorProfile.subjects.map(s => s.hourlyRate).filter(r => r > 0);
      if (rates.length > 0) {
        hourlyRate = Math.round(rates.reduce((sum, r) => sum + r, 0) / rates.length);
        console.log('📌 Using average rate from subjects:', hourlyRate);
      }
    }
    
    // Last resort: use provided rate in request
    if (hourlyRate === 0 && pricing?.hourlyRate > 0) {
      hourlyRate = pricing.hourlyRate;
    }

    // Validate schedule start date is in the future
    const startDate = new Date(schedule.startDate);
    if (startDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Ngày bắt đầu phải sau ngày hiện tại'
      });
    }

    // Create booking request
    const bookingRequest = new BookingRequest({
      student: studentId,
      tutor: tutorId,
      subject: {
        name: subject.name,
        level: subject.level || 'THCS'
      },
      schedule: {
        startDate: schedule.startDate,
        preferredTime: schedule.preferredTime,
        daysOfWeek: schedule.daysOfWeek || [],
        daysPerWeek: schedule.daysPerWeek || 2,
        hoursPerSession: schedule.hoursPerSession || 1.5,
        duration: schedule.duration || 4
      },
      location: {
        type: location.type,
        address: location.address,
        district: location.district,
        city: location.city
      },
      pricing: {
        hourlyRate: hourlyRate
      },
      description: description || '',
      studentNote: studentNote || ''
    });

    await bookingRequest.save();

    // Populate tutor and student info for response and email
    await bookingRequest.populate([
      {
        path: 'tutor',
        select: 'email role',
        populate: {
          path: 'profile',
          select: 'fullName avatar phone bio'
        }
      },
      {
        path: 'student',
        select: 'email role',
        populate: {
          path: 'profile',
          select: 'fullName avatar phone'
        }
      }
    ]);

    // Send email notification to tutor
    try {
      const tutorEmail = bookingRequest.tutor.email;
      const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
      const tutorName = tutorProfile?.fullName || bookingRequest.tutor.email;
      
      const studentProfile = await StudentProfile.findOne({ user: studentId });
      const studentName = studentProfile?.fullName || bookingRequest.student.email;

      // IMPORTANT: Get actual hourly rate from tutor profile
      // Priority: 1. Subject-specific rate, 2. General rate, 3. Booking request rate
      let actualHourlyRate = 0;
      
      // Try to find subject-specific rate first
      if (tutorProfile && tutorProfile.subjects && tutorProfile.subjects.length > 0) {
        const matchingSubject = tutorProfile.subjects.find(s => 
          s.subject === bookingRequest.subject.name
        );
        if (matchingSubject && matchingSubject.hourlyRate > 0) {
          actualHourlyRate = matchingSubject.hourlyRate;
          console.log('📌 Using subject-specific rate:', actualHourlyRate, 'for', bookingRequest.subject.name);
        }
      }
      
      // Fallback to general rate - calculate from all subjects
      if (actualHourlyRate === 0 && tutorProfile?.subjects && tutorProfile.subjects.length > 0) {
        const rates = tutorProfile.subjects.map(s => s.hourlyRate).filter(r => r > 0);
        if (rates.length > 0) {
          actualHourlyRate = Math.round(rates.reduce((sum, r) => sum + r, 0) / rates.length);
          console.log('📌 Using average rate from subjects:', actualHourlyRate);
        }
      }
      
      // Last resort: use booking request rate
      if (actualHourlyRate === 0) {
        actualHourlyRate = bookingRequest.pricing.hourlyRate || 0;
        console.log('⚠️ Using booking request rate:', actualHourlyRate, '(no tutor profile rate found)');
      }

      const emailTemplate = newBookingNotificationTemplate(tutorName, studentName, {
        subject: bookingRequest.subject,
        schedule: bookingRequest.schedule,
        location: bookingRequest.location,
        pricing: {
          hourlyRate: actualHourlyRate  // Use actual rate from tutor profile
        },
        description: bookingRequest.description,
        studentNote: bookingRequest.studentNote
      });

      await sendEmail(tutorEmail, emailTemplate);
      console.log('✅ Booking notification email sent to tutor:', tutorEmail);
      console.log('📊 Email pricing - Hourly rate:', actualHourlyRate, 'VND/hour (from tutor profile)');
    } catch (emailError) {
      console.error('❌ Failed to send booking notification email:', emailError);
      // Don't fail the request if email fails
    }

    // Create notification for tutor
    try {
      const studentProfile = await StudentProfile.findOne({ user: studentId });
      const studentName = studentProfile?.fullName || bookingRequest.student.email;
      await notifyBookingRequest(bookingRequest, tutorId, studentName);
    } catch (notifError) {
      console.error('❌ Failed to create notification:', notifError);
    }

    res.status(201).json({
      success: true,
      message: 'Tạo yêu cầu đặt lịch thành công',
      data: bookingRequest
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo yêu cầu đặt lịch',
      error: error.message
    });
  }
};

// @desc    Get all booking requests for current user
// @route   GET /api/bookings
// @access  Private
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    const { status } = req.query;

    let bookings;
    
    if (user.role === 'student') {
      bookings = await BookingRequest.find(status ? { student: userId, status } : { student: userId })
        .populate({
          path: 'tutor',
          select: 'email role',
          populate: {
            path: 'profile',
            select: 'fullName avatar phone bio'
          }
        })
        .sort({ createdAt: -1 });
    } else if (user.role === 'tutor') {
      bookings = await BookingRequest.find(status ? { tutor: userId, status } : { tutor: userId })
        .populate({
          path: 'student',
          select: 'email role',
          populate: {
            path: 'profile',
            select: 'fullName avatar phone'
          }
        })
        .sort({ createdAt: -1 });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập'
      });
    }

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đặt lịch',
      error: error.message
    });
  }
};

// @desc    Get booking request by ID
// @route   GET /api/bookings/:id
// @access  Private
exports.getBookingById = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;

    const booking = await BookingRequest.findById(bookingId)
      .populate({
        path: 'student',
        select: 'email role',
        populate: {
          path: 'profile',
          select: 'fullName avatar phone'
        }
      })
      .populate({
        path: 'tutor',
        select: 'email role',
        populate: {
          path: 'profile',
          select: 'fullName avatar phone bio'
        }
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu đặt lịch'
      });
    }

    // Check if user is student or tutor of this booking
    if (booking.student._id.toString() !== userId && 
        booking.tutor._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập'
      });
    }

    res.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin đặt lịch',
      error: error.message
    });
  }
};

// @desc    Accept booking request (Tutor only)
// @route   PUT /api/bookings/:id/accept
// @access  Private (Tutor)
exports.acceptBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const tutorId = req.user.id;
    const { message } = req.body;

    const booking = await BookingRequest.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu đặt lịch'
      });
    }

    // Check if user is the tutor
    if (booking.tutor.toString() !== tutorId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chấp nhận yêu cầu này'
      });
    }

    // Check if booking is still pending
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu này đã được xử lý'
      });
    }

    await booking.accept(message || 'Gia sư đã chấp nhận yêu cầu của bạn');
    
    // Populate student and tutor info
    await booking.populate([
      {
        path: 'student',
        select: 'email role',
        populate: {
          path: 'profile',
          select: 'fullName avatar phone'
        }
      },
      {
        path: 'tutor',
        select: 'email role',
        populate: {
          path: 'profile',
          select: 'fullName avatar phone bio'
        }
      }
    ]);

    // Send email notification to student
    try {
      const studentEmail = booking.student.email;
      const studentProfile = await StudentProfile.findOne({ user: booking.student._id });
      const studentName = studentProfile?.fullName || booking.student.email;
      
      const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
      const tutorName = tutorProfile?.fullName || booking.tutor.email;
      
      // Get actual hourly rate - Priority: Subject-specific, General, Booking rate
      let actualHourlyRate = 0;
      if (tutorProfile && tutorProfile.subjects && tutorProfile.subjects.length > 0) {
        const matchingSubject = tutorProfile.subjects.find(s => s.subject === booking.subject.name);
        if (matchingSubject && matchingSubject.hourlyRate > 0) {
          actualHourlyRate = matchingSubject.hourlyRate;
        }
      }
      if (actualHourlyRate === 0 && tutorProfile?.subjects && tutorProfile.subjects.length > 0) {
        const rates = tutorProfile.subjects.map(s => s.hourlyRate).filter(r => r > 0);
        if (rates.length > 0) {
          actualHourlyRate = Math.round(rates.reduce((sum, r) => sum + r, 0) / rates.length);
        }
      }
      if (actualHourlyRate === 0) {
        actualHourlyRate = booking.pricing.hourlyRate || 0;
      }

      const emailTemplate = bookingAcceptedNotificationTemplate(
        studentName, 
        tutorName, 
        {
          subject: booking.subject,
          schedule: booking.schedule,
          location: booking.location,
          pricing: {
            hourlyRate: actualHourlyRate
          }
        },
        message
      );

      await sendEmail(studentEmail, emailTemplate);
      console.log('✅ Booking accepted notification sent to student:', studentEmail);
      console.log('📊 Acceptance email - Tutor:', tutorName, '| Student:', studentName, '| Rate:', actualHourlyRate, 'VND/hour');
    } catch (emailError) {
      console.error('❌ Failed to send acceptance email:', emailError);
      // Don't fail the request if email fails
    }

    // Create notification for student
    try {
      const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
      const tutorName = tutorProfile?.fullName || booking.tutor.email;
      await notifyBookingAccepted(booking, booking.student._id, tutorName);
    } catch (notifError) {
      console.error('❌ Failed to create notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Đã chấp nhận yêu cầu đặt lịch',
      data: booking
    });

  } catch (error) {
    console.error('Accept booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi chấp nhận yêu cầu',
      error: error.message
    });
  }
};

// @desc    Reject booking request (Tutor only)
// @route   PUT /api/bookings/:id/reject
// @access  Private (Tutor)
exports.rejectBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const tutorId = req.user.id;
    const { message } = req.body;

    const booking = await BookingRequest.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu đặt lịch'
      });
    }

    // Check if user is the tutor
    if (booking.tutor.toString() !== tutorId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền từ chối yêu cầu này'
      });
    }

    // Check if booking is still pending
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu này đã được xử lý'
      });
    }

    await booking.reject(message || 'Gia sư đã từ chối yêu cầu của bạn');
    
    // Populate student and tutor info
    await booking.populate([
      {
        path: 'student',
        select: 'email role',
        populate: {
          path: 'profile',
          select: 'fullName avatar phone'
        }
      },
      {
        path: 'tutor',
        select: 'email role',
        populate: {
          path: 'profile',
          select: 'fullName avatar phone bio'
        }
      }
    ]);

    // Send email notification to student
    try {
      const studentEmail = booking.student.email;
      const studentProfile = await StudentProfile.findOne({ user: booking.student._id });
      const studentName = studentProfile?.fullName || booking.student.email;
      
      const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
      const tutorName = tutorProfile?.fullName || booking.tutor.email;

      const emailTemplate = bookingRejectedNotificationTemplate(
        studentName, 
        tutorName, 
        {
          subject: booking.subject,
          schedule: booking.schedule,
          location: booking.location
        },
        message
      );

      await sendEmail(studentEmail, emailTemplate);
      console.log('✅ Booking rejected notification sent to student:', studentEmail);
      console.log('📊 Rejection email - Tutor:', tutorName, '| Student:', studentName, '| Reason:', message || 'No reason provided');
    } catch (emailError) {
      console.error('❌ Failed to send rejection email:', emailError);
      // Don't fail the request if email fails
    }

    // Create notification for student
    try {
      const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
      const tutorName = tutorProfile?.fullName || booking.tutor.email;
      await notifyBookingRejected(booking, booking.student._id, tutorName);
    } catch (notifError) {
      console.error('❌ Failed to create notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Đã từ chối yêu cầu đặt lịch',
      data: booking
    });

  } catch (error) {
    console.error('Reject booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi từ chối yêu cầu',
      error: error.message
    });
  }
};

// @desc    Cancel booking request
// @route   PUT /api/bookings/:id/cancel
// @access  Private (Student or Tutor)
exports.cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    const { reason } = req.body;

    const booking = await BookingRequest.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu đặt lịch'
      });
    }

    // Check if user is student or tutor
    if (booking.student.toString() !== userId && 
        booking.tutor.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy yêu cầu này'
      });
    }

    // Check if booking can be cancelled
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Không thể hủy yêu cầu này'
      });
    }

    await booking.cancel(userId, reason || 'Không có lý do');
    
    const populateField = booking.student.toString() === userId ? 'tutor' : 'student';
    await booking.populate(populateField, 'email profile');

    res.json({
      success: true,
      message: 'Đã hủy yêu cầu đặt lịch',
      data: booking
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi hủy yêu cầu',
      error: error.message
    });
  }
};

// @desc    Complete booking
// @route   PUT /api/bookings/:id/complete
// @access  Private (Tutor)
exports.completeBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const tutorId = req.user.id;

    const booking = await BookingRequest.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu đặt lịch'
      });
    }

    // Check if user is the tutor
    if (booking.tutor.toString() !== tutorId) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ gia sư mới có thể hoàn thành lịch học'
      });
    }

    // Check if booking is accepted
    if (booking.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hoàn thành lịch học đã được chấp nhận'
      });
    }

    await booking.complete();
    await booking.populate('student', 'email profile');

    res.json({
      success: true,
      message: 'Đã hoàn thành lịch học',
      data: booking
    });

  } catch (error) {
    console.error('Complete booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi hoàn thành lịch học',
      error: error.message
    });
  }
};

// @desc    Add rating to completed booking
// @route   POST /api/bookings/:id/rating
// @access  Private (Student)
exports.rateBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const studentId = req.user.id;
    const { score, comment } = req.body;

    const booking = await BookingRequest.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu đặt lịch'
      });
    }

    // Check if user is the student
    if (booking.student.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ học sinh mới có thể đánh giá'
      });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể đánh giá lịch học đã hoàn thành'
      });
    }

    // Check if already rated
    if (booking.rating && booking.rating.score) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã đánh giá lịch học này rồi'
      });
    }

    // Validate score
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: 'Điểm đánh giá phải từ 1 đến 5'
      });
    }

    await booking.addRating(score, comment || '');
    
    // Update tutor profile rating
    const tutorProfile = await TutorProfile.findOne({ userId: booking.tutor });
    if (tutorProfile) {
      const currentTotal = (tutorProfile.averageRating || 0) * (tutorProfile.totalReviews || 0);
      const newTotal = currentTotal + score;
      const newCount = (tutorProfile.totalReviews || 0) + 1;
      
      tutorProfile.averageRating = newTotal / newCount;
      tutorProfile.totalReviews = newCount;
      await tutorProfile.save();
    }

    await booking.populate('tutor', 'email profile');

    res.json({
      success: true,
      message: 'Đã đánh giá lịch học',
      data: booking
    });

  } catch (error) {
    console.error('Rate booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đánh giá',
      error: error.message
    });
  }
};

// @desc    Get upcoming bookings
// @route   GET /api/bookings/upcoming
// @access  Private
exports.getUpcomingBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    const bookings = await BookingRequest.getUpcomingBookings(userId, user.role);

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });

  } catch (error) {
    console.error('Get upcoming bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sắp tới',
      error: error.message
    });
  }
};

// @desc    Get pending bookings (for tutor)
// @route   GET /api/bookings/pending
// @access  Private (Tutor)
exports.getPendingBookings = async (req, res) => {
  try {
    const tutorId = req.user.id;
    const user = await User.findById(tutorId);

    if (user.role !== 'tutor') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ gia sư mới có thể xem yêu cầu chờ xử lý'
      });
    }

    const bookings = await BookingRequest.find({ tutor: tutorId, status: 'pending' })
      .populate({
        path: 'student',
        select: 'email role',
        populate: {
          path: 'profile',
          select: 'fullName avatar phone'
        }
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });

  } catch (error) {
    console.error('Get pending bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy yêu cầu chờ xử lý',
      error: error.message
    });
  }
};

// @desc    Get booking statistics
// @route   GET /api/bookings/stats
// @access  Private
exports.getBookingStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    const field = user.role === 'student' ? 'student' : 'tutor';

    const stats = await BookingRequest.aggregate([
      { $match: { [field]: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);

    const formattedStats = {
      total: 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
      cancelled: 0,
      completed: 0,
      totalRevenue: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
      formattedStats.total += stat.count;
      if (stat._id === 'completed') {
        formattedStats.totalRevenue = stat.totalAmount;
      }
    });

    res.json({
      success: true,
      data: formattedStats
    });

  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê',
      error: error.message
    });
  }
};
