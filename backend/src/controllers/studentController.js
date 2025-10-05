const { StudentProfile, TutorRequest, Course, Message, BlogPost, BookingRequest, User, TutorProfile } = require('../models');

// @desc    Lấy thông tin dashboard học sinh
// @route   GET /api/student/dashboard
// @access  Private (Student only)
const getDashboard = async (req, res) => {
  try {
    const studentId = req.user._id;
    
    // Thống kê tổng quan với BookingRequest
    const [
      totalBookings,
      activeBookings,
      completedBookings,
      pendingRequests,
      totalTutors,
      unreadMessages
    ] = await Promise.all([
      BookingRequest.countDocuments({ student: studentId }),
      BookingRequest.countDocuments({ student: studentId, status: 'accepted' }),
      BookingRequest.countDocuments({ student: studentId, status: 'completed' }),
      TutorRequest.countDocuments({ studentId, status: { $in: ['open', 'reviewing'] } }),
      BookingRequest.distinct('tutor', { student: studentId, status: { $in: ['accepted', 'completed'] } }).then(tutors => tutors.length),
      Message.countDocuments({ receiverId: studentId, isRead: false })
    ]);
    
    // Khóa học đang học (Booking accepted)
    const activeCourses = await BookingRequest.find({ 
      student: studentId, 
      status: 'accepted' 
    })
      .sort({ 'schedule.startDate': -1 })
      .limit(5)
      .populate({
        path: 'tutor',
        select: 'email role',
        populate: {
          path: 'profile',
          select: 'fullName avatar phone stats'
        }
      })
      .lean();
    
    // Khóa học gần đây (tất cả booking) - sort by most recent
    const recentCourses = await BookingRequest.find({ 
      student: studentId 
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: 'tutor',
        select: 'email role',
        populate: {
          path: 'profile',
          model: 'TutorProfile',
          select: 'fullName avatar phone stats'
        }
      })
      .lean();
    
    // Yêu cầu hoạt động (TutorRequest)
    const activeRequests = await TutorRequest.find({ 
      studentId,
      status: { $in: ['open', 'in_progress'] }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title subject level status totalApplications applications createdAt expiryDate budgetRange location')
      .lean();
    
    console.log(`📋 [Student ${studentId}] Found ${activeRequests.length} active requests`);
    
    // Tin nhắn gần đây - lấy conversations
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: studentId },
            { receiverId: studentId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', studentId] },
              '$receiverId',
              '$senderId'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ['$receiverId', studentId] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      },
      {
        $limit: 5
      }
    ]);
    
    // Populate user info cho conversations
    const recentMessages = await Promise.all(
      conversations.map(async (conv) => {
        const otherUser = await User.findById(conv._id)
          .select('email role')
          .populate('profile', 'fullName avatar')
          .lean();
        
        return {
          ...conv.lastMessage,
          otherUser,
          unreadCount: conv.unreadCount
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalBookings,
          activeBookings,
          completedBookings,
          pendingRequests,
          totalTutors,
          unreadMessages
        },
        recentCourses: recentCourses.map(booking => ({
          _id: booking._id,
          tutorId: booking.tutor?._id,
          tutorName: booking.tutor?.profile?.fullName || booking.tutor?.email || 'N/A',
          tutorAvatar: booking.tutor?.profile?.avatar,
          tutorRating: booking.tutor?.profile?.stats?.averageRating || 0,
          subject: booking.subject?.name || booking.subject,
          level: booking.subject?.level,
          status: booking.status,
          startDate: booking.schedule?.startDate,
          endDate: booking.schedule?.endDate,
          totalAmount: booking.pricing?.totalAmount,
          hourlyRate: booking.pricing?.hourlyRate,
          hoursPerSession: booking.schedule?.hoursPerSession,
          daysPerWeek: booking.schedule?.daysPerWeek,
          duration: booking.schedule?.duration,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt
        })),
        activeRequests: activeRequests.map(req => ({
          _id: req._id,
          title: req.title,
          subject: req.subject,
          level: req.level,
          status: req.status,
          totalApplications: req.applications?.length || req.totalApplications || 0,
          applications: req.applications || [],
          budget: req.budgetRange || { min: 0, max: 0 },
          location: req.location,
          createdAt: req.createdAt,
          expiryDate: req.expiryDate
        })),
        recentMessages: recentMessages.map(msg => ({
          _id: msg._id,
          otherUserId: msg.otherUser?._id,
          otherUserName: msg.otherUser?.profile?.fullName || msg.otherUser?.email || 'Unknown',
          otherUserAvatar: msg.otherUser?.profile?.avatar,
          otherUserRole: msg.otherUser?.role,
          content: msg.content,
          createdAt: msg.createdAt,
          isRead: msg.isRead,
          unreadCount: msg.unreadCount || 0
        }))
      }
    });
    
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data'
    });
  }
};

// @desc    Lấy và cập nhật thông tin profile học sinh
// @route   GET/PUT /api/student/profile
// @access  Private (Student only)
const getProfile = async (req, res) => {
  try {
    const { User } = require('../models');
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }
    
    // Include user information in response
    const user = await User.findById(req.user._id);
    
    res.status(200).json({
      success: true,
      data: {
        ...profile.toObject(),
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('Get student profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { User } = require('../models');
    const {
      fullName,
      phone,
      dateOfBirth,
      gender,
      address,
      city,
      district,
      schoolName,
      currentGrade,
      interestedSubjects,
      bio,
      learningGoals
    } = req.body;

    const profile = await StudentProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Update profile with all fields including fullName and phone
    if (fullName) profile.fullName = fullName;
    if (phone) profile.phone = phone;
    if (dateOfBirth) profile.dateOfBirth = dateOfBirth;
    if (gender) profile.gender = gender;
    if (address) profile.address = address;
    if (city) profile.city = city;
    if (district) profile.district = district;
    if (schoolName) profile.schoolName = schoolName;
    if (currentGrade) profile.currentGrade = currentGrade;
    if (interestedSubjects) profile.interestedSubjects = interestedSubjects;
    if (bio) profile.bio = bio;
    if (learningGoals) profile.learningGoals = learningGoals;

    await profile.save();

    // Get user for email
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        ...profile.toObject(),
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('Update student profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// @desc    Lấy danh sách khóa học của học sinh
// @route   GET /api/student/courses
// @access  Private (Student only)
const getCourses = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const studentId = req.user._id;
    
    const query = { studentId };
    if (status) query.status = status;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count
    const total = await Course.countDocuments(query);
    
    // Get courses
    const courses = await Course.find(query)
      .populate({
        path: 'tutorId',
        select: 'email',
        populate: {
          path: 'profile',
          select: 'fullName avatar phone stats.averageRating'
        }
      })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    res.status(200).json({
      success: true,
      data: {
        courses: courses,
        total: total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Get student courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get courses'
    });
  }
};

// @desc    Lấy chi tiết khóa học
// @route   GET /api/student/courses/:courseId
// @access  Private (Student only)
const getCourseDetail = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user._id;
    
    const course = await Course.findOne({ _id: courseId, studentId })
      .populate('tutorId', 'email')
      .populate({
        path: 'tutorId',
        populate: {
          path: 'profile',
          select: 'fullName avatar phone bio stats'
        }
      });
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: course
    });
    
  } catch (error) {
    console.error('Get course detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get course detail'
    });
  }
};

// @desc    Đánh giá khóa học
// @route   POST /api/student/courses/:courseId/rate
// @access  Private (Student only)
const rateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { score, comment } = req.body;
    const studentId = req.user._id;
    
    const course = await Course.findOne({ 
      _id: courseId, 
      studentId,
      status: 'completed'
    });
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or not completed'
      });
    }
    
    if (course.rating.studentRating.score) {
      return res.status(400).json({
        success: false,
        message: 'Course already rated'
      });
    }
    
    course.rating.studentRating = {
      score,
      comment,
      date: new Date()
    };
    
    await course.save();
    
    // TODO: Cập nhật rating trung bình của tutor
    
    res.status(200).json({
      success: true,
      message: 'Course rated successfully',
      data: course
    });
    
  } catch (error) {
    console.error('Rate course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rate course'
    });
  }
};

// @desc    Upload avatar
// @route   POST /api/student/profile/avatar
// @access  Private (Student only)
const uploadAvatar = async (req, res) => {
  try {
    console.log('\n🔵 [Student Avatar Upload] Starting...');
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

    const profile = await StudentProfile.findOne({ userId });
    if (!profile) {
      console.log('❌ Profile not found for user:', userId);
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
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
    console.log('✅ [Student Avatar Upload] Complete!\n');

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatarUrl: uploadResult.url
      }
    });

  } catch (error) {
    console.error('❌ [Student Avatar Upload] Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar',
      error: error.message
    });
  }
};

module.exports = {
  getDashboard,
  getProfile,
  updateProfile,
  getCourses,
  getCourseDetail,
  rateCourse,
  uploadAvatar
};