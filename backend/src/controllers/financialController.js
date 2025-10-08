const Transaction = require('../models/Transaction');
const BookingRequest = require('../models/BookingRequest');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get financial statistics overview
// @route   GET /api/financial/statistics
// @access  Admin
exports.getStatistics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range
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
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }
    
    // Get revenue data
    const revenueData = await Transaction.getRevenueByPeriod(startDate, endDate);
    const revenueByType = await Transaction.getRevenueByType(startDate, endDate);
    
    // Get transaction counts by status
    const transactionStats = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    // Get pending bookings value
    const pendingBookings = await BookingRequest.aggregate([
      {
        $match: { status: 'pending' }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalValue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);
    
    // Get top users by revenue
    const topUsers = await Transaction.getTopUsers(startDate, endDate, 10);
    
    // Calculate growth rate (compare with previous period)
    const previousStartDate = new Date(startDate);
    const periodDiff = endDate - startDate;
    previousStartDate.setTime(startDate.getTime() - periodDiff);
    
    const previousRevenue = await Transaction.getRevenueByPeriod(previousStartDate, startDate);
    
    const currentRevenue = revenueData[0]?.totalRevenue || 0;
    const prevRevenue = previousRevenue[0]?.totalRevenue || 0;
    const growthRate = prevRevenue > 0 
      ? ((currentRevenue - prevRevenue) / prevRevenue * 100).toFixed(2)
      : 0;
    
    // Log activity
    await ActivityLog.logActivity({
      type: 'admin',
      action: 'view_financial_statistics',
      user: req.user._id,
      userRole: req.user.role,
      resource: 'system',
      description: `Admin viewed financial statistics for period: ${period}`,
      severity: 'info',
      status: 'success',
      metadata: { period },
      request: {
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });
    
    res.json({
      success: true,
      data: {
        overview: {
          totalRevenue: revenueData[0]?.totalRevenue || 0,
          totalCommission: revenueData[0]?.totalCommission || 0,
          netRevenue: revenueData[0]?.totalNet || 0,
          transactionCount: revenueData[0]?.count || 0,
          growthRate: parseFloat(growthRate),
          pendingBookingsCount: pendingBookings[0]?.count || 0,
          pendingBookingsValue: pendingBookings[0]?.totalValue || 0
        },
        revenueByType,
        transactionStats,
        topUsers: topUsers.map(u => ({
          userId: u._id,
          email: u.userInfo.email,
          name: u.userInfo.name,
          role: u.userInfo.role,
          totalAmount: u.totalAmount,
          transactionCount: u.transactionCount
        })),
        period: {
          type: period,
          startDate,
          endDate
        }
      }
    });
    
  } catch (error) {
    console.error('Get statistics error:', error);
    
    await ActivityLog.logActivity({
      type: 'error',
      action: 'view_financial_statistics_failed',
      user: req.user._id,
      userRole: req.user.role,
      resource: 'system',
      description: 'Failed to fetch financial statistics',
      severity: 'error',
      status: 'failed',
      metadata: {
        errorMessage: error.message
      }
    });
    
    res.status(500).json({
      success: false,
      message: 'Không thể tải thống kê tài chính',
      error: error.message
    });
  }
};

// @desc    Get transaction list with pagination and filters
// @route   GET /api/financial/transactions
// @access  Admin
exports.getTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      userId,
      startDate,
      endDate,
      search
    } = req.query;
    
    // Build query
    const query = {};
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (userId) query.user = userId;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'paymentInfo.transactionId': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute query with pagination
    const skip = (page - 1) * limit;
    const transactions = await Transaction.find(query)
      .populate('user', 'email name role')
      .populate('booking')
      .populate('processedBy', 'email name')
      .populate('metadata.tutorId', 'email name')
      .populate('metadata.studentId', 'email name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasMore: skip + transactions.length < total
        }
      }
    });
    
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách giao dịch',
      error: error.message
    });
  }
};

// @desc    Get transaction by ID
// @route   GET /api/financial/transactions/:id
// @access  Admin
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('user', 'email name role phone')
      .populate('booking')
      .populate('processedBy', 'email name')
      .populate('metadata.tutorId', 'email name')
      .populate('metadata.studentId', 'email name')
      .populate('refund.refundedBy', 'email name');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy giao dịch'
      });
    }
    
    res.json({
      success: true,
      data: transaction
    });
    
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải thông tin giao dịch',
      error: error.message
    });
  }
};

// @desc    Get revenue chart data
// @route   GET /api/financial/revenue-chart
// @access  Admin
exports.getRevenueChart = async (req, res) => {
  try {
    const { year = new Date().getFullYear(), type = 'monthly' } = req.query;
    
    let chartData;
    
    if (type === 'monthly') {
      // Get monthly revenue for the year
      chartData = await Transaction.getMonthlyRevenue(year);
      
      // Fill missing months with 0
      const monthlyData = Array(12).fill(null).map((_, index) => {
        const monthData = chartData.find(d => d._id === index + 1);
        return {
          month: index + 1,
          revenue: monthData?.totalRevenue || 0,
          commission: monthData?.totalCommission || 0,
          count: monthData?.count || 0
        };
      });
      
      res.json({
        success: true,
        data: {
          type: 'monthly',
          year: parseInt(year),
          data: monthlyData
        }
      });
      
    } else if (type === 'daily') {
      // Get daily revenue for current month
      const startDate = new Date(year, new Date().getMonth(), 1);
      const endDate = new Date(year, new Date().getMonth() + 1, 0);
      
      const dailyData = await Transaction.aggregate([
        {
          $match: {
            status: 'completed',
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { $dayOfMonth: '$createdAt' },
            revenue: { $sum: '$amount' },
            commission: { $sum: '$commission.amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
      
      res.json({
        success: true,
        data: {
          type: 'daily',
          year: parseInt(year),
          month: new Date().getMonth() + 1,
          data: dailyData.map(d => ({
            day: d._id,
            revenue: d.revenue,
            commission: d.commission,
            count: d.count
          }))
        }
      });
      
    } else if (type === 'category') {
      // Get revenue by transaction type
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      
      const categoryData = await Transaction.getRevenueByType(startDate, endDate);
      
      res.json({
        success: true,
        data: {
          type: 'category',
          year: parseInt(year),
          data: categoryData.map(d => ({
            category: d._id,
            revenue: d.totalAmount,
            commission: d.totalCommission,
            count: d.count
          }))
        }
      });
    }
    
  } catch (error) {
    console.error('Get revenue chart error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải dữ liệu biểu đồ',
      error: error.message
    });
  }
};

// @desc    Create manual transaction
// @route   POST /api/financial/transactions
// @access  Admin
exports.createTransaction = async (req, res) => {
  try {
    const {
      type,
      userId,
      amount,
      description,
      paymentMethod,
      metadata
    } = req.body;
    
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    
    const transaction = new Transaction({
      type,
      user: userId,
      amount,
      description,
      paymentMethod: paymentMethod || 'system',
      status: 'completed',
      metadata,
      processedBy: req.user._id,
      request: {
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });
    
    await transaction.save();
    
    // Log activity
    await ActivityLog.logActivity({
      type: 'transaction',
      action: 'create_transaction',
      user: req.user._id,
      userRole: req.user.role,
      resource: 'transaction',
      resourceId: transaction._id,
      description: `Admin created manual transaction: ${type} - ${amount} VND`,
      severity: 'info',
      status: 'success',
      metadata: {
        targetUser: userId,
        amount,
        type
      },
      request: {
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Tạo giao dịch thành công',
      data: transaction
    });
    
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo giao dịch',
      error: error.message
    });
  }
};

// @desc    Update transaction status
// @route   PUT /api/financial/transactions/:id
// @access  Admin
exports.updateTransaction = async (req, res) => {
  try {
    const { status, internalNote } = req.body;
    
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy giao dịch'
      });
    }
    
    const oldStatus = transaction.status;
    
    if (status) transaction.status = status;
    if (internalNote) transaction.internalNote = internalNote;
    transaction.processedBy = req.user._id;
    
    if (status === 'completed' && !transaction.completedAt) {
      transaction.completedAt = new Date();
    }
    
    await transaction.save();
    
    // Log activity
    await ActivityLog.logActivity({
      type: 'transaction',
      action: 'update_transaction',
      user: req.user._id,
      userRole: req.user.role,
      resource: 'transaction',
      resourceId: transaction._id,
      description: `Admin updated transaction status from ${oldStatus} to ${status}`,
      severity: 'info',
      status: 'success',
      beforeData: { status: oldStatus },
      afterData: { status },
      request: {
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });
    
    res.json({
      success: true,
      message: 'Cập nhật giao dịch thành công',
      data: transaction
    });
    
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật giao dịch',
      error: error.message
    });
  }
};

// @desc    Refund transaction
// @route   POST /api/financial/transactions/:id/refund
// @access  Admin
exports.refundTransaction = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy giao dịch'
      });
    }
    
    if (transaction.status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Giao dịch đã được hoàn tiền'
      });
    }
    
    await transaction.refundTransaction(req.user._id, reason);
    
    // Create refund transaction
    const refundTransaction = new Transaction({
      type: 'refund',
      user: transaction.user,
      amount: transaction.amount,
      description: `Hoàn tiền cho giao dịch ${transaction.invoiceNumber}`,
      status: 'completed',
      refund: {
        originalTransaction: transaction._id,
        reason,
        refundedBy: req.user._id,
        refundedAt: new Date()
      },
      processedBy: req.user._id
    });
    
    await refundTransaction.save();
    
    // Log activity
    await ActivityLog.logActivity({
      type: 'transaction',
      action: 'refund_transaction',
      user: req.user._id,
      userRole: req.user.role,
      resource: 'transaction',
      resourceId: transaction._id,
      description: `Admin refunded transaction: ${transaction.invoiceNumber}`,
      severity: 'warning',
      status: 'success',
      metadata: {
        amount: transaction.amount,
        reason
      },
      request: {
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });
    
    res.json({
      success: true,
      message: 'Hoàn tiền thành công',
      data: {
        originalTransaction: transaction,
        refundTransaction
      }
    });
    
  } catch (error) {
    console.error('Refund transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể hoàn tiền',
      error: error.message
    });
  }
};

// @desc    Export transactions to CSV
// @route   GET /api/financial/export
// @access  Admin
exports.exportTransactions = async (req, res) => {
  try {
    const { startDate, endDate, status, type } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const transactions = await Transaction.find(query)
      .populate('user', 'email name')
      .sort({ createdAt: -1 });
    
    // Format CSV
    const csvHeader = 'ID,Ngày,Loại,Người dùng,Email,Số tiền,Hoa hồng,Thực nhận,Trạng thái,Mô tả\n';
    const csvRows = transactions.map(t => {
      return [
        t._id,
        new Date(t.createdAt).toLocaleString('vi-VN'),
        t.type,
        t.user?.name || '',
        t.user?.email || '',
        t.amount,
        t.commission?.amount || 0,
        t.netAmount,
        t.status,
        `"${t.description.replace(/"/g, '""')}"`
      ].join(',');
    }).join('\n');
    
    const csv = csvHeader + csvRows;
    
    // Log activity
    await ActivityLog.logActivity({
      type: 'admin',
      action: 'export_transactions',
      user: req.user._id,
      userRole: req.user.role,
      resource: 'system',
      description: `Admin exported ${transactions.length} transactions`,
      severity: 'info',
      status: 'success',
      request: {
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=transactions-${Date.now()}.csv`);
    res.send('\uFEFF' + csv); // Add BOM for Excel UTF-8 support
    
  } catch (error) {
    console.error('Export transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể xuất dữ liệu',
      error: error.message
    });
  }
};
