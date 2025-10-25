const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

// @desc    Get activity logs with filters and pagination
// @route   GET /api/logs
// @access  Admin
exports.getLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      type,
      severity,
      status,
      userId,
      startDate,
      endDate,
      search
    } = req.query;
    
    // xây dựng bộ lọc
    const filters = {};
    
    if (type) filters.type = type;
    if (severity) filters.severity = severity;
    if (status) filters.status = status;
    if (userId) filters.user = userId;
    
    if (startDate || endDate) {
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
    }
    
    const skip = (page - 1) * limit;
    
    // Get logs
    let query;
    if (search) {
      query = ActivityLog.searchLogs(search, filters, parseInt(limit));
      query = query.skip(skip);
    } else {
      query = ActivityLog.getRecentActivities(parseInt(limit), filters);
      query = query.skip(skip);
    }
    
    const logs = await query;
    
    // Get total count
    const countQuery = {};
    if (type) countQuery.type = type;
    if (severity) countQuery.severity = severity;
    if (status) countQuery.status = status;
    if (userId) countQuery.user = userId;
    if (startDate || endDate) {
      countQuery.createdAt = {};
      if (startDate) countQuery.createdAt.$gte = new Date(startDate);
      if (endDate) countQuery.createdAt.$lte = new Date(endDate);
    }
    
    const total = await ActivityLog.countDocuments(countQuery);
    
    // đánh dấu logs đã đọc
    const logIds = logs.filter(log => !log.isRead).map(log => log._id);
    if (logIds.length > 0) {
      await ActivityLog.updateMany(
        { _id: { $in: logIds } },
        { $set: { isRead: true } }
      );
    }
    
    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasMore: skip + logs.length < total
        }
      }
    });
    
  } catch (error) {
    console.error('Lỗi:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải logs',
      error: error.message
    });
  }
};

// @desc    Get log by ID
// @route   GET /api/logs/:id
// @access  Admin
exports.getLogById = async (req, res) => {
  try {
    const log = await ActivityLog.findById(req.params.id)
      .populate('user', 'email name role')
      .populate('resolvedBy', 'email name')
      .populate('metadata.targetUser', 'email name role');
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy log'
      });
    }
    
    // Đánh dấu là đã đọc
    if (!log.isRead) {
      log.isRead = true;
      await log.save();
    }
    
    res.json({
      success: true,
      data: log
    });
    
  } catch (error) {
    console.error('Lỗi:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải log',
      error: error.message
    });
  }
};

// @desc    Get log statistics
// @route   GET /api/logs/statistics
// @access  Admin
exports.getLogStatistics = async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    // tính toán khoảng thời gian
    const now = new Date();
    let startDate, endDate = now;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }
    
    // Get số liệu hoạt động
    const activityStats = await ActivityLog.getActivityStats(startDate, endDate);
    
    // Get số liệu mức độ nghiêm trọng
    const severityCounts = await ActivityLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get số liệu lỗi chưa giải quyết
    const unresolvedErrors = await ActivityLog.countDocuments({
      severity: { $in: ['error', 'critical'] },
      isResolved: false
    });
    
    // Get hoạt động theo giờ
    const activityByHour = await ActivityLog.getActivityByHour(new Date());
    
    // Get top 10 người dùng hoạt động nhiều nhất
    const topUsers = await ActivityLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          user: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$user',
          activityCount: { $sum: 1 }
        }
      },
      {
        $sort: { activityCount: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      }
    ]);
    
    // tính tổng hoạt động
    const totalActivities = await ActivityLog.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    res.json({
      success: true,
      data: {
        overview: {
          totalActivities,
          unresolvedErrors,
          period: {
            type: period,
            startDate,
            endDate
          }
        },
        activityByType: activityStats,
        activityBySeverity: severityCounts,
        activityByHour,
        topUsers: topUsers.map(u => ({
          userId: u._id,
          email: u.userInfo.email,
          name: u.userInfo.name,
          role: u.userInfo.role,
          activityCount: u.activityCount
        }))
      }
    });
    
  } catch (error) {
    console.error('Lỗi thống kê logs:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải thống kê logs',
      error: error.message
    });
  }
};

// @desc    Get unresolved errors
// @route   GET /api/logs/unresolved
// @access  Admin
exports.getUnresolvedErrors = async (req, res) => {
  try {
    const errors = await ActivityLog.getUnresolvedErrors();
    
    res.json({
      success: true,
      data: errors
    });
    
  } catch (error) {
    console.error('Lỗi tải lỗi chưa giải quyết:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải lỗi chưa giải quyết',
      error: error.message
    });
  }
};

// @desc    Resolve log (for errors/warnings)
// @route   PUT /api/logs/:id/resolve
// @access  Admin
exports.resolveLog = async (req, res) => {
  try {
    const { note } = req.body;
    
    const log = await ActivityLog.findById(req.params.id);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy log'
      });
    }
    
    await log.resolve(req.user._id, note);
    
    // tạo activity log cho hành động giải quyết
    await ActivityLog.logActivity({
      type: 'admin',
      action: 'resolve_log',
      user: req.user._id,
      userRole: req.user.role,
      resource: 'system',
      resourceId: log._id,
      description: `Admin đã giải quyết log: ${log.action}`,
      severity: 'info',
      status: 'success',
      metadata: {
        originalLogId: log._id,
        note
      },
      request: {
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });
    
    res.json({
      success: true,
      message: 'Đã đánh dấu giải quyết',
      data: log
    });
    
  } catch (error) {
    console.error('Lỗi giải quyết log:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể giải quyết log',
      error: error.message
    });
  }
};

// @desc    Delete old logs
// @route   DELETE /api/logs/cleanup
// @access  Admin
exports.cleanupLogs = async (req, res) => {
  try {
    const result = await ActivityLog.cleanupOldLogs();
    
    await ActivityLog.logActivity({
      type: 'admin',
      action: 'cleanup_logs',
      user: req.user._id,
      userRole: req.user.role,
      resource: 'system',
      description: `Admin đã xóa ${result.deletedCount} logs cũ`,
      severity: 'info',
      status: 'success',
      metadata: {
        deletedCount: result.deletedCount
      },
      request: {
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });
    
    res.json({
      success: true,
      message: `Đã xóa ${result.deletedCount} logs cũ`,
      data: {
        deletedCount: result.deletedCount
      }
    });
    
  } catch (error) {
    console.error('Lỗi xóa logs:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể xóa logs',
      error: error.message
    });
  }
};

// @desc    Export logs to CSV
// @route   GET /api/logs/export
// @access  Admin
exports.exportLogs = async (req, res) => {
  try {
    const {
      type,
      severity,
      status,
      startDate,
      endDate
    } = req.query;
    
    const filters = {};
    if (type) filters.type = type;
    if (severity) filters.severity = severity;
    if (status) filters.status = status;
    if (startDate || endDate) {
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
    }
    
    const logs = await ActivityLog.getRecentActivities(10000, filters);
    
    // Format CSV
    const csvHeader = 'ID,Ngày,Loại,Hành động,Người dùng,Email,Role,Mô tả,Mức độ,Trạng thái,IP\n';
    const csvRows = logs.map(log => {
      return [
        log._id,
        new Date(log.createdAt).toLocaleString('vi-VN'),
        log.type,
        log.action,
        log.user?.name || 'System',
        log.user?.email || '',
        log.userRole || '',
        `"${log.description.replace(/"/g, '""')}"`,
        log.severity,
        log.status,
        log.request?.ip || ''
      ].join(',');
    }).join('\n');
    
    const csv = csvHeader + csvRows;
    
    // Log export activity
    await ActivityLog.logActivity({
      type: 'admin',
      action: 'export_logs',
      user: req.user._id,
      userRole: req.user.role,
      resource: 'system',
      description: `Admin đã xuất ${logs.length} logs`,
      severity: 'info',
      status: 'success',
      metadata: {
        count: logs.length,
        filters
      },
      request: {
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=logs-${Date.now()}.csv`);
    res.send('\uFEFF' + csv); // Add BOM for Excel UTF-8 support
    
  } catch (error) {
    console.error('Export logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể xuất logs',
      error: error.message
    });
  }
};

// @desc    Get user activity timeline
// @route   GET /api/logs/user/:userId
// @access  Admin
exports.getUserActivityTimeline = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    
    const activities = await ActivityLog.getUserActivities(userId, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        activities
      }
    });
    
  } catch (error) {
    console.error('Lỗi tải timeline người dùng:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải timeline',
      error: error.message
    });
  }
};
