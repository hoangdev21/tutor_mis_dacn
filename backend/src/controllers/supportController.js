const { SupportTicket, User } = require('../models');
const { uploadToCloudinary } = require('../utils/cloudinaryUpload');

// @desc    Create new support ticket
// @route   POST /api/support/tickets
// @access  Private
const createTicket = async (req, res) => {
  try {
    const { category, priority, subject, description } = req.body;
    const userId = req.user.id;

    // Handle file uploads
    let attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadToCloudinary(file.buffer, {
            folder: 'support-tickets',
            resource_type: 'auto'
          });

          attachments.push({
            url: result.secure_url,
            publicId: result.public_id,
            filename: file.originalname,
            fileType: file.mimetype
          });
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      }
    }

    // Create ticket
    const ticket = await SupportTicket.create({
      user: userId,
      category,
      priority,
      subject,
      description,
      attachments
    });

    await ticket.populate('user', 'email role');

    res.status(201).json({
      success: true,
      message: 'Yêu cầu hỗ trợ đã được tạo thành công',
      data: ticket
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo yêu cầu hỗ trợ'
    });
  }
};

// @desc    Get user's tickets
// @route   GET /api/support/tickets
// @access  Private
const getMyTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const query = { user: userId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const tickets = await SupportTicket.find(query)
      .sort({ createdAt: -1 })
      .populate('user', 'email role')
      .populate('assignedTo', 'email');

    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách yêu cầu'
    });
  }
};

// @desc    Get ticket by ID
// @route   GET /api/support/tickets/:id
// @access  Private
const getTicketById = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('user', 'email role')
      .populate('assignedTo', 'email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu'
      });
    }

    // Check if user is owner or admin
    if (ticket.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem yêu cầu này'
      });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải thông tin yêu cầu'
    });
  }
};

// @desc    Get all tickets (Admin only)
// @route   GET /api/support/admin/tickets
// @access  Private/Admin
const getAllTickets = async (req, res) => {
  try {
    const { status, category, priority, search } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const tickets = await SupportTicket.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .populate('user', 'email role')
      .populate('assignedTo', 'email');

    // Get user profiles for each ticket
    const { StudentProfile, TutorProfile } = require('../models');
    
    const ticketsWithProfiles = await Promise.all(tickets.map(async (ticket) => {
      const ticketObj = ticket.toObject();
      
      if (ticketObj.user) {
        let profile = null;
        if (ticketObj.user.role === 'student') {
          profile = await StudentProfile.findOne({ userId: ticketObj.user._id });
        } else if (ticketObj.user.role === 'tutor') {
          profile = await TutorProfile.findOne({ userId: ticketObj.user._id });
        }
        
        if (profile) {
          // Split fullName into firstName and lastName
          const nameParts = profile.fullName ? profile.fullName.trim().split(' ') : ['Unknown'];
          ticketObj.user.firstName = nameParts[0];
          ticketObj.user.lastName = nameParts.slice(1).join(' ') || nameParts[0];
        } else {
          ticketObj.user.firstName = 'Unknown';
          ticketObj.user.lastName = 'User';
        }
      }
      
      return ticketObj;
    }));

    // Calculate stats
    const stats = {
      total: tickets.length,
      pending: tickets.filter(t => t.status === 'pending').length,
      inProgress: tickets.filter(t => t.status === 'in-progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length
    };

    res.json({
      success: true,
      tickets: ticketsWithProfiles,
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách yêu cầu'
    });
  }
};

// @desc    Update ticket status and response (Admin only)
// @route   PUT /api/support/admin/tickets/:id
// @access  Private/Admin
const updateTicket = async (req, res) => {
  try {
    const { status, adminResponse, assignedTo } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu'
      });
    }

    // Update fields
    if (status) {
      ticket.status = status;
      
      if (status === 'resolved') {
        ticket.resolvedAt = new Date();
      } else if (status === 'closed') {
        ticket.closedAt = new Date();
      }
    }

    if (adminResponse) {
      ticket.adminResponse = adminResponse;
    }

    if (assignedTo) {
      ticket.assignedTo = assignedTo;
    }

    await ticket.save();
    await ticket.populate('user', 'email role');
    await ticket.populate('assignedTo', 'email');

    res.json({
      success: true,
      message: 'Cập nhật yêu cầu thành công',
      data: ticket
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật yêu cầu'
    });
  }
};

// @desc    Delete ticket (Admin only)
// @route   DELETE /api/support/admin/tickets/:id
// @access  Private/Admin
const deleteTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu'
      });
    }

    await ticket.deleteOne();

    res.json({
      success: true,
      message: 'Xóa yêu cầu thành công'
    });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa yêu cầu'
    });
  }
};

// @desc    Get ticket statistics (Admin only)
// @route   GET /api/support/admin/stats
// @access  Private/Admin
const getTicketStats = async (req, res) => {
  try {
    const totalTickets = await SupportTicket.countDocuments();
    const pendingTickets = await SupportTicket.countDocuments({ status: 'pending' });
    const inProgressTickets = await SupportTicket.countDocuments({ status: 'in-progress' });
    const resolvedTickets = await SupportTicket.countDocuments({ status: 'resolved' });

    // Category breakdown
    const categoryStats = await SupportTicket.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    // Priority breakdown
    const priorityStats = await SupportTicket.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        total: totalTickets,
        pending: pendingTickets,
        inProgress: inProgressTickets,
        resolved: resolvedTickets,
        byCategory: categoryStats,
        byPriority: priorityStats
      }
    });
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải thống kê'
    });
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getTicketById,
  getAllTickets,
  updateTicket,
  deleteTicket,
  getTicketStats
};
