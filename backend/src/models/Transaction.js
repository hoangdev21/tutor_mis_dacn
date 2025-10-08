const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // Loại giao dịch
  type: {
    type: String,
    enum: ['booking', 'commission', 'refund', 'withdrawal', 'deposit', 'penalty', 'bonus'],
    required: true,
    index: true
  },
  
  // Trạng thái giao dịch
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },
  
  // Thông tin người dùng liên quan
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Thông tin booking nếu có
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BookingRequest'
  },
  
  // Số tiền giao dịch
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Phí hoa hồng (nếu là booking)
  commission: {
    rate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    amount: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  
  // Số tiền thực nhận (sau khi trừ commission)
  netAmount: {
    type: Number,
    required: true
  },
  
  // Đơn vị tiền tệ
  currency: {
    type: String,
    default: 'VND',
    enum: ['VND', 'USD']
  },
  
  // Phương thức thanh toán
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'e_wallet', 'credit_card', 'paypal', 'system'],
    default: 'system'
  },
  
  // Thông tin thanh toán
  paymentInfo: {
    bankName: String,
    accountNumber: String,
    accountHolder: String,
    transactionId: String,
    gateway: String
  },
  
  // Mô tả giao dịch
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  
  // Ghi chú nội bộ (chỉ admin thấy)
  internalNote: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Thông tin hoàn tiền
  refund: {
    originalTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    reason: String,
    refundedAt: Date,
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Metadata bổ sung
  metadata: {
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    subject: String,
    hours: Number,
    hourlyRate: Number
  },
  
  // Thời gian hoàn thành
  completedAt: {
    type: Date
  },
  
  // Người xử lý (admin)
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Invoice/Receipt
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // IP address và device info
  ipAddress: String,
  userAgent: String

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ 'metadata.tutorId': 1 });
transactionSchema.index({ 'metadata.studentId': 1 });
transactionSchema.index({ booking: 1 });

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount);
});

// Pre-save middleware to calculate net amount
transactionSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('commission.rate')) {
    if (this.commission && this.commission.rate > 0) {
      this.commission.amount = (this.amount * this.commission.rate) / 100;
      this.netAmount = this.amount - this.commission.amount;
    } else {
      this.netAmount = this.amount;
    }
  }
  
  // Generate invoice number for completed transactions
  if (this.status === 'completed' && !this.invoiceNumber) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    this.invoiceNumber = `INV-${timestamp}-${random}`;
  }
  
  // Set completedAt when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  next();
});

// Methods
transactionSchema.methods.complete = function(processedBy) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.processedBy = processedBy;
  return this.save();
};

transactionSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  this.internalNote = reason;
  return this.save();
};

transactionSchema.methods.refundTransaction = function(refundedBy, reason) {
  this.status = 'refunded';
  this.refund = {
    reason: reason,
    refundedAt: new Date(),
    refundedBy: refundedBy
  };
  return this.save();
};

// Static methods
transactionSchema.statics.getRevenueByPeriod = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalCommission: { $sum: '$commission.amount' },
        totalNet: { $sum: '$netAmount' },
        count: { $sum: 1 }
      }
    }
  ]);
};

transactionSchema.statics.getRevenueByType = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        totalCommission: { $sum: '$commission.amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);
};

transactionSchema.statics.getMonthlyRevenue = async function(year) {
  return this.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        totalRevenue: { $sum: '$amount' },
        totalCommission: { $sum: '$commission.amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

transactionSchema.statics.getUserTransactions = function(userId, options = {}) {
  const { limit = 20, skip = 0, status = null, type = null } = options;
  
  const query = { user: userId };
  if (status) query.status = status;
  if (type) query.type = type;
  
  return this.find(query)
    .populate('booking')
    .populate('user', 'email name')
    .populate('processedBy', 'email name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

transactionSchema.statics.getTopUsers = async function(startDate, endDate, limit = 10) {
  return this.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: '$user',
        totalAmount: { $sum: '$amount' },
        transactionCount: { $sum: 1 }
      }
    },
    {
      $sort: { totalAmount: -1 }
    },
    {
      $limit: limit
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
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
