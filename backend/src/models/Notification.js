const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Notification type
  type: {
    type: String,
    required: true,
    enum: [
      'booking_request',      // Yêu cầu đặt lịch (for tutor)
      'booking_accepted',     // Yêu cầu đặt lịch đã được chấp nhận (for student)
      'booking_rejected',     // Yêu cầu đặt lịch đã bị từ chối (for student)
      'booking_completed',    // Yêu cầu đặt lịch đã hoàn thành 
      'booking_cancelled',    // Yêu cầu đặt lịch đã bị hủy 
      'blog_approved',        // Bài viết đã được phê duyệt (for tutor)
      'blog_rejected',        // Bài viết đã bị từ chối (for tutor)
      'blog_comment',         // Bình luận mới trên bài viết (for tutor)
      'message_received',     // Tin nhắn mới nhận được 
      'profile_approved',     // Hồ sơ gia sư đã được phê duyệt (for tutor)
      'profile_rejected',     // Hồ sơ gia sư đã bị từ chối (for tutor)
      'system'                // Thông báo hệ thống 
    ]
  },

  // Người nhận thông báo
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Người gửi thông báo
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Tiêu đề thông báo
  title: {
    type: String,
    required: true
  },

  // Nội dung thông báo
  message: {
    type: String,
    required: true
  },

  // Đường dẫn liên kết
  link: {
    type: String
  },

  // Liên quan đến entity nào (ID)
  relatedId: {
    type: mongoose.Schema.Types.ObjectId
  },

  // Loại entity liên quan
  relatedModel: {
    type: String,
    enum: ['BookingRequest', 'BlogPost', 'Message', 'TutorRequest', 'User']
  },

  // Icon đại diện cho thông báo
  icon: {
    type: String,
    default: 'fa-bell'
  },

  // Màu sắc cho thông báo
  color: {
    type: String,
    enum: ['blue', 'green', 'red', 'orange', 'purple', 'gray'],
    default: 'blue'
  },

  // Trạng thái đã đọc
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },

  // Thời gian đã đọc
  readAt: {
    type: Date
  },

  // Thời gian tạo
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
