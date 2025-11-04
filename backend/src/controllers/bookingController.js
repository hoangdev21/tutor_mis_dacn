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

    // xác thực gia sư
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

    // Lấy hồ sơ gia sư -> lấy mức giá theo giờ thực tế
    const tutorProfile = await TutorProfile.findOne({ userId: tutorId });

    // Xác định mức giá theo giờ - Ưu tiên: 1. Theo môn học, 2. Chung, 3. Cung cấp trong yêu cầu
    let hourlyRate = 0;

    // Thử mức giá theo môn học trước
    if (tutorProfile && tutorProfile.subjects && tutorProfile.subjects.length > 0) {
      const matchingSubject = tutorProfile.subjects.find(s => s.subject === subject.name);
      if (matchingSubject && matchingSubject.hourlyRate > 0) {
        hourlyRate = matchingSubject.hourlyRate;
      }
    }
    
    // Dự phòng mức giá chung - tính từ tất cả các môn học
    if (hourlyRate === 0 && tutorProfile?.subjects && tutorProfile.subjects.length > 0) {
      const rates = tutorProfile.subjects.map(s => s.hourlyRate).filter(r => r > 0);
      if (rates.length > 0) {
        hourlyRate = Math.round(rates.reduce((sum, r) => sum + r, 0) / rates.length);
        console.log('📌 Sử dụng mức giá trung bình từ các môn học:', hourlyRate);
      }
    }
    
    // sử dụng mức giá từ yêu cầu đặt lịch
    if (hourlyRate === 0 && pricing?.hourlyRate > 0) {
      hourlyRate = pricing.hourlyRate;
    }

    // Xác thực ngày bắt đầu lịch trình phải ở tương lai
    const startDate = new Date(schedule.startDate);
    if (startDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Ngày bắt đầu phải sau ngày hiện tại'
      });
    }

    // tạo yêu cầu đặt lịch
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

    // điền thông tin chi tiết gia sư và học sinh
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

    // Gửi thông báo qua email cho gia sư
    try {
      const tutorEmail = bookingRequest.tutor.email;
      const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
      const tutorName = tutorProfile?.fullName || bookingRequest.tutor.email;
      
      const studentProfile = await StudentProfile.findOne({ user: studentId });
      const studentName = studentProfile?.fullName || bookingRequest.student.email;

      // QUAN TRỌNG: Lấy mức giá theo giờ thực tế từ hồ sơ gia sư
      // Ưu tiên: 1. Mức giá theo môn học, 2. Mức giá chung, 3. Mức giá trong yêu cầu đặt lịch
      let actualHourlyRate = 0;

      // Thử tìm mức giá theo môn học trước
      if (tutorProfile && tutorProfile.subjects && tutorProfile.subjects.length > 0) {
        const matchingSubject = tutorProfile.subjects.find(s => 
          s.subject === bookingRequest.subject.name
        );
        if (matchingSubject && matchingSubject.hourlyRate > 0) {
          actualHourlyRate = matchingSubject.hourlyRate;
          console.log('📌 Sử dụng mức giá theo môn học:', actualHourlyRate, 'cho', bookingRequest.subject.name);
        }
      }

      // Dự phòng mức giá chung - tính từ tất cả các môn học
      if (actualHourlyRate === 0 && tutorProfile?.subjects && tutorProfile.subjects.length > 0) {
        const rates = tutorProfile.subjects.map(s => s.hourlyRate).filter(r => r > 0);
        if (rates.length > 0) {
          actualHourlyRate = Math.round(rates.reduce((sum, r) => sum + r, 0) / rates.length);
          console.log('📌 Sử dụng mức giá trung bình từ các môn học:', actualHourlyRate);
        }
      }

      // Dự phòng cuối cùng: sử dụng mức giá từ yêu cầu đặt lịch
      if (actualHourlyRate === 0) {
        actualHourlyRate = bookingRequest.pricing.hourlyRate || 0;
        console.log('⚠️ Sử dụng mức giá từ yêu cầu đặt lịch:', actualHourlyRate, '(không tìm thấy mức giá từ hồ sơ gia sư)');
      }

      const emailTemplate = newBookingNotificationTemplate(tutorName, studentName, {
        subject: bookingRequest.subject,
        schedule: bookingRequest.schedule,
        location: bookingRequest.location,
        pricing: {
          hourlyRate: actualHourlyRate  // mức giá theo giờ thực tế
        },
        description: bookingRequest.description,
        studentNote: bookingRequest.studentNote
      });

      await sendEmail(tutorEmail, emailTemplate);
      console.log('✅ Gửi thông báo qua email cho gia sư:', tutorEmail);
      console.log('📊 Email pricing - Mức giá theo giờ:', actualHourlyRate, 'VND/giờ (từ hồ sơ gia sư)');
    } catch (emailError) {
      console.error('❌ Gửi thông báo qua email thất bại:', emailError);
    }

    // Tạo thông báo cho gia sư
    try {
      const studentProfile = await StudentProfile.findOne({ user: studentId });
      const studentName = studentProfile?.fullName || bookingRequest.student.email;
      await notifyBookingRequest(bookingRequest, tutorId, studentName);
    } catch (notifError) {
      console.error('❌ Tạo thông báo thất bại:', notifError);
    }

    res.status(201).json({
      success: true,
      message: 'Tạo yêu cầu đặt lịch thành công',
      data: bookingRequest
    });

  } catch (error) {
    console.error('lỗi tạo yêu cầu đặt lịch:', error);
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
    console.error('lỗi lấy danh sách đặt lịch:', error);
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

    // kiểm tra có phải là học sinh hoặc gia sư liên quan không
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
    console.error('lỗi lấy thông tin đặt lịch:', error);
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

    // kiểm tra nếu là gia sư
    if (booking.tutor.toString() !== tutorId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chấp nhận yêu cầu này'
      });
    }

    // kiểm tra trạng thái yêu cầu còn đang chờ xử lý
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu này đã được xử lý'
      });
    }

    await booking.accept(message || 'Gia sư đã chấp nhận yêu cầu của bạn');
    
    // điền thông tin chi tiết học sinh và gia sư
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

    // Gửi thông báo qua email cho học sinh
    try {
      const studentEmail = booking.student.email;
      const studentProfile = await StudentProfile.findOne({ user: booking.student._id });
      const studentName = studentProfile?.fullName || booking.student.email;
      
      const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
      const tutorName = tutorProfile?.fullName || booking.tutor.email;
      
      // lấy mức giá theo giờ thực tế từ hồ sơ gia sư
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
      console.log('✅ Gửi thông báo chấp nhận yêu cầu đặt lịch cho học sinh:', studentEmail);
      console.log('📊 Thông tin email chấp nhận - Gia sư:', tutorName, '| Học sinh:', studentName, '| Mức giá:', actualHourlyRate, 'VND/giờ');
    } catch (emailError) {
      console.error('❌ Gửi email chấp nhận thất bại:', emailError);
    }

    // Tạo thông báo cho học sinh
    try {
      const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
      const tutorName = tutorProfile?.fullName || booking.tutor.email;
      await notifyBookingAccepted(booking, booking.student._id, tutorName);
    } catch (notifError) {
      console.error('❌ Tạo thông báo thất bại:', notifError);
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

    // kiểm tra nếu là gia sư
    if (booking.tutor.toString() !== tutorId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền từ chối yêu cầu này'
      });
    }

    // kiểm tra trạng thái yêu cầu còn đang chờ xử lý
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu này đã được xử lý'
      });
    }

    await booking.reject(message || 'Gia sư đã từ chối yêu cầu của bạn');

    // điền thông tin chi tiết học sinh và gia sư
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

    // Gửi thông báo qua email cho học sinh
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
      console.log('✅ Gửi thông báo từ chối yêu cầu đặt lịch cho học sinh:', studentEmail);
      console.log('📊 Thông tin email từ chối - Gia sư:', tutorName, '| Học sinh:', studentName, '| Lý do:', message || 'Không có lý do');
    } catch (emailError) {
      console.error('❌ Gửi email từ chối thất bại:', emailError);
    }

    // Tạo thông báo cho học sinh
    try {
      const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
      const tutorName = tutorProfile?.fullName || booking.tutor.email;
      await notifyBookingRejected(booking, booking.student._id, tutorName);
    } catch (notifError) {
      console.error('❌ Tạo thông báo thất bại:', notifError);
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

    // kiểm tra có phải là học sinh hoặc gia sư liên quan không
    if (booking.student.toString() !== userId && 
        booking.tutor.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy yêu cầu này'
      });
    }

    // kiểm tra yêu cầu có thể bị hủy không
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

    // kiểm tra nếu là gia sư
    if (booking.tutor.toString() !== tutorId) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ gia sư mới có thể hoàn thành lịch học'
      });
    }

    // kiểm tra nếu yêu cầu đã được chấp nhận
    if (booking.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hoàn thành lịch học đã được chấp nhận'
      });
    }

    await booking.complete();
    
    // Populate lại dữ liệu đầy đủ (including student.profile) trước khi gửi response
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

    // Gửi email thông báo hoàn thành cho học sinh
    try {
      const studentEmail = booking.student.email;
      const studentProfile = await StudentProfile.findOne({ user: booking.student._id });
      const studentName = studentProfile?.fullName || booking.student.email;
      
      const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
      const tutorName = tutorProfile?.fullName || booking.tutor.email;

      const emailTemplate = {
        subject: 'Khóa Học Đã Hoàn Thành',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">TutorMis</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Nền tảng gia sư hàng đầu</p>
            </div>
            
            <div style="background: #ffffff; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">Xin chào ${studentName}!</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Gia sư <strong>${tutorName}</strong> vừa đánh dấu khóa học của bạn là đã hoàn thành.
              </p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h3 style="color: #333; margin-top: 0;">Chi tiết khóa học:</h3>
                <p style="margin: 10px 0;"><strong>Môn học:</strong> ${booking.subject?.name || 'N/A'}</p>
                <p style="margin: 10px 0;"><strong>Cấp học:</strong> ${booking.subject?.level || 'N/A'}</p>
                <p style="margin: 10px 0;"><strong>Ngày bắt đầu:</strong> ${booking.schedule?.startDate ? new Date(booking.schedule.startDate).toLocaleDateString('vi-VN') : 'N/A'}</p>
                <p style="margin: 10px 0;"><strong>Gia sư:</strong> ${tutorName}</p>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Bạn có thể <strong>đánh giá khóa học và gia sư</strong> của bạn trên nền tảng để giúp cải thiện dịch vụ.
              </p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pages/student/courses.html" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                           color: white; padding: 12px 30px; text-decoration: none; 
                           border-radius: 5px; display: inline-block; font-weight: bold;">
                  Xem Khóa Học Của Bạn
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

      await sendEmail(studentEmail, emailTemplate);
      console.log('✅ Gửi thông báo hoàn thành khóa học cho học sinh:', studentEmail);
    } catch (emailError) {
      console.error('⚠️ Gửi email hoàn thành thất bại:', emailError);
    }

    // Tạo thông báo cho học sinh
    try {
      const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
      const tutorName = tutorProfile?.fullName || booking.tutor.email;
      await notifyBookingCompleted(booking, booking.student._id, tutorName);
    } catch (notifError) {
      console.error('⚠️ Tạo thông báo hoàn thành thất bại:', notifError);
    }

    res.json({
      success: true,
      message: 'Đã hoàn thành lịch học',
      data: booking
    });

  } catch (error) {
    console.error('Lỗi khi hoàn thành lịch học:', error);
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
// NOTE: Chức năng này hiện tại được thay thế bằng /api/reviews
// Nhưng vẫn giữ lại để tương thích ngược
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

    if (booking.student.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ học sinh mới có thể đánh giá'
      });
    }

    // kiểm tra nếu lịch học đã hoàn thành
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể đánh giá lịch học đã hoàn thành'
      });
    }

    // kiểm tra nếu đã đánh giá
    if (booking.rating && booking.rating.score) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã đánh giá lịch học này rồi'
      });
    }

    // xác thực điểm đánh giá
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: 'Điểm đánh giá phải từ 1 đến 5'
      });
    }

    await booking.addRating(score, comment || '');
    
    // cập nhật đánh giá trung bình của gia sư
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
      message: 'Đã đánh giá lịch học (sử dụng hệ thống Review cũ - vui lòng sử dụng /api/reviews)',
      data: booking
    });

  } catch (error) {
    console.error('Lỗi khi đánh giá lịch học:', error);
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
    console.error('Lỗi khi lấy lịch sắp tới:', error);
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
    console.error('Lỗi khi lấy yêu cầu chờ xử lý:', error);
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
    console.error('Lỗi khi lấy thống kê:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê',
      error: error.message
    });
  }
};
