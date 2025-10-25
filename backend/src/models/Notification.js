const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Notification type
  type: {
    type: String,
    required: true,
    enum: [
      'booking_request',      // New booking request received (for tutor)
      'booking_accepted',     // Booking accepted by tutor (for student)
      'booking_rejected',     // Booking rejected by tutor (for student)
      'booking_completed',    // Booking marked as completed (for both)
      'booking_cancelled',    // Booking cancelled (for both)
      'blog_approved',        // Blog post approved by admin (for tutor)
      'blog_rejected',        // Blog post rejected by admin (for tutor)
      'blog_comment',         // New comment on blog post (for tutor)
      'message_received',     // New message received (for both)
      'profile_approved',     // Tutor profile approved (for tutor)
      'profile_rejected',     // Tutor profile rejected (for tutor)
      'system'                // System notification
    ]
  },

  // Recipient of notification
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Sender of notification (optional, for user-generated notifications)
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Notification title
  title: {
    type: String,
    required: true
  },

  // Notification message
  message: {
    type: String,
    required: true
  },

  // Link to navigate to when clicked
  link: {
    type: String
  },

  // Related entity ID (booking, blog, message, etc.)
  relatedId: {
    type: mongoose.Schema.Types.ObjectId
  },

  // Related entity type
  relatedModel: {
    type: String,
    enum: ['BookingRequest', 'BlogPost', 'Message', 'TutorRequest', 'User']
  },

  // Icon for notification (Font Awesome class)
  icon: {
    type: String,
    default: 'fa-bell'
  },

  // Color scheme for notification
  color: {
    type: String,
    enum: ['blue', 'green', 'red', 'orange', 'purple', 'gray'],
    default: 'blue'
  },

  // Read status
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },

  // Read at timestamp
  readAt: {
    type: Date
  },

  // Creation timestamp
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

notificationSchema.statics.createNotification = async function(notificationData) {
  try {
    const notification = new this(notificationData);
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Tạo thông báo thất bại:', error);
    throw error;
  }
};

notificationSchema.statics.getUnreadCount = async function(userId) {
  try {
    const count = await this.countDocuments({
      recipient: userId,
      isRead: false
    });
    return count;
  } catch (error) {
    console.error('Lỗi khi lấy số lượng thông báo chưa đọc:', error);
    return 0;
  }
};

// đánh dấu thông báo là đã đọc
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  await this.save();
  return this;
};

// đánh dấu tất cả thông báo của người dùng là đã đọc
notificationSchema.statics.markAllAsRead = async function(userId) {
  try {
    await this.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return true;
  } catch (error) {
    console.error('Lỗi khi đánh dấu tất cả là đã đọc:', error);
    return false;
  }
};

// Tự động xóa thông báo cũ (trên 30 ngày)
notificationSchema.statics.cleanupOldNotifications = async function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  try {
    await this.deleteMany({
      isRead: true,
      readAt: { $lt: thirtyDaysAgo }
    });
  } catch (error) {
    console.error('Lỗi khi xóa thông báo cũ:', error);
  }
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
