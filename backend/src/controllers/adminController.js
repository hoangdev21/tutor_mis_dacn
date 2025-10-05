const { User, TutorProfile, StudentProfile, AdminProfile, TutorRequest, Course, BlogPost, Message } = require('../models');
const { sendEmail, tutorApprovalTemplate } = require('../utils/email');
const { notifyProfileApproved, notifyProfileRejected, notifyBlogApproved, notifyBlogRejected } = require('../utils/notifications');

// @desc    Lấy thông tin profile admin
// @route   GET /api/admin/profile
// @access  Private (Admin only)
const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Tìm admin profile
    let adminProfile = await AdminProfile.findOne({ userId });
    
    if (!adminProfile) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: adminProfile
    });
    
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin profile'
    });
  }
};

// @desc    Lấy thông tin dashboard admin
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
const getDashboard = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const BookingRequest = require('../models/BookingRequest');
    
    // Thống kê tổng quan
    const [
      totalUsers,
      totalStudents,
      totalTutors,
      totalAdmins,
      pendingTutors,
      totalCourses,
      acceptedBookings,
      activeCourses,
      totalRequests,
      pendingRequests,
      totalBlogPosts,
      pendingBlogPosts,
      totalMessages
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'student', isActive: true }),
      User.countDocuments({ role: 'tutor', isActive: true, approvalStatus: 'approved' }),
      User.countDocuments({ role: 'admin', isActive: true }),
      User.countDocuments({ role: 'tutor', approvalStatus: 'pending' }),
      Course.countDocuments(),
      BookingRequest.countDocuments({ status: 'accepted' }),
      Course.countDocuments({ status: 'active' }),
      TutorRequest.countDocuments(),
      TutorRequest.countDocuments({ status: 'open' }),
      BlogPost.countDocuments(),
      BlogPost.countDocuments({ status: 'pending' }),
      Message.countDocuments()
    ]);
    
    // Tổng khóa học thực tế (courses + accepted bookings)
    const actualTotalCourses = totalCourses + acceptedBookings;
    
    // Tính toán doanh thu (giả sử)
    const totalRevenue = actualTotalCourses * 500000; // Giả sử mỗi khóa ~500k
    
    // Thống kê theo thời gian dựa trên period
    let days = 7;
    let labels = [];
    let studentsData = [];
    let tutorsData = [];
    
    if (period === 'week') {
      days = 7;
    } else if (period === 'month') {
      days = 30;
    } else if (period === 'year') {
      days = 365;
    }
    
    // Tạo data cho chart dựa trên period
    if (period === 'year') {
      // 12 tháng
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
        
        const [newStudents, newTutors] = await Promise.all([
          User.countDocuments({
            role: 'student',
            createdAt: { $gte: monthStart, $lte: monthEnd }
          }),
          User.countDocuments({
            role: 'tutor',
            createdAt: { $gte: monthStart, $lte: monthEnd }
          })
        ]);
        
        const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
        labels.push(monthNames[date.getMonth()]);
        studentsData.push(newStudents);
        tutorsData.push(newTutors);
      }
    } else {
      // 7 ngày hoặc 30 ngày
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const [newStudents, newTutors] = await Promise.all([
          User.countDocuments({
            role: 'student',
            createdAt: { $gte: date, $lt: nextDate }
          }),
          User.countDocuments({
            role: 'tutor',
            createdAt: { $gte: date, $lt: nextDate }
          })
        ]);
        
        if (period === 'week') {
          const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
          labels.push(dayNames[date.getDay()]);
        } else {
          labels.push(`${date.getDate()}/${date.getMonth() + 1}`);
        }
        studentsData.push(newStudents);
        tutorsData.push(newTutors);
      }
    }
    
    // System activities (hoạt động gần đây)
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('email role createdAt')
      .lean();
    
    const recentBlogs = await BlogPost.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt status')
      .lean();
    
    const recentCourses = await Course.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('subject status createdAt')
      .lean();
    
    const systemActivities = [];
    
    // Tạo timeline activities
    [...recentUsers.slice(0, 3).map(u => ({
      type: 'user_registered',
      icon: 'fa-user-plus',
      color: '#667eea',
      message: `Người dùng mới đăng ký: ${u.email}`,
      time: u.createdAt
    })),
    ...recentBlogs.slice(0, 2).map(b => ({
      type: 'blog_created',
      icon: 'fa-blog',
      color: '#f59e0b',
      message: `Bài viết mới: ${b.title}`,
      time: b.createdAt
    })),
    ...recentCourses.slice(0, 2).map(c => ({
      type: 'course_created',
      icon: 'fa-book',
      color: '#10b981',
      message: `Khóa học mới: ${c.subject}`,
      time: c.createdAt
    }))]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 10)
    .forEach(activity => {
      systemActivities.push(activity);
    });
    
    // Gia sư cần duyệt gần đây
    const pendingTutorUsers = await User.find({ 
      role: 'tutor',
      approvalStatus: 'pending'
    })
      .select('_id email createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    const pendingTutorsList = await Promise.all(
      pendingTutorUsers.map(async (user) => {
        const profile = await TutorProfile.findOne({ userId: user._id })
          .select('fullName phone subjects teachingExperience avatar')
          .lean();
        return {
          ...profile,
          userId: user._id,
          email: user.email,
          createdAt: user.createdAt
        };
      })
    );
    
    // Bài viết cần duyệt
    const pendingBlogPostsList = await BlogPost.find({ status: 'pending' })
      .populate('author', 'email role')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    // Populate author profiles cho blog posts
    for (let post of pendingBlogPostsList) {
      if (post.author && post.author._id) {
        let profile = null;
        if (post.authorRole === 'student') {
          profile = await StudentProfile.findOne({ userId: post.author._id }).select('fullName avatar').lean();
        } else if (post.authorRole === 'tutor') {
          profile = await TutorProfile.findOne({ userId: post.author._id }).select('fullName avatar').lean();
        } else if (post.authorRole === 'admin') {
          profile = await AdminProfile.findOne({ userId: post.author._id }).select('fullName avatar').lean();
        }
        post.authorProfile = profile;
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalStudents,
          totalTutors,
          totalAdmins,
          pendingTutors,
          totalCourses: actualTotalCourses,
          activeCourses,
          totalRequests,
          pendingRequests,
          totalBlogPosts,
          pendingBlogPosts: pendingBlogPosts,
          pendingBlogs: pendingBlogPosts, // Alias for frontend
          totalRevenue,
          totalMessages
        },
        userStats: {
          labels,
          students: studentsData,
          tutors: tutorsData,
          totalStudents,
          totalTutors,
          totalAdmins
        },
        systemActivities,
        pendingTutors: pendingTutorsList,
        pendingBlogPosts: pendingBlogPostsList
      }
    });
    
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data'
    });
  }
};

// @desc    Lấy thông tin chi tiết một user
// @route   GET /api/admin/users/:userId
// @access  Private (Admin only)
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).populate('profile');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
    
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user'
    });
  }
};

// @desc    Quản lý người dùng
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getUsers = async (req, res) => {
  try {
    const { 
      role, 
      status, 
      approvalStatus, 
      search, 
      page = 1, 
      limit = 20 
    } = req.query;
    
    const query = {};
    
    if (role) query.role = role;
    if (status) query.isActive = status === 'active';
    if (approvalStatus) query.approvalStatus = approvalStatus;
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count
    const total = await User.countDocuments(query);
    
    // Get users
    const users = await User.find(query)
      .populate({
        path: 'profile',
        select: 'fullName phone avatar subjects teachingExperience.totalYears'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    res.status(200).json({
      success: true,
      data: {
        users: users,
        total: total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
};

// @desc    Duyệt gia sư
// @route   PUT /api/admin/users/:userId/approve
// @access  Private (Admin only)
const approveTutor = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isApproved, reason } = req.body;
    const adminId = req.user._id;
    
    const user = await User.findById(userId).populate('profile');
    
    if (!user || user.role !== 'tutor') {
      return res.status(404).json({
        success: false,
        message: 'Tutor not found'
      });
    }
    
    if (user.approvalStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Tutor is not pending approval'
      });
    }
    
    // Cập nhật trạng thái
    user.approvalStatus = isApproved ? 'approved' : 'rejected';
    user.approvedBy = adminId;
    user.approvedAt = new Date();
    
    if (!isApproved && reason) {
      user.rejectionReason = reason;
    }
    
    await user.save();
    
    // Gửi email thông báo
    const emailTemplate = tutorApprovalTemplate(
      user.profile.fullName, 
      isApproved, 
      reason
    );
    await sendEmail(user.email, emailTemplate);
    
    // Create notification for tutor
    try {
      if (isApproved) {
        await notifyProfileApproved(userId);
      } else {
        await notifyProfileRejected(userId, reason);
      }
    } catch (notifError) {
      console.error('❌ Failed to create notification:', notifError);
    }
    
    // Cập nhật stats admin
    await AdminProfile.findOneAndUpdate(
      { userId: adminId },
      {
        $inc: {
          'stats.tutorsApproved': isApproved ? 1 : 0,
          'stats.tutorsRejected': isApproved ? 0 : 1
        }
      }
    );
    
    res.status(200).json({
      success: true,
      message: `Tutor ${isApproved ? 'approved' : 'rejected'} successfully`
    });
    
  } catch (error) {
    console.error('Approve tutor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve tutor'
    });
  }
};

// @desc    Vô hiệu hóa/kích hoạt người dùng
// @route   PUT /api/admin/users/:userId/toggle-status
// @access  Private (Admin only)
const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Không cho phép admin tự vô hiệu hóa chính mình
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }
    
    user.isActive = !user.isActive;
    
    if (!user.isActive && reason) {
      // Lưu lý do vô hiệu hóa (có thể thêm field mới)
      user.deactivationReason = reason;
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        userId: user._id,
        isActive: user.isActive
      }
    });
    
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle user status'
    });
  }
};

// @desc    Quản lý nội dung blog
// @route   GET /api/admin/content/blogs
// @access  Private (Admin only)
const getBlogPosts = async (req, res) => {
  try {
    console.log('📝 getBlogPosts called');
    console.log('Query params:', req.query);
    console.log('User:', req.user?._id, req.user?.role);
    console.log('User profile:', req.user?.profile);
    
    const { status, category, search, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (category) query.category = category;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    console.log('MongoDB query:', query);
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count
    const total = await BlogPost.countDocuments(query);
    console.log('Total posts found:', total);
    
    // Get blog posts with author profiles
    const blogPosts = await BlogPost.find(query)
      .populate({
        path: 'author',
        select: 'email role'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    // Populate author profiles with avatars
    for (let post of blogPosts) {
      if (post.author && post.author._id) {
        let profile = null;
        if (post.authorRole === 'student') {
          profile = await require('../models/StudentProfile').findOne({ userId: post.author._id }).select('avatar fullName');
        } else if (post.authorRole === 'tutor') {
          profile = await require('../models/TutorProfile').findOne({ userId: post.author._id }).select('avatar fullName');
        } else if (post.authorRole === 'admin') {
          profile = await require('../models/AdminProfile').findOne({ userId: post.author._id }).select('avatar fullName');
        }
        post.authorProfile = profile;
      }
    }
    
    console.log('Blog posts retrieved:', blogPosts.length);
    
    res.status(200).json({
      success: true,
      data: {
        blogPosts: blogPosts,
        total: total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('❌ Get blog posts error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to get blog posts',
      error: error.message
    });
  }
};

// @desc    Duyệt bài viết blog
// @route   PUT /api/admin/content/blogs/:postId/moderate
// @access  Private (Admin only)
const moderateBlogPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { action, reason } = req.body; // action: 'approve' | 'reject'
    const adminId = req.user._id;
    
    const blogPost = await BlogPost.findById(postId).populate('author', 'email');
    
    if (!blogPost) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    if (blogPost.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Blog post is not pending moderation'
      });
    }
    
    // Validate action
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      });
    }
    
    // Update status
    blogPost.status = action === 'approve' ? 'approved' : 'rejected';
    blogPost.moderatedBy = adminId;
    blogPost.moderatedAt = new Date();
    
    if (action === 'reject' && reason) {
      blogPost.moderationNote = reason;
    }
    
    await blogPost.save();
    
    // Create notification for blog author
    try {
      if (action === 'approve') {
        await notifyBlogApproved(blogPost, blogPost.author._id);
      } else {
        await notifyBlogRejected(blogPost, blogPost.author._id, reason);
      }
    } catch (notifError) {
      console.error('❌ Failed to create notification:', notifError);
    }
    
    // Update admin stats
    await AdminProfile.findOneAndUpdate(
      { userId: adminId },
      { $inc: { 'stats.contentModerated': 1 } }
    );
    
    res.status(200).json({
      success: true,
      message: `Blog post ${action}d successfully`,
      data: blogPost
    });
    
  } catch (error) {
    console.error('Moderate blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to moderate blog post'
    });
  }
};

// @desc    Update blog post
// @route   PUT /api/admin/content/blogs/:postId
// @access  Private (Admin only)
const updateBlogPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, content, category, tags, type } = req.body;
    
    const blogPost = await BlogPost.findById(postId);
    
    if (!blogPost) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    // Update fields if provided
    if (title !== undefined) blogPost.title = title;
    if (content !== undefined) blogPost.content = content;
    if (category !== undefined) blogPost.category = category;
    if (tags !== undefined) blogPost.tags = tags;
    if (type !== undefined) blogPost.type = type;
    
    await blogPost.save();
    
    res.status(200).json({
      success: true,
      message: 'Blog post updated successfully',
      data: blogPost
    });
    
  } catch (error) {
    console.error('Update blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update blog post',
      error: error.message
    });
  }
};

// @desc    Delete blog post
// @route   DELETE /api/admin/content/blogs/:postId
// @access  Private (Admin only)
const deleteBlogPost = async (req, res) => {
  try {
    const { postId } = req.params;
    
    const blogPost = await BlogPost.findById(postId);
    
    if (!blogPost) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    await blogPost.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Blog post deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete blog post',
      error: error.message
    });
  }
};

// @desc    Thống kê tài chính
// @route   GET /api/admin/finance
// @access  Private (Admin only)
const getFinanceStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }
    
    // Tổng thu nhập hệ thống (giả sử thu 10% từ mỗi giao dịch)
    const totalRevenue = await Course.aggregate([
      { 
        $match: { 
          status: { $in: ['active', 'completed'] },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$payment.paidAmount' },
          totalCourses: { $sum: 1 },
          platformFee: { $sum: { $multiply: ['$payment.paidAmount', 0.1] } }
        }
      }
    ]);
    
    // Thu nhập theo tháng
    const monthlyRevenue = await Course.aggregate([
      { 
        $match: { 
          status: { $in: ['active', 'completed'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalAmount: { $sum: '$payment.paidAmount' },
          courseCount: { $sum: 1 },
          platformFee: { $sum: { $multiply: ['$payment.paidAmount', 0.1] } }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);
    
    const result = totalRevenue[0] || { 
      totalAmount: 0, 
      totalCourses: 0, 
      platformFee: 0 
    };
    
    res.status(200).json({
      success: true,
      data: {
        summary: result,
        monthlyRevenue
      }
    });
    
  } catch (error) {
    console.error('Get finance stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get finance statistics'
    });
  }
};

// ===== COURSE MANAGEMENT =====

// @desc    Lấy danh sách courses với pagination và filters (bao gồm cả booking requests đã accepted)
// @route   GET /api/admin/courses
// @access  Private (Admin only)
const getCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      subject,
      level,
      search,
      sort = '-createdAt',
      source = 'all' // 'all', 'courses', 'bookings'
    } = req.query;

    let allItems = [];
    let total = 0;

    // Get from Course collection
    if (source === 'all' || source === 'courses') {
      const courseFilter = {};
      
      if (status && status !== '') {
        courseFilter.status = status;
      }
      
      if (subject && subject !== '') {
        courseFilter.subject = subject;
      }
      
      if (level && level !== '') {
        courseFilter.level = level;
      }

      // Search
      if (search && search.trim() !== '') {
        const searchRegex = new RegExp(search.trim(), 'i');
        const matchingUsers = await User.find({
          $or: [{ email: searchRegex }]
        }).select('_id');
        
        const userIds = matchingUsers.map(u => u._id);
        
        courseFilter.$or = [
          { title: searchRegex },
          { subject: searchRegex },
          { tutorId: { $in: userIds } },
          { studentId: { $in: userIds } }
        ];
      }

      // Course model has pre-find middleware, but we need to populate manually after lean()
      const courses = await Course.find(courseFilter)
        .populate('tutorId', 'email role')
        .populate('studentId', 'email role')
        .sort(sort)
        .lean();

      // Populate profiles manually for courses
      const courseTutorIds = courses.map(c => c.tutorId?._id).filter(Boolean);
      const courseStudentIds = courses.map(c => c.studentId?._id).filter(Boolean);
      
      const [courseTutorProfiles, courseStudentProfiles] = await Promise.all([
        courseTutorIds.length > 0 ? require('../models/TutorProfile').find({ userId: { $in: courseTutorIds } }).select('userId fullName phone avatar hourlyRate subjects yearsOfExperience stats').lean() : [],
        courseStudentIds.length > 0 ? require('../models/StudentProfile').find({ userId: { $in: courseStudentIds } }).select('userId fullName phone avatar address educationLevel').lean() : []
      ]);

      // Create lookup maps for courses
      const courseTutorProfileMap = {};
      courseTutorProfiles.forEach(p => {
        courseTutorProfileMap[p.userId.toString()] = p;
      });

      const courseStudentProfileMap = {};
      courseStudentProfiles.forEach(p => {
        courseStudentProfileMap[p.userId.toString()] = p;
      });

      // Attach profiles to courses and use tutor's hourlyRate
      const coursesWithProfiles = courses.map(course => {
        const tutorId = course.tutorId?._id;
        const studentId = course.studentId?._id;
        
        const tutorProfile = tutorId ? courseTutorProfileMap[tutorId.toString()] : null;
        const studentProfile = studentId ? courseStudentProfileMap[studentId.toString()] : null;

        // Attach profiles to user objects
        if (course.tutorId && tutorProfile) {
          course.tutorId.profile = tutorProfile;
          // Use tutor's hourlyRate if available
          if (tutorProfile.hourlyRate) {
            course.hourlyRate = tutorProfile.hourlyRate;
          }
        }
        
        if (course.studentId && studentProfile) {
          course.studentId.profile = studentProfile;
        }

        return course;
      });

      allItems.push(...coursesWithProfiles.map(c => ({ ...c, _source: 'course' })));
    }

    // Get from BookingRequest collection (accepted bookings as "courses")
    if (source === 'all' || source === 'bookings') {
      const BookingRequest = require('../models/BookingRequest');
      
      const bookingFilter = { status: 'accepted' };
      
      if (subject && subject !== '') {
        bookingFilter['subject.name'] = subject;
      }
      
      if (level && level !== '') {
        bookingFilter['subject.level'] = level;
      }

      // Map booking status to course status
      if (status && status !== '') {
        // Accepted bookings are like pending/active courses
        if (status === 'active' || status === 'pending') {
          // Already filtered by status: accepted
        } else {
          // Other statuses don't match accepted bookings
          bookingFilter.status = 'no_match';
        }
      }

      // Search
      if (search && search.trim() !== '') {
        const searchRegex = new RegExp(search.trim(), 'i');
        const matchingUsers = await User.find({
          $or: [{ email: searchRegex }]
        }).select('_id');
        
        const userIds = matchingUsers.map(u => u._id);
        
        bookingFilter.$or = [
          { 'subject.name': searchRegex },
          { tutor: { $in: userIds } },
          { student: { $in: userIds } }
        ];
      }

      const bookings = await BookingRequest.find(bookingFilter)
        .populate('tutor', 'email role')
        .populate('student', 'email role')
        .sort(sort)
        .lean();

      // Populate profiles manually with FULL information including hourlyRate
      const tutorIds = bookings.map(b => b.tutor?._id).filter(Boolean);
      const studentIds = bookings.map(b => b.student?._id).filter(Boolean);
      
      const [tutorProfiles, studentProfiles] = await Promise.all([
        tutorIds.length > 0 ? require('../models/TutorProfile').find({ userId: { $in: tutorIds } }).select('userId fullName phone avatar hourlyRate subjects yearsOfExperience stats').lean() : [],
        studentIds.length > 0 ? require('../models/StudentProfile').find({ userId: { $in: studentIds } }).select('userId fullName phone avatar address educationLevel').lean() : []
      ]);

      // Create lookup maps
      const tutorProfileMap = {};
      tutorProfiles.forEach(p => {
        // Handle both ObjectId and plain object with _id
        const key = p.userId?._id ? p.userId._id.toString() : p.userId.toString();
        tutorProfileMap[key] = p;
      });

      const studentProfileMap = {};
      studentProfiles.forEach(p => {
        // Handle both ObjectId and plain object with _id
        const key = p.userId?._id ? p.userId._id.toString() : p.userId.toString();
        studentProfileMap[key] = p;
      });

      // Convert booking requests to course format
      const bookingsAsCourses = bookings.map(booking => {
        const tutorProfile = booking.tutor ? tutorProfileMap[booking.tutor._id.toString()] : null;
        const studentProfile = booking.student ? studentProfileMap[booking.student._id.toString()] : null;

        // Use hourlyRate from tutor profile as primary source
        const hourlyRate = tutorProfile?.hourlyRate || booking.pricing?.hourlyRate || 0;

        return {
          _id: booking._id,
          _source: 'booking',
          tutorId: booking.tutor ? {
            _id: booking.tutor._id,
            email: booking.tutor.email,
            role: booking.tutor.role,
            profile: tutorProfile
          } : null,
          studentId: booking.student ? {
            _id: booking.student._id,
            email: booking.student.email,
            role: booking.student.role,
            profile: studentProfile
          } : null,
          subject: booking.subject?.name || 'N/A',
          level: booking.subject?.level || 'N/A',
          title: `${booking.subject?.name} - ${booking.subject?.level}`,
          description: booking.studentNote,
          hourlyRate: hourlyRate,
          totalHours: booking.pricing?.totalHours || 0,
          completedHours: 0,
          schedule: {
            daysOfWeek: [],
            timeSlots: [],
            timezone: 'Asia/Ho_Chi_Minh'
          },
          location: {
            type: booking.location?.type || 'online',
            address: booking.location?.address,
            platform: null,
            notes: null
          },
          status: 'active', // Accepted bookings are active courses
          startDate: booking.schedule?.startDate,
          endDate: null,
          payment: {
            method: 'hourly',
            totalAmount: hourlyRate * (booking.pricing?.totalHours || 0),
            paidAmount: 0,
            pendingAmount: hourlyRate * (booking.pricing?.totalHours || 0)
          },
          rating: {},
          notes: `Booking Request ID: ${booking._id}`,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt
        };
      });

      allItems.push(...bookingsAsCourses);
    }

    // Sort combined results
    allItems.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA; // Descending by default
    });

    total = allItems.length;

    // Apply pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedItems = allItems.slice(skip, skip + parseInt(limit));

    // Calculate stats for each item
    const itemsWithStats = paginatedItems.map(item => {
      const result = {
        ...item,
        completionRate: item.totalHours > 0 
          ? Math.round((item.completedHours / item.totalHours) * 100) 
          : 0,
        remainingAmount: (item.payment?.totalAmount || 0) - (item.payment?.paidAmount || 0)
      };
      
      return result;
    });

    res.status(200).json({
      success: true,
      data: {
        courses: itemsWithStats,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });

  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get courses'
    });
  }
};

// @desc    Lấy thông tin chi tiết course
// @route   GET /api/admin/courses/:id
// @access  Private (Admin only)
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it's a booking request ID or course ID
    let course = await Course.findById(id)
      .populate({
        path: 'tutorId',
        select: 'email role'
      })
      .populate({
        path: 'studentId',
        select: 'email role'
      })
      .lean();

    if (!course) {
      // Try to find in BookingRequest collection
      const BookingRequest = require('../models/BookingRequest');
      const booking = await BookingRequest.findById(id)
        .populate('tutor', 'email role')
        .populate('student', 'email role')
        .lean();

      if (booking && booking.status === 'accepted') {
        // Get profiles manually with FULL information including hourlyRate
        const tutorProfile = booking.tutor 
          ? await require('../models/TutorProfile').findOne({ userId: booking.tutor._id }).select('fullName phone avatar hourlyRate subjects yearsOfExperience stats').lean()
          : null;
        const studentProfile = booking.student 
          ? await require('../models/StudentProfile').findOne({ userId: booking.student._id }).select('fullName phone avatar address educationLevel').lean()
          : null;

        // Convert booking to course format
        course = {
          _id: booking._id,
          _source: 'booking',
          tutorId: booking.tutor ? {
            _id: booking.tutor._id,
            email: booking.tutor.email,
            role: booking.tutor.role,
            profile: tutorProfile
          } : null,
          studentId: booking.student ? {
            _id: booking.student._id,
            email: booking.student.email,
            role: booking.student.role,
            profile: studentProfile
          } : null,
          subject: booking.subject?.name || 'N/A',
          level: booking.subject?.level || 'N/A',
          title: `${booking.subject?.name} - ${booking.subject?.level}`,
          description: booking.studentNote,
          // Use hourlyRate from tutor profile as primary source
          hourlyRate: tutorProfile?.hourlyRate || booking.pricing?.hourlyRate || 0,
          totalHours: booking.pricing?.totalHours || 0,
          completedHours: 0,
          schedule: {
            daysOfWeek: [],
            timeSlots: [],
            timezone: 'Asia/Ho_Chi_Minh'
          },
          location: {
            type: booking.location?.type || 'online',
            address: booking.location?.address,
            platform: null,
            notes: null
          },
          status: 'active',
          startDate: booking.schedule?.startDate,
          endDate: null,
          payment: {
            method: 'hourly',
            totalAmount: booking.pricing?.totalAmount || 0,
            paidAmount: 0,
            pendingAmount: booking.pricing?.totalAmount || 0
          },
          rating: {},
          notes: `Booking Request ID: ${booking._id}`,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt
        };
      } else {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
    } else {
      // Populate profiles for Course model with FULL information
      const tutorProfile = course.tutorId 
        ? await require('../models/TutorProfile').findOne({ userId: course.tutorId._id }).select('fullName phone avatar hourlyRate subjects yearsOfExperience stats').lean()
        : null;
      const studentProfile = course.studentId 
        ? await require('../models/StudentProfile').findOne({ userId: course.studentId._id }).select('fullName phone avatar address educationLevel').lean()
        : null;

      if (tutorProfile && course.tutorId) {
        course.tutorId.profile = tutorProfile;
        // Override hourlyRate with the one from tutor profile (most accurate)
        if (tutorProfile.hourlyRate) {
          course.hourlyRate = tutorProfile.hourlyRate;
        }
      }
      if (studentProfile && course.studentId) {
        course.studentId.profile = studentProfile;
      }
    }

    // Add calculated fields
    course.completionRate = course.totalHours > 0 
      ? Math.round((course.completedHours / course.totalHours) * 100) 
      : 0;
    course.remainingAmount = (course.payment?.totalAmount || 0) - (course.payment?.paidAmount || 0);

    res.status(200).json({
      success: true,
      data: course
    });

  } catch (error) {
    console.error('Get course by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get course',
      error: error.message
    });
  }
};

// @desc    Cập nhật course (chủ yếu là status)
// @route   PUT /api/admin/courses/:id
// @access  Private (Admin only)
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, cancellationReason } = req.body;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Update fields
    if (status) {
      course.status = status;
      
      if (status === 'cancelled') {
        course.cancellationReason = cancellationReason || 'Cancelled by admin';
        course.cancelledBy = req.user._id;
        course.cancelledAt = new Date();
      }
    }

    if (notes !== undefined) {
      course.notes = notes;
    }

    await course.save();

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });

  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update course'
    });
  }
};

// @desc    Xóa course
// @route   DELETE /api/admin/courses/:id
// @access  Private (Admin only)
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Chỉ cho phép xóa course ở trạng thái pending hoặc cancelled
    if (course.status !== 'pending' && course.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete courses with pending or cancelled status'
      });
    }

    await course.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });

  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete course'
    });
  }
};

// @desc    Lấy thống kê courses (bao gồm cả accepted booking requests)
// @route   GET /api/admin/courses/stats
// @access  Private (Admin only)
const getCourseStats = async (req, res) => {
  try {
    const BookingRequest = require('../models/BookingRequest');
    
    const [
      // Course stats
      totalCourses,
      activeCourses,
      completedCourses,
      cancelledCourses,
      totalRevenue,
      pendingPayments,
      subjectStats,
      levelStats,
      // Booking stats
      acceptedBookings,
      bookingRevenue
    ] = await Promise.all([
      Course.countDocuments(),
      Course.countDocuments({ status: 'active' }),
      Course.countDocuments({ status: 'completed' }),
      Course.countDocuments({ status: 'cancelled' }),
      Course.aggregate([
        { $match: { status: { $in: ['active', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$payment.paidAmount' } } }
      ]),
      Course.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$payment.pendingAmount' } } }
      ]),
      Course.aggregate([
        { $group: { _id: '$subject', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Course.aggregate([
        { $group: { _id: '$level', count: { $sum: 1 } } }
      ]),
      // Accepted bookings count as active courses
      BookingRequest.countDocuments({ status: 'accepted' }),
      BookingRequest.aggregate([
        { $match: { status: 'accepted' } },
        { $group: { _id: null, total: { $sum: '$pricing.totalAmount' } } }
      ])
    ]);

    // Combine stats from both sources
    const combinedTotal = totalCourses + acceptedBookings;
    const combinedActive = activeCourses + acceptedBookings;
    const combinedPending = (pendingPayments[0]?.total || 0) + (bookingRevenue[0]?.total || 0);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          total: combinedTotal,
          active: combinedActive,
          completed: completedCourses,
          cancelled: cancelledCourses
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          pending: combinedPending
        },
        subjects: subjectStats,
        levels: levelStats,
        sources: {
          courses: totalCourses,
          bookings: acceptedBookings
        }
      }
    });

  } catch (error) {
    console.error('Get course stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get course statistics'
    });
  }
};

module.exports = {
  getProfile,
  getDashboard,
  getUsers,
  getUserById,
  approveTutor,
  toggleUserStatus,
  getBlogPosts,
  moderateBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getFinanceStats,
  // Course management
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getCourseStats
};