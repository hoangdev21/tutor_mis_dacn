const { ContactSubmission } = require('../models');

// @desc    Submit contact form from homepage
// @route   POST /api/contact/submit
// @access  Public
const submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin'
      });
    }

    // Get IP address and user agent
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Create contact submission
    const contactSubmission = await ContactSubmission.create({
      name,
      email,
      phone,
      message,
      ipAddress,
      userAgent
    });

    res.status(201).json({
      success: true,
      message: 'Đã gửi thông tin thành công! Chúng tôi sẽ liên hệ với bạn sớm nhất.',
      data: {
        id: contactSubmission._id,
        name: contactSubmission.name,
        email: contactSubmission.email
      }
    });
  } catch (error) {
    console.error('Submit contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi gửi thông tin. Vui lòng thử lại sau.'
    });
  }
};

// @desc    Get all contact submissions (Admin only)
// @route   GET /api/contact/submissions
// @access  Private (Admin only)
const getContactSubmissions = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;

    // Build query
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count
    const total = await ContactSubmission.countDocuments(query);

    // Get submissions with pagination
    const submissions = await ContactSubmission.find(query)
      .populate('repliedBy', 'email role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get stats
    const stats = await ContactSubmission.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statsObject = {
      total: total,
      pending: 0,
      read: 0,
      replied: 0,
      archived: 0
    };

    stats.forEach(stat => {
      statsObject[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: submissions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      stats: statsObject
    });
  } catch (error) {
    console.error('Get contact submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách liên hệ'
    });
  }
};

// @desc    Get single contact submission (Admin only)
// @route   GET /api/contact/submissions/:id
// @access  Private (Admin only)
const getContactSubmissionById = async (req, res) => {
  try {
    const submission = await ContactSubmission.findById(req.params.id)
      .populate('repliedBy', 'email role');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin liên hệ'
      });
    }

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error('Get contact submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải thông tin liên hệ'
    });
  }
};

// @desc    Update contact submission status (Admin only)
// @route   PUT /api/contact/submissions/:id
// @access  Private (Admin only)
const updateContactSubmission = async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    const submission = await ContactSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin liên hệ'
      });
    }

    // Update fields
    if (status) {
      submission.status = status;
      
      // If status is replied, record who replied and when
      if (status === 'replied' && !submission.repliedBy) {
        submission.repliedBy = req.user._id;
        submission.repliedAt = new Date();
      }
    }
    
    if (adminNote !== undefined) {
      submission.adminNote = adminNote;
    }

    await submission.save();

    // Populate repliedBy before sending response
    await submission.populate('repliedBy', 'email role');

    res.json({
      success: true,
      message: 'Cập nhật thành công',
      data: submission
    });
  } catch (error) {
    console.error('Update contact submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật thông tin liên hệ'
    });
  }
};

// @desc    Delete contact submission (Admin only)
// @route   DELETE /api/contact/submissions/:id
// @access  Private (Admin only)
const deleteContactSubmission = async (req, res) => {
  try {
    const submission = await ContactSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin liên hệ'
      });
    }

    await submission.deleteOne();

    res.json({
      success: true,
      message: 'Đã xóa thông tin liên hệ'
    });
  } catch (error) {
    console.error('Delete contact submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể xóa thông tin liên hệ'
    });
  }
};

// @desc    Get contact submission stats (Admin only)
// @route   GET /api/contact/stats
// @access  Private (Admin only)
const getContactStats = async (req, res) => {
  try {
    const total = await ContactSubmission.countDocuments();
    const pending = await ContactSubmission.countDocuments({ status: 'pending' });
    const read = await ContactSubmission.countDocuments({ status: 'read' });
    const replied = await ContactSubmission.countDocuments({ status: 'replied' });
    const archived = await ContactSubmission.countDocuments({ status: 'archived' });

    // Get recent submissions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCount = await ContactSubmission.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    res.json({
      success: true,
      data: {
        total,
        pending,
        read,
        replied,
        archived,
        recent: recentCount
      }
    });
  } catch (error) {
    console.error('Get contact stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải thống kê'
    });
  }
};

module.exports = {
  submitContactForm,
  getContactSubmissions,
  getContactSubmissionById,
  updateContactSubmission,
  deleteContactSubmission,
  getContactStats
};
