const Notification = require('../models/Notification');

/**
 * Notification creation utility functions
 */

// Notification type configurations
const notificationConfig = {
  booking_request: {
    icon: 'fa-calendar-plus',
    color: 'blue',
    getTitleAndMessage: (data) => ({
      title: 'Yêu Cầu Đặt Lịch Mới',
      message: `${data.studentName} đã gửi yêu cầu đặt lịch học ${data.subjectName}`
    })
  },
  booking_accepted: {
    icon: 'fa-check-circle',
    color: 'green',
    getTitleAndMessage: (data) => ({
      title: 'Yêu Cầu Được Chấp Nhận',
      message: `Gia sư ${data.tutorName} đã chấp nhận yêu cầu đặt lịch của bạn`
    })
  },
  booking_rejected: {
    icon: 'fa-times-circle',
    color: 'red',
    getTitleAndMessage: (data) => ({
      title: 'Yêu Cầu Bị Từ Chối',
      message: `Gia sư ${data.tutorName} đã từ chối yêu cầu đặt lịch của bạn`
    })
  },
  booking_completed: {
    icon: 'fa-graduation-cap',
    color: 'green',
    getTitleAndMessage: (data) => ({
      title: 'Khóa Học Hoàn Thành',
      message: `Khóa học ${data.subjectName} đã được đánh dấu hoàn thành`
    })
  },
  booking_cancelled: {
    icon: 'fa-ban',
    color: 'red',
    getTitleAndMessage: (data) => ({
      title: 'Lịch Học Bị Hủy',
      message: `Lịch học ${data.subjectName} đã bị hủy`
    })
  },
  blog_approved: {
    icon: 'fa-check-circle',
    color: 'green',
    getTitleAndMessage: (data) => ({
      title: 'Bài Viết Được Duyệt',
      message: `Bài viết "${data.blogTitle}" của bạn đã được admin phê duyệt`
    })
  },
  blog_rejected: {
    icon: 'fa-times-circle',
    color: 'red',
    getTitleAndMessage: (data) => ({
      title: 'Bài Viết Bị Từ Chối',
      message: `Bài viết "${data.blogTitle}" của bạn đã bị từ chối`
    })
  },
  blog_comment: {
    icon: 'fa-comment',
    color: 'blue',
    getTitleAndMessage: (data) => ({
      title: 'Bình Luận Mới',
      message: `${data.commenterName} đã bình luận về bài viết "${data.blogTitle}"`
    })
  },
  message_received: {
    icon: 'fa-envelope',
    color: 'blue',
    getTitleAndMessage: (data) => ({
      title: 'Tin Nhắn Mới',
      message: `${data.senderName} đã gửi tin nhắn cho bạn`
    })
  },
  profile_approved: {
    icon: 'fa-user-check',
    color: 'green',
    getTitleAndMessage: () => ({
      title: 'Hồ Sơ Được Duyệt',
      message: 'Hồ sơ gia sư của bạn đã được admin phê duyệt. Bạn có thể bắt đầu nhận yêu cầu từ học sinh.'
    })
  },
  profile_rejected: {
    icon: 'fa-user-times',
    color: 'red',
    getTitleAndMessage: (data) => ({
      title: 'Hồ Sơ Bị Từ Chối',
      message: `Hồ sơ gia sư của bạn đã bị từ chối. Lý do: ${data.reason || 'Không đáp ứng yêu cầu'}`
    })
  },
  system: {
    icon: 'fa-info-circle',
    color: 'gray',
    getTitleAndMessage: (data) => ({
      title: data.title || 'Thông Báo Hệ Thống',
      message: data.message || 'Bạn có thông báo mới từ hệ thống'
    })
  }
};

/**
 * Create a notification
 * @param {Object} params - Notification parameters
 * @param {String} params.type - Notification type
 * @param {String} params.recipientId - Recipient user ID
 * @param {String} params.senderId - Sender user ID (optional)
 * @param {Object} params.data - Data for building title/message
 * @param {String} params.link - Link to navigate to (optional)
 * @param {String} params.relatedId - Related entity ID (optional)
 * @param {String} params.relatedModel - Related entity model (optional)
 */
async function createNotification({
  type,
  recipientId,
  senderId = null,
  data = {},
  link = null,
  relatedId = null,
  relatedModel = null
}) {
  try {
    const config = notificationConfig[type];
    if (!config) {
      console.error(`Unknown notification type: ${type}`);
      return null;
    }

    const { title, message } = config.getTitleAndMessage(data);

    const notification = await Notification.createNotification({
      type,
      recipient: recipientId,
      sender: senderId,
      title,
      message,
      link,
      relatedId,
      relatedModel,
      icon: config.icon,
      color: config.color
    });

    console.log(`✅ Notification created: ${type} for user ${recipientId}`);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Create notification for new booking request
 */
async function notifyBookingRequest(booking, tutorId, studentName) {
  return createNotification({
    type: 'booking_request',
    recipientId: tutorId,
    senderId: booking.student,
    data: {
      studentName,
      subjectName: booking.subject?.name || 'môn học'
    },
    link: `/pages/tutor/new_request.html`,
    relatedId: booking._id,
    relatedModel: 'BookingRequest'
  });
}

/**
 * Create notification for booking accepted
 */
async function notifyBookingAccepted(booking, studentId, tutorName) {
  return createNotification({
    type: 'booking_accepted',
    recipientId: studentId,
    senderId: booking.tutor,
    data: {
      tutorName,
      subjectName: booking.subject?.name || 'môn học'
    },
    link: `/pages/student/bookings.html`,
    relatedId: booking._id,
    relatedModel: 'BookingRequest'
  });
}

/**
 * Create notification for booking rejected
 */
async function notifyBookingRejected(booking, studentId, tutorName) {
  return createNotification({
    type: 'booking_rejected',
    recipientId: studentId,
    senderId: booking.tutor,
    data: {
      tutorName,
      subjectName: booking.subject?.name || 'môn học'
    },
    link: `/pages/student/bookings.html`,
    relatedId: booking._id,
    relatedModel: 'BookingRequest'
  });
}

/**
 * Create notification for booking completed
 */
async function notifyBookingCompleted(booking, recipientId, subjectName) {
  return createNotification({
    type: 'booking_completed',
    recipientId,
    data: { subjectName },
    link: `/pages/tutor/schedule.html`,
    relatedId: booking._id,
    relatedModel: 'BookingRequest'
  });
}

/**
 * Create notification for blog approved
 */
async function notifyBlogApproved(blog, authorId) {
  return createNotification({
    type: 'blog_approved',
    recipientId: authorId,
    data: {
      blogTitle: blog.title
    },
    link: `/pages/tutor/blog.html`,
    relatedId: blog._id,
    relatedModel: 'BlogPost'
  });
}

/**
 * Create notification for blog rejected
 */
async function notifyBlogRejected(blog, authorId, reason) {
  return createNotification({
    type: 'blog_rejected',
    recipientId: authorId,
    data: {
      blogTitle: blog.title,
      reason
    },
    link: `/pages/tutor/blog.html`,
    relatedId: blog._id,
    relatedModel: 'BlogPost'
  });
}

/**
 * Create notification for new message
 */
async function notifyNewMessage(message, recipientId, senderName) {
  return createNotification({
    type: 'message_received',
    recipientId,
    senderId: message.sender,
    data: { senderName },
    link: `/pages/student/messages.html`,
    relatedId: message._id,
    relatedModel: 'Message'
  });
}

/**
 * Create notification for tutor profile approved
 */
async function notifyProfileApproved(tutorId) {
  return createNotification({
    type: 'profile_approved',
    recipientId: tutorId,
    data: {},
    link: `/pages/tutor/dashboard.html`
  });
}

/**
 * Create notification for tutor profile rejected
 */
async function notifyProfileRejected(tutorId, reason) {
  return createNotification({
    type: 'profile_rejected',
    recipientId: tutorId,
    data: { reason },
    link: `/pages/tutor/profile.html`
  });
}

module.exports = {
  createNotification,
  notifyBookingRequest,
  notifyBookingAccepted,
  notifyBookingRejected,
  notifyBookingCompleted,
  notifyBlogApproved,
  notifyBlogRejected,
  notifyNewMessage,
  notifyProfileApproved,
  notifyProfileRejected
};
