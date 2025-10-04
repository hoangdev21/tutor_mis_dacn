const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null // null nếu là tin nhắn riêng tư
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'audio', 'video'],
    default: 'text'
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  // Tin nhắn hệ thống
  isSystemMessage: {
    type: Boolean,
    default: false
  },
  systemMessageType: {
    type: String,
    enum: ['course_started', 'course_completed', 'payment_received', 'schedule_changed', 'other']
  },
  // Reply tin nhắn
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  // Xóa tin nhắn
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deletedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index cho hiệu suất
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ courseId: 1, createdAt: -1 });
messageSchema.index({ isRead: 1, receiverId: 1 });

// Populate thông tin sender và receiver
messageSchema.pre(/^find/, function(next) {
  this.populate([
    {
      path: 'senderId',
      select: 'email role',
      populate: {
        path: 'profile',
        select: 'fullName avatar'
      }
    },
    {
      path: 'receiverId',  
      select: 'email role',
      populate: {
        path: 'profile',
        select: 'fullName avatar'
      }
    },
    {
      path: 'replyTo',
      select: 'content senderId createdAt'
    }
  ]);
  next();
});

// Đánh dấu đã đọc
messageSchema.methods.markAsRead = function(userId) {
  if (this.receiverId.toString() === userId.toString() && !this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Xóa tin nhắn cho user cụ thể
messageSchema.methods.deleteForUser = function(userId) {
  const existing = this.deletedBy.find(d => d.userId.toString() === userId.toString());
  if (!existing) {
    this.deletedBy.push({ userId });
    
    // Nếu cả 2 user đều xóa thì đánh dấu isDeleted = true
    if (this.deletedBy.length >= 2) {
      this.isDeleted = true;
    }
    
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('Message', messageSchema);