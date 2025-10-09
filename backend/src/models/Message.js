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
    required: false, // Not required if attachments exist
    trim: true,
    maxlength: 2000,
    default: ''
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index cho hiệu suất
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ courseId: 1, createdAt: -1 });
messageSchema.index({ isRead: 1, receiverId: 1 });

// Validation: Message phải có content hoặc attachments
messageSchema.pre('validate', function(next) {
  if (!this.content && (!this.attachments || this.attachments.length === 0)) {
    this.invalidate('content', 'Message must have either content or attachments');
  }
  next();
});

// Populate thông tin sender và receiver
messageSchema.pre(/^find/, function(next) {
  this.populate([
    {
      path: 'senderId',
      select: 'email role _id',
      populate: [
        {
          path: 'profile',
          select: 'fullName avatar'
        }
      ]
    },
    {
      path: 'receiverId',  
      select: 'email role _id',
      populate: [
        {
          path: 'profile',
          select: 'fullName avatar'
        }
      ]
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