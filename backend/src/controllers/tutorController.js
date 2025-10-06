const { TutorProfile, TutorRequest, Course, Message, User, BookingRequest } = require('../models');

// @desc    Lấy thông tin dashboard gia sư
// @route   GET /api/tutor/dashboard
// @access  Private (Tutor only)
const getDashboard = async (req, res) => {
  try {
    const tutorId = req.user._id;
    const { period = 'month' } = req.query;
    
    // Calculate date range for income
    const now = new Date();
    let startDate = new Date();
    let futureDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        futureDate.setDate(now.getDate() + 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        futureDate.setMonth(now.getMonth() + 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        futureDate.setFullYear(now.getFullYear() + 1);
        break;
    }
    
    // Get tutor profile for rating
    const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
    
    // Thống kê tổng quan với BookingRequest - sử dụng đúng tên trường
    const [
      totalStudents,
      activeStudents,
      availableRequests,
      unreadMessages,
      completedBookings,
      totalBookings
    ] = await Promise.all([
      // Tổng học sinh (đã accept hoặc completed)
      BookingRequest.distinct('student', { 
        tutor: tutorId, 
        status: { $in: ['accepted', 'completed'] } 
      }).then(students => students.length),
      
      // Học sinh đang học (status = accepted)
      BookingRequest.countDocuments({ 
        tutor: tutorId, 
        status: 'accepted' 
      }),
      
      // Yêu cầu có sẵn (chưa ứng tuyển)
      TutorRequest.countDocuments({ 
        status: 'open',
        expiryDate: { $gt: now },
        'applications.tutorId': { $ne: tutorId }
      }),
      
      // Tin nhắn chưa đọc
      Message.countDocuments({ 
        receiverId: tutorId, 
        isRead: false 
      }),
      
      // Khóa học hoàn thành
      BookingRequest.countDocuments({ 
        tutor: tutorId, 
        status: 'completed' 
      }),
      
      // Tổng khóa học
      BookingRequest.countDocuments({ 
        tutor: tutorId,
        status: { $in: ['pending', 'accepted', 'completed'] }
      })
    ]);
    
    // Thu nhập thực tế (đã hoàn thành) - sử dụng completedAt thay vì payment.paidDate
    const actualIncomeData = await BookingRequest.aggregate([
      {
        $match: {
          tutor: tutorId,
          status: 'completed',
          completedAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } }
          },
          amount: { $sum: '$pricing.totalAmount' }  // ✅ Sử dụng pricing.totalAmount
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);
    
    // Thu nhập dự kiến (đang học)
    const predictedIncomeData = await BookingRequest.aggregate([
      {
        $match: {
          tutor: tutorId,
          status: 'accepted',
          'schedule.startDate': { $gte: now, $lte: futureDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$schedule.startDate' } }
          },
          amount: { $sum: '$pricing.totalAmount' }  // ✅ Sử dụng pricing.totalAmount
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);
    
    // Format income data for chart
    const incomeChartData = {
      actual: actualIncomeData.map(d => ({ date: d._id.date, amount: d.amount })),
      predicted: predictedIncomeData.map(d => ({ date: d._id.date, amount: d.amount }))
    };
    
    // Tổng thu nhập thực tế (tháng này)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const actualIncome = await BookingRequest.aggregate([
      {
        $match: {
          tutor: tutorId,
          status: 'completed',
          completedAt: { $gte: monthStart, $lte: monthEnd }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.totalAmount' }  // ✅ Sử dụng pricing.totalAmount
        }
      }
    ]);
    
    // Tổng thu nhập dự kiến (tháng sau)
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
    
    const predictedIncome = await BookingRequest.aggregate([
      {
        $match: {
          tutor: tutorId,
          status: 'accepted',
          'schedule.startDate': { $gte: nextMonthStart, $lte: nextMonthEnd }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.totalAmount' }  // ✅ Sử dụng pricing.totalAmount
        }
      }
    ]);
    
    // Học sinh gần đây
    const recentStudents = await BookingRequest.find({
      tutor: tutorId,
      status: { $in: ['accepted', 'completed'] }
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate({
        path: 'student',
        select: 'email role'
      })
      .lean();
    
    // Lấy thông tin StudentProfile cho mỗi booking
    const recentStudentsWithProfile = await Promise.all(
      recentStudents.map(async (booking) => {
        const studentProfile = await require('../models/StudentProfile').findOne({ 
          userId: booking.student._id 
        }).select('fullName avatar phone').lean();
        
        return {
          ...booking,
          studentProfile
        };
      })
    );
    
    // Yêu cầu mới (chưa ứng tuyển)
    const newRequestsList = await TutorRequest.find({
      status: 'open',
      expiryDate: { $gt: now },
      'applications.tutorId': { $ne: tutorId }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: 'studentId',
        select: 'email',
        populate: {
          path: 'profile',
          select: 'fullName avatar'
        }
      })
      .lean();
    
    // Lịch dạy sắp tới
    const upcomingSchedule = await BookingRequest.find({
      tutor: tutorId,
      status: 'accepted',
      'schedule.startDate': { $gte: now }
    })
      .sort({ 'schedule.startDate': 1 })
      .limit(5)
      .populate({
        path: 'student',
        select: 'email'
      })
      .lean();
    
    // Lấy thông tin StudentProfile cho lịch sắp tới
    const upcomingScheduleWithProfile = await Promise.all(
      upcomingSchedule.map(async (booking) => {
        const studentProfile = await require('../models/StudentProfile').findOne({ 
          userId: booking.student._id 
        }).select('fullName avatar phone').lean();
        
        return {
          ...booking,
          studentProfile
        };
      })
    );
    
    // Thông báo mới nhất (từ messages + system)
    const recentNotifications = await Message.aggregate([
      {
        $match: {
          receiverId: tutorId
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'users',
          localField: 'senderId',
          foreignField: '_id',
          as: 'sender'
        }
      },
      {
        $unwind: '$sender'
      },
      {
        $lookup: {
          from: 'studentprofiles',
          localField: 'sender._id',
          foreignField: 'userId',
          as: 'senderProfile'
        }
      },
      {
        $addFields: {
          senderProfile: { $arrayElemAt: ['$senderProfile', 0] }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalStudents,
          activeStudents,
          completedBookings,
          totalBookings,
          availableRequests,
          unreadMessages,
          monthlyIncome: actualIncome[0]?.total || 0,
          predictedIncome: predictedIncome[0]?.total || 0,
          averageRating: tutorProfile?.stats?.averageRating || 0,
          totalReviews: tutorProfile?.stats?.totalReviews || 0
        },
        incomeChartData,
        period,
        recentStudents: recentStudentsWithProfile.map(booking => ({
          _id: booking._id,
          studentId: booking.student?._id,
          studentName: booking.studentProfile?.fullName || 'Học sinh',
          studentAvatar: booking.studentProfile?.avatar,
          studentEmail: booking.student?.email,
          subject: booking.subject?.name || 'N/A',  // ✅ Sử dụng subject.name
          level: booking.subject?.level || 'N/A',
          status: booking.status,
          startDate: booking.schedule?.startDate,
          totalAmount: booking.pricing?.totalAmount || 0,  // ✅ Sử dụng pricing.totalAmount
          updatedAt: booking.updatedAt
        })),
        newRequests: newRequestsList.map(req => ({
          _id: req._id,
          studentId: req.studentId?._id,
          studentName: req.studentId?.profile?.fullName || 'N/A',
          studentAvatar: req.studentId?.profile?.avatar,
          subject: req.subject,
          level: req.level,
          budget: req.budget,
          teachingMethod: req.teachingMethod,
          address: req.address,
          description: req.description,
          createdAt: req.createdAt
        })),
        upcomingSchedule: upcomingScheduleWithProfile.map(booking => ({
          _id: booking._id,
          studentId: booking.student?._id,
          studentName: booking.studentProfile?.fullName || 'Học sinh',
          studentAvatar: booking.studentProfile?.avatar,
          studentPhone: booking.studentProfile?.phone,
          subject: booking.subject?.name || 'N/A',  // ✅ Sử dụng subject.name
          level: booking.subject?.level || 'N/A',
          startDate: booking.schedule?.startDate,
          preferredTime: booking.schedule?.preferredTime,  // ✅ Thời gian ưa thích
          daysPerWeek: booking.schedule?.daysPerWeek,
          hoursPerSession: booking.schedule?.hoursPerSession,
          duration: booking.schedule?.duration,
          location: booking.location?.type === 'online' ? 'Trực tuyến' : 
                   (booking.location?.address || 'Chưa xác định')  // ✅ Sử dụng location.address
        })),
        notifications: recentNotifications.map(notif => ({
          _id: notif._id,
          senderId: notif.senderId,
          senderName: notif.senderProfile?.fullName || notif.sender.email,
          senderAvatar: notif.senderProfile?.avatar,
          content: notif.content,
          isRead: notif.isRead,
          createdAt: notif.createdAt
        }))
      }
    });
    
  } catch (error) {
    console.error('Tutor dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data'
    });
  }
};

// @desc    Lấy và cập nhật thông tin profile gia sư
// @route   GET/PUT /api/tutor/profile
// @access  Private (Tutor only)
const getProfile = async (req, res) => {
  try {
    const profile = await TutorProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }
    
    // Include user information in response
    const user = await User.findById(req.user._id);
    
    // Format data to match frontend structure
    const formattedProfile = {
      _id: profile._id,
      userId: profile.userId,
      fullName: profile.fullName,
      phone: profile.phone,
      avatar: profile.avatar,  // ✅ Thêm avatar vào root level
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender,
      idCard: profile.idCard,
      bio: profile.bio,
      teachingStyle: profile.teachingStyle,
      achievements: profile.achievements,
      
      // Address
      address: profile.address?.street || '',
      city: profile.address?.city || '',
      district: profile.address?.district || '',
      
      // Education
      highestDegree: profile.education?.[0]?.degree || '',
      major: profile.education?.[0]?.major || '',
      university: profile.education?.[0]?.university || '',
      graduationYear: profile.education?.[0]?.graduationYear || '',
      gpa: profile.education?.[0]?.gpa || '',
      
      // Experience
      yearsOfExperience: profile.teachingExperience?.totalYears ? 
        `${profile.teachingExperience.totalYears}-${profile.teachingExperience.totalYears + 1}` : '',
      
      // Hourly Rate from first subject or default
      hourlyRate: profile.subjects?.[0]?.hourlyRate || 0,
      
      // Certificates - format to frontend structure
      certifications: (profile.certificates || []).map(cert => ({
        name: cert.name,
        issuer: cert.organization,
        year: cert.issueDate ? new Date(cert.issueDate).getFullYear() : '',
        fileUrl: cert.certificateUrl || ''
      })),
      
      // Experiences - format to frontend structure
      experiences: (profile.teachingExperience?.previousJobs || []).map(exp => ({
        position: exp.position,
        organization: exp.organization,
        fromYear: exp.startDate ? new Date(exp.startDate).getFullYear() : '',
        toYear: exp.endDate ? new Date(exp.endDate).getFullYear() : '',
        description: exp.description
      })),
      
      // Subjects - format to frontend structure
      subjects: (profile.subjects || []).map(sub => ({
        name: sub.subject,
        level: sub.level === 'elementary' ? 'Tiểu học' :
               sub.level === 'middle_school' ? 'THCS' :
               sub.level === 'high_school' ? 'THPT' : 'Đại học'
      })),
      
      // Teaching methods - format to frontend structure
      teachingMethods: (profile.teachingOptions?.location || []).map(loc => {
        const map = {
          'student_home': 'Dạy tại nhà học sinh',
          'tutor_home': 'Dạy tại nhà gia sư',
          'online': 'Dạy online'
        };
        return map[loc] || loc;
      }),
      
      // Availability - format to frontend structure
      availability: Object.keys(profile.teachingOptions?.availability || {})
        .filter(day => profile.teachingOptions.availability[day]?.available)
        .map(day => ({
          day: day,
          times: (profile.teachingOptions.availability[day]?.timeSlots || []).map(slot => {
            const [from, to] = slot.split('-');
            return { from, to };
          })
        })),
      
      universityImage: profile.universityImage || '',
      
      user: {
        fullName: profile.fullName,  // ✅ Lấy từ TutorProfile
        email: user.email,
        phone: profile.phone,         // ✅ Lấy từ TutorProfile
        avatar: profile.avatar,       // ✅ Lấy từ TutorProfile
        approvalStatus: user.approvalStatus
      }
    };
    
    res.status(200).json({
      success: true,
      data: formattedProfile
    });
    
  } catch (error) {
    console.error('Get tutor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      dateOfBirth,
      gender,
      idCard,
      hourlyRate,
      address,
      city,
      district,
      highestDegree,
      major,
      university,
      graduationYear,
      gpa,
      yearsOfExperience,
      bio,
      teachingStyle,
      achievements,
      teachingMethods,
      certifications,
      experiences,
      subjects,
      availability
    } = req.body;

    const profile = await TutorProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Update user info
    const user = await User.findById(req.user._id);
    if (fullName) user.fullName = fullName;
    if (phone) user.phone = phone;
    await user.save();

    // Update basic info
    if (dateOfBirth) profile.dateOfBirth = dateOfBirth;
    if (gender) profile.gender = gender;
    if (idCard) profile.idCard = idCard;
    if (hourlyRate !== undefined && hourlyRate !== null) profile.hourlyRate = hourlyRate;
    if (address) profile.address = { street: address };
    if (city) profile.address = { ...profile.address, city };
    if (district) profile.address = { ...profile.address, district };
    
    // Update education
    if (highestDegree || major || university || graduationYear || gpa) {
      profile.education = [{
        degree: highestDegree,
        major,
        university,
        graduationYear,
        gpa
      }];
    }

    // Update certificates
    if (certifications) {
      profile.certificates = certifications.map(cert => ({
        name: cert.name,
        organization: cert.issuer,
        issueDate: new Date(cert.year, 0, 1),
        certificateUrl: cert.fileUrl
      }));
    }

    // Update experiences
    if (experiences) {
      profile.teachingExperience = {
        totalYears: yearsOfExperience ? parseInt(yearsOfExperience.split('-')[0]) : 0,
        previousJobs: experiences.map(exp => ({
          position: exp.position,
          organization: exp.organization,
          startDate: new Date(exp.fromYear, 0, 1),
          endDate: new Date(exp.toYear, 0, 1),
          description: exp.description
        }))
      };
    }

    // Update subjects - handle both formats from frontend
    if (subjects && subjects.length > 0) {
      profile.subjects = subjects.map(sub => {
        // If sub already has 'subject' field (new format from frontend)
        if (sub.subject) {
          return {
            subject: sub.subject,
            level: sub.level,
            hourlyRate: sub.hourlyRate || hourlyRate || 0,
            experience: sub.experience || (yearsOfExperience ? parseInt(yearsOfExperience.split('-')[0]) : 0)
          };
        }
        // If sub has 'name' field (old format from frontend)
        else if (sub.name) {
          return {
            subject: sub.name,
            level: sub.level === 'Tiểu học' ? 'elementary' : 
                   sub.level === 'THCS' ? 'middle_school' :
                   sub.level === 'THPT' ? 'high_school' : 'university',
            hourlyRate: hourlyRate || 0,
            experience: yearsOfExperience ? parseInt(yearsOfExperience.split('-')[0]) : 0
          };
        }
        return sub;
      });
    }

    // Update bio and teaching style
    if (bio) profile.bio = bio;
    if (teachingStyle) profile.teachingStyle = teachingStyle;
    if (achievements) profile.achievements = achievements;

    // Update teaching options
    if (teachingMethods && teachingMethods.length > 0) {
      const locationMap = {
        'Dạy tại nhà học sinh': 'student_home',
        'Dạy tại nhà gia sư': 'tutor_home',
        'Dạy online': 'online'
      };
      
      // Initialize teachingOptions if not exists
      if (!profile.teachingOptions) {
        profile.teachingOptions = {};
      }
      
      profile.teachingOptions.location = teachingMethods.map(method => locationMap[method] || 'online');
    }

    // Update availability
    if (availability && availability.length > 0) {
      const availabilityObj = {};
      availability.forEach(slot => {
        availabilityObj[slot.day] = {
          available: true,
          timeSlots: slot.times.map(time => `${time.from}-${time.to}`)
        };
      });
      
      // Initialize teachingOptions if not exists
      if (!profile.teachingOptions) {
        profile.teachingOptions = {};
      }
      
      profile.teachingOptions.availability = availabilityObj;
    }

    await profile.save();

    // Check if needs reapproval
    const importantFields = ['education', 'certificates', 'subjects'];
    const hasImportantChanges = importantFields.some(field => req.body[field]);
    
    if (hasImportantChanges && user.approvalStatus === 'approved') {
      user.approvalStatus = 'pending';
      await user.save();
    }

    // Format response to match frontend structure (same as getProfile)
    const formattedProfile = {
      _id: profile._id,
      userId: profile.userId,
      fullName: profile.fullName,
      phone: profile.phone,
      avatar: profile.avatar,  // ✅ Thêm avatar vào root level
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender,
      idCard: profile.idCard,
      bio: profile.bio,
      teachingStyle: profile.teachingStyle,
      achievements: profile.achievements,
      
      // Address
      address: profile.address?.street || '',
      city: profile.address?.city || '',
      district: profile.address?.district || '',
      
      // Education
      highestDegree: profile.education?.[0]?.degree || '',
      major: profile.education?.[0]?.major || '',
      university: profile.education?.[0]?.university || '',
      graduationYear: profile.education?.[0]?.graduationYear || '',
      gpa: profile.education?.[0]?.gpa || '',
      
      // Experience
      yearsOfExperience: profile.teachingExperience?.totalYears ? 
        `${profile.teachingExperience.totalYears}-${profile.teachingExperience.totalYears + 1}` : '',
      
      // Hourly Rate from first subject or default
      hourlyRate: profile.subjects?.[0]?.hourlyRate || 0,
      
      // Certificates - format to frontend structure
      certifications: (profile.certificates || []).map(cert => ({
        name: cert.name,
        issuer: cert.organization,
        year: cert.issueDate ? new Date(cert.issueDate).getFullYear() : '',
        fileUrl: cert.certificateUrl || ''
      })),
      
      // Experiences - format to frontend structure
      experiences: (profile.teachingExperience?.previousJobs || []).map(exp => ({
        position: exp.position,
        organization: exp.organization,
        fromYear: exp.startDate ? new Date(exp.startDate).getFullYear() : '',
        toYear: exp.endDate ? new Date(exp.endDate).getFullYear() : '',
        description: exp.description
      })),
      
      // Subjects - format to frontend structure
      subjects: (profile.subjects || []).map(sub => ({
        name: sub.subject,
        level: sub.level === 'elementary' ? 'Tiểu học' :
               sub.level === 'middle_school' ? 'THCS' :
               sub.level === 'high_school' ? 'THPT' : 'Đại học'
      })),
      
      // Teaching methods - format to frontend structure
      teachingMethods: (profile.teachingOptions?.location || []).map(loc => {
        const map = {
          'student_home': 'Dạy tại nhà học sinh',
          'tutor_home': 'Dạy tại nhà gia sư',
          'online': 'Dạy online'
        };
        return map[loc] || loc;
      }),
      
      // Availability - format to frontend structure
      availability: Object.keys(profile.teachingOptions?.availability || {})
        .filter(day => profile.teachingOptions.availability[day]?.available)
        .map(day => ({
          day: day,
          times: (profile.teachingOptions.availability[day]?.timeSlots || []).map(slot => {
            const [from, to] = slot.split('-');
            return { from, to };
          })
        })),
      
      user: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        approvalStatus: user.approvalStatus
      }
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: formattedProfile,
      requiresReapproval: hasImportantChanges
    });
    
  } catch (error) {
    console.error('Update tutor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// @desc    Lấy danh sách yêu cầu mới
// @route   GET /api/tutor/requests
// @access  Private (Tutor only)
const getRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, subject, level, city } = req.query;
    const tutorId = req.user._id;
    
    const query = {
      status: 'open',
      expiryDate: { $gt: new Date() },
      // Chỉ hiển thị những request chưa ứng tuyển
      'applications.tutorId': { $ne: tutorId }
    };
    
    if (subject) query.subject = subject;
    if (level) query.level = level;
    if (city) query['location.city'] = city;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count
    const total = await TutorRequest.countDocuments(query);
    
    // Get requests
    const requests = await TutorRequest.find(query)
      .populate({
        path: 'studentId',
        select: 'email',
        populate: {
          path: 'profile',
          select: 'fullName avatar'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    res.status(200).json({
      success: true,
      data: {
        requests: requests,
        total: total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Get tutor requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get requests'
    });
  }
};

// @desc    Ứng tuyển yêu cầu
// @route   POST /api/tutor/requests/:requestId/apply
// @access  Private (Tutor only)
const applyRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { coverLetter, proposedRate, estimatedDuration } = req.body;
    const tutorId = req.user._id;
    
    const request = await TutorRequest.findById(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    if (request.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Request is not open for applications'
      });
    }
    
    if (request.expiryDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Request has expired'
      });
    }
    
    // Ứng tuyển
    await request.addApplication(tutorId, {
      coverLetter,
      proposedRate,
      estimatedDuration
    });
    
    res.status(200).json({
      success: true,
      message: 'Application submitted successfully'
    });
    
  } catch (error) {
    console.error('Apply request error:', error);
    
    if (error.message.includes('đã ứng tuyển')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to apply for request'
    });
  }
};

// @desc    Lấy danh sách học sinh
// @route   GET /api/tutor/students
// @access  Private (Tutor only)
const getStudents = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const tutorId = req.user._id;
    
    // Build query cho BookingRequest
    const query = { tutor: tutorId };
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    } else {
      // Mặc định lấy tất cả trừ rejected và cancelled
      query.status = { $in: ['pending', 'accepted', 'completed'] };
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count
    const total = await BookingRequest.countDocuments(query);
    
    // Get bookings
    const bookings = await BookingRequest.find(query)
      .populate({
        path: 'student',
        select: 'email'
      })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    // Get StudentProfile for each booking
    const bookingsWithProfile = await Promise.all(
      bookings.map(async (booking) => {
        const StudentProfile = require('../models/StudentProfile');
        const studentProfile = await StudentProfile.findOne({ 
          userId: booking.student._id 
        }).select('fullName avatar phone').lean();
        
        return {
          ...booking,
          studentProfile
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: {
        bookings: bookingsWithProfile,
        total: total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Get tutor students error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get students'
    });
  }
};

// @desc    Lấy thu nhập
// @route   GET /api/tutor/income
// @access  Private (Tutor only)
const getIncome = async (req, res) => {
  try {
    const tutorId = req.user._id;
    const { period = 'year' } = req.query; // year, 6months, 3months, month
    
    const now = new Date();
    let startDate = new Date();
    
    // Calculate start date based on period
    switch (period) {
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
      default:
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    // 1. Tổng thu nhập thực tế (completed bookings)
    const completedIncome = await BookingRequest.aggregate([
      {
        $match: {
          tutor: tutorId,
          status: 'completed',
          completedAt: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.totalAmount' },
          totalHours: { $sum: '$pricing.totalHours' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 2. Thu nhập đang chờ (accepted bookings - chưa hoàn thành)
    const pendingIncome = await BookingRequest.aggregate([
      {
        $match: {
          tutor: tutorId,
          status: 'accepted'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.totalAmount' },
          totalHours: { $sum: '$pricing.totalHours' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 3. Thu nhập tháng này
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthIncome = await BookingRequest.aggregate([
      {
        $match: {
          tutor: tutorId,
          status: 'completed',
          completedAt: { $gte: monthStart, $lte: now }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 4. Số học sinh
    const totalStudents = await BookingRequest.distinct('student', {
      tutor: tutorId,
      status: { $in: ['accepted', 'completed'] }
    });
    
    // 5. Thu nhập theo tháng (12 tháng gần nhất)
    const monthlyIncomeData = await BookingRequest.aggregate([
      {
        $match: {
          tutor: tutorId,
          status: 'completed',
          completedAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            month: { $month: '$completedAt' }
          },
          income: { $sum: '$pricing.totalAmount' },
          hours: { $sum: '$pricing.totalHours' },
          students: { $addToSet: '$student' },
          bookings: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 1,
          income: 1,
          hours: 1,
          studentCount: { $size: '$students' },
          bookings: 1
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // 6. Thu nhập theo môn học
    const incomeBySubject = await BookingRequest.aggregate([
      {
        $match: {
          tutor: tutorId,
          status: 'completed',
          completedAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: '$subject.name',
          income: { $sum: '$pricing.totalAmount' },
          hours: { $sum: '$pricing.totalHours' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { income: -1 } },
      { $limit: 10 }
    ]);
    
    // 7. Thu nhập theo cấp độ
    const incomeByLevel = await BookingRequest.aggregate([
      {
        $match: {
          tutor: tutorId,
          status: 'completed',
          completedAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: '$subject.level',
          income: { $sum: '$pricing.totalAmount' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { income: -1 } }
    ]);
    
    // 8. Booking gần đây đã hoàn thành
    const recentCompletedBookings = await BookingRequest.find({
      tutor: tutorId,
      status: 'completed'
    })
      .populate({
        path: 'student',
        select: 'email'
      })
      .sort({ completedAt: -1 })
      .limit(10)
      .lean();
    
    // Lấy StudentProfile cho mỗi booking
    const StudentProfile = require('../models/StudentProfile');
    const recentBookingsWithProfile = await Promise.all(
      recentCompletedBookings.map(async (booking) => {
        const studentProfile = await StudentProfile.findOne({ 
          userId: booking.student._id 
        }).select('fullName avatar').lean();
        
        return {
          _id: booking._id,
          studentName: studentProfile?.fullName || 'Học sinh',
          studentAvatar: studentProfile?.avatar,
          subject: booking.subject?.name || 'N/A',
          level: booking.subject?.level || 'N/A',
          totalAmount: booking.pricing?.totalAmount || 0,
          totalHours: booking.pricing?.totalHours || 0,
          hourlyRate: booking.pricing?.hourlyRate || 0,
          completedAt: booking.completedAt,
          startDate: booking.schedule?.startDate,
          rating: booking.rating?.score
        };
      })
    );
    
    // 9. Thống kê theo trạng thái
    const statusStats = await BookingRequest.aggregate([
      {
        $match: {
          tutor: tutorId
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);
    
    // Format response
    const completedData = completedIncome[0] || { total: 0, totalHours: 0, count: 0 };
    const pendingData = pendingIncome[0] || { total: 0, totalHours: 0, count: 0 };
    const monthData = monthIncome[0] || { total: 0, count: 0 };
    
    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalIncome: completedData.total,
          pendingIncome: pendingData.total,
          monthlyIncome: monthData.total,
          totalHours: completedData.totalHours,
          totalStudents: totalStudents.length,
          completedBookings: completedData.count,
          activeBookings: pendingData.count,
          averageHourlyRate: completedData.totalHours > 0 
            ? Math.round(completedData.total / completedData.totalHours) 
            : 0
        },
        monthlyIncome: monthlyIncomeData,
        incomeBySubject: incomeBySubject,
        incomeByLevel: incomeByLevel,
        recentBookings: recentBookingsWithProfile,
        statusStats: statusStats,
        period: period
      }
    });
    
  } catch (error) {
    console.error('Get tutor income error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get income data',
      error: error.message
    });
  }
};

// @desc    Upload avatar
// @route   POST /api/tutor/profile/avatar
// @access  Private (Tutor only)
const uploadAvatar = async (req, res) => {
  try {
    console.log('\n🔵 [Tutor Avatar Upload] Starting...');
    console.log('📁 File received:', req.file ? 'Yes' : 'No');
    
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('📂 File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
      hasBuffer: req.file.buffer ? 'Yes' : 'No',
      bufferSize: req.file.buffer ? `${req.file.buffer.length} bytes` : 'N/A'
    });

    const userId = req.user._id;
    console.log('👤 User ID:', userId);

    // Import cloudinary upload utility
    const { uploadAvatar: uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require('../utils/cloudinaryUpload');

    // Find user and profile
    const user = await User.findById(userId);
    const profile = await TutorProfile.findOne({ userId });

    if (!user || !profile) {
      console.log('❌ User or profile not found');
      return res.status(404).json({
        success: false,
        message: 'User or profile not found'
      });
    }

    console.log('✅ Profile found:', profile.fullName);
    console.log('📸 Current avatar:', profile.avatar || 'None');

    // Delete old avatar from Cloudinary if exists
    if (profile.avatar && profile.avatar.includes('cloudinary.com')) {
      console.log('🗑️  Deleting old Cloudinary avatar...');
      const oldPublicId = extractPublicId(profile.avatar);
      if (oldPublicId) {
        try {
          await deleteFromCloudinary(oldPublicId);
          console.log('✅ Old avatar deleted:', oldPublicId);
        } catch (deleteError) {
          console.warn('⚠️  Could not delete old avatar:', deleteError.message);
        }
      }
    }

    console.log('☁️  Uploading to Cloudinary...');
    console.log('📦 Buffer size:', req.file.buffer.length, 'bytes');
    
    // Upload new avatar to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, userId);

    console.log('📤 Upload result:', JSON.stringify(uploadResult, null, 2));

    if (!uploadResult.success) {
      console.log('❌ Upload failed - success=false');
      return res.status(500).json({
        success: false,
        message: 'Failed to upload avatar to cloud storage'
      });
    }

    if (!uploadResult.url) {
      console.log('❌ Upload failed - no URL returned');
      return res.status(500).json({
        success: false,
        message: 'Failed to get avatar URL from cloud storage'
      });
    }

    if (!uploadResult.url.includes('cloudinary.com')) {
      console.log('❌ Invalid URL - not Cloudinary:', uploadResult.url);
      return res.status(500).json({
        success: false,
        message: 'Invalid cloud storage URL'
      });
    }

    console.log('✅ Upload successful!');
    console.log('🔗 Cloudinary URL:', uploadResult.url);

    // Update avatar URL in profile
    profile.avatar = uploadResult.url;
    await profile.save();

    console.log('💾 Profile updated with new avatar');
    console.log('✅ [Tutor Avatar Upload] Complete!\n');

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatarUrl: uploadResult.url
      }
    });

  } catch (error) {
    console.error('❌ [Tutor Avatar Upload] Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar',
      error: error.message
    });
  }
};

// @desc    Upload university image
// @route   POST /api/tutor/profile/university-image
// @access  Private (Tutor only)
const uploadUniversityImage = async (req, res) => {
  try {
    console.log('\n🏛️  [Upload University Image] Starting...');
    
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('📁 File received:', req.file.originalname);
    console.log('📦 File size:', req.file.size, 'bytes');

    const userId = req.user._id;

    // Find tutor profile
    const profile = await TutorProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Import cloudinary upload utility
    const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require('../utils/cloudinaryUpload');

    // Delete old university image if exists
    if (profile.universityImage) {
      try {
        const publicId = extractPublicId(profile.universityImage);
        if (publicId) {
          await deleteFromCloudinary(publicId);
          console.log('🗑️  Deleted old university image');
        }
      } catch (deleteError) {
        console.error('Warning: Failed to delete old university image:', deleteError.message);
      }
    }

    // Upload to Cloudinary with university folder
    console.log('☁️  Uploading to Cloudinary...');
    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder: `${process.env.CLOUDINARY_FOLDER || 'tutormis'}/university/${userId}`,
      transformation: [
        { width: 400, height: 400, crop: 'fill' },
        { quality: 'auto' }
      ]
    });

    console.log('✅ Upload successful:', uploadResult.secure_url);

    // Update profile with new university image
    profile.universityImage = uploadResult.secure_url;
    await profile.save();

    console.log('💾 Profile updated with university image');
    console.log('✅ [Upload University Image] Complete!\n');

    res.status(200).json({
      success: true,
      message: 'University image uploaded successfully',
      data: {
        universityImageUrl: uploadResult.secure_url
      }
    });

  } catch (error) {
    console.error('❌ [Upload University Image] Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to upload university image',
      error: error.message
    });
  }
};

// @desc    Upload certificate
// @route   POST /api/tutor/profile/certificate
// @access  Private (Tutor only)
const uploadCertificate = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const userId = req.user._id;

    // Import cloudinary upload utility
    const { uploadCertificate: uploadCertToCloudinary } = require('../utils/cloudinaryUpload');

    // Upload certificate to Cloudinary
    const uploadResult = await uploadCertToCloudinary(req.file.buffer, userId);

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload certificate to cloud storage'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Certificate uploaded successfully',
      data: {
        certificateUrl: uploadResult.url
      }
    });

  } catch (error) {
    console.error('Upload certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload certificate',
      error: error.message
    });
  }
};

module.exports = {
  getDashboard,
  getProfile,
  updateProfile,
  getRequests,
  applyRequest,
  getStudents,
  getIncome,
  uploadAvatar,
  uploadUniversityImage,
  uploadCertificate
};