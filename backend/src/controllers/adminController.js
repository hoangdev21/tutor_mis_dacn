const { User, TutorProfile, StudentProfile, AdminProfile, TutorRequest, Course, BlogPost, Message } = require('../models');
const { sendEmail, tutorApprovalTemplate } = require('../utils/email');

// @desc    Lấy thông tin dashboard admin
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
const getDashboard = async (req, res) => {
  try {
    // Thống kê tổng quan
    const [
      totalUsers,
      totalStudents,
      totalTutors,
      pendingTutors,
      totalCourses,
      activeCourses,
      totalRequests,
      pendingRequests,
      totalBlogPosts,
      pendingBlogPosts
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'student', isActive: true }),
      User.countDocuments({ role: 'tutor', isActive: true, approvalStatus: 'approved' }),
      User.countDocuments({ role: 'tutor', approvalStatus: 'pending' }),
      Course.countDocuments(),
      Course.countDocuments({ status: 'active' }),
      TutorRequest.countDocuments(),
      TutorRequest.countDocuments({ status: 'open' }),
      BlogPost.countDocuments(),
      BlogPost.countDocuments({ status: 'pending' })
    ]);
    
    // Thống kê theo ngày (7 ngày gần đây)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const [newUsers, newCourses, newRequests] = await Promise.all([
        User.countDocuments({
          createdAt: { $gte: date, $lt: nextDate }
        }),
        Course.countDocuments({
          createdAt: { $gte: date, $lt: nextDate }
        }),
        TutorRequest.countDocuments({
          createdAt: { $gte: date, $lt: nextDate }
        })
      ]);
      
      last7Days.push({
        date: date.toISOString().split('T')[0],
        newUsers,
        newCourses,
        newRequests
      });
    }
    
    // Gia sư cần duyệt gần đây
    const pendingTutorsList = await TutorProfile.find({ 
      'userId.approvalStatus': 'pending' 
    })
      .populate('userId', 'email createdAt')
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Bài viết cần duyệt
    const pendingBlogPostsList = await BlogPost.find({ status: 'pending' })
      .populate('authorId', 'email role')
      .populate({
        path: 'authorId',
        populate: {
          path: 'profile',
          select: 'fullName'
        }
      })
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalStudents,
          totalTutors,
          pendingTutors,
          totalCourses,
          activeCourses,
          totalRequests,
          pendingRequests,
          totalBlogPosts,
          pendingBlogPosts
        },
        chartData: last7Days,
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
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count
    const total = await BlogPost.countDocuments(query);
    
    // Get blog posts
    const blogPosts = await BlogPost.find(query)
      .populate({
        path: 'authorId',
        select: 'email role',
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
        blogPosts: blogPosts,
        total: total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Get blog posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get blog posts'
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
    
    const blogPost = await BlogPost.findById(postId);
    
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
    
    if (action === 'approve') {
      blogPost.status = 'published';
      blogPost.publishedAt = new Date();
    } else if (action === 'reject') {
      blogPost.status = 'rejected';
      if (reason) {
        blogPost.rejectionReason = reason;
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
    }
    
    blogPost.moderatedBy = adminId;
    blogPost.moderatedAt = new Date();
    
    await blogPost.save();
    
    // Cập nhật stats admin
    await AdminProfile.findOneAndUpdate(
      { userId: adminId },
      { $inc: { 'stats.contentModerated': 1 } }
    );
    
    res.status(200).json({
      success: true,
      message: `Blog post ${action}d successfully`
    });
    
  } catch (error) {
    console.error('Moderate blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to moderate blog post'
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

module.exports = {
  getDashboard,
  getUsers,
  getUserById,
  approveTutor,
  toggleUserStatus,
  getBlogPosts,
  moderateBlogPost,
  getFinanceStats
};