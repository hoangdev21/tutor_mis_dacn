# Hướng Dẫn Sử Dụng Hệ Thống Thông Báo

## Dành Cho Người Dùng

### Xem Thông Báo

1. **Kiểm tra số lượng thông báo mới:**
   - Nhìn vào icon chuông 🔔 ở góc phải trên cùng
   - Số màu đỏ hiện số lượng thông báo chưa đọc

2. **Mở danh sách thông báo:**
   - Click vào icon chuông
   - Panel thông báo sẽ mở ra bên dưới

3. **Đọc thông báo:**
   - Click vào bất kỳ thông báo nào
   - Thông báo sẽ được đánh dấu là đã đọc
   - Bạn sẽ được chuyển đến trang liên quan (nếu có)

4. **Đánh dấu tất cả đã đọc:**
   - Click nút "Đánh dấu tất cả đã đọc" ở header của panel
   - Tất cả thông báo sẽ được đánh dấu là đã đọc

5. **Xóa thông báo:**
   - Hover chuột lên thông báo
   - Click vào icon "X" màu xám ở góc phải
   - Thông báo sẽ bị xóa khỏi danh sách

### Các Loại Thông Báo

#### Dành Cho Học Sinh 👨‍🎓

- **✅ Yêu cầu được chấp nhận:** Gia sư đã chấp nhận yêu cầu đặt lịch của bạn
- **❌ Yêu cầu bị từ chối:** Gia sư đã từ chối yêu cầu đặt lịch của bạn
- **🎓 Khóa học hoàn thành:** Khóa học của bạn đã hoàn thành
- **📧 Tin nhắn mới:** Bạn có tin nhắn mới từ gia sư

#### Dành Cho Gia Sư 👨‍🏫

- **📅 Yêu cầu đặt lịch mới:** Học sinh mới gửi yêu cầu đặt lịch
- **✅ Bài viết được duyệt:** Admin đã phê duyệt bài viết blog của bạn
- **❌ Bài viết bị từ chối:** Admin đã từ chối bài viết blog của bạn
- **✅ Hồ sơ được duyệt:** Admin đã phê duyệt hồ sơ gia sư của bạn
- **❌ Hồ sơ bị từ chối:** Admin đã từ chối hồ sơ gia sư của bạn
- **💬 Bình luận mới:** Có người bình luận về bài viết của bạn
- **📧 Tin nhắn mới:** Bạn có tin nhắn mới từ học sinh

## Dành Cho Developer

### Thêm Thông Báo Vào Trang Mới

1. **Thêm CSS:**
```html
<link rel="stylesheet" href="../../assets/css/notifications.css">
```

2. **Thêm JavaScript:**
```html
<script src="../../assets/js/notifications.js"></script>
```

3. **Đảm bảo HTML có notification button:**
```html
<button class="notification-btn">
  <i class="fas fa-bell"></i>
  <span class="notification-badge" id="notificationBadge">0</span>
</button>
```

### Tạo Thông Báo Mới Từ Backend

#### Ví Dụ 1: Thông báo khi có booking request mới

```javascript
const { notifyBookingRequest } = require('../utils/notifications');

// Trong createBookingRequest controller
try {
  const studentProfile = await StudentProfile.findOne({ user: studentId });
  const studentName = studentProfile?.fullName || student.email;
  
  await notifyBookingRequest(bookingRequest, tutorId, studentName);
} catch (error) {
  console.error('Failed to create notification:', error);
}
```

#### Ví Dụ 2: Thông báo khi admin approve blog

```javascript
const { notifyBlogApproved } = require('../utils/notifications');

// Trong moderateBlogPost controller
if (action === 'approve') {
  await notifyBlogApproved(blogPost, blogPost.author._id);
}
```

#### Ví Dụ 3: Tạo thông báo custom

```javascript
const { createNotification } = require('../utils/notifications');

await createNotification({
  type: 'system',
  recipientId: userId,
  data: {
    title: 'Thông Báo Hệ Thống',
    message: 'Hệ thống sẽ bảo trì vào 2h sáng ngày mai'
  },
  link: '/maintenance-notice'
});
```

### Thêm Loại Thông Báo Mới

1. **Cập nhật Notification Model:**
```javascript
// backend/src/models/Notification.js
enum: [
  ...,
  'your_new_type'  // Thêm type mới
]
```

2. **Thêm configuration:**
```javascript
// backend/src/utils/notifications.js
const notificationConfig = {
  your_new_type: {
    icon: 'fa-your-icon',
    color: 'blue',
    getTitleAndMessage: (data) => ({
      title: 'Your Title',
      message: 'Your Message'
    })
  }
};
```

3. **Tạo helper function:**
```javascript
// backend/src/utils/notifications.js
async function notifyYourNewEvent(params) {
  return createNotification({
    type: 'your_new_type',
    recipientId: params.recipientId,
    data: {
      // Your data here
    },
    link: '/your-link',
    relatedId: params.relatedId,
    relatedModel: 'YourModel'
  });
}

module.exports = {
  ...,
  notifyYourNewEvent
};
```

4. **Cập nhật frontend styles:**
```javascript
// frontend/assets/js/notifications.js
const notificationStyles = {
  ...,
  your_new_type: { icon: 'fa-your-icon', color: '#yourcolor' }
};
```

### Testing Notifications

#### Test API Endpoints

```bash
# Get notifications
curl -X GET http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"

# Mark as read
curl -X PUT http://localhost:5000/api/notifications/NOTIFICATION_ID/read \
  -H "Authorization: Bearer YOUR_TOKEN"

# Delete notification
curl -X DELETE http://localhost:5000/api/notifications/NOTIFICATION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Test Notification Creation

```javascript
// Create test script: backend/tests/test-notifications.js
const { notifyBookingRequest } = require('../src/utils/notifications');

async function testNotification() {
  const mockBooking = {
    _id: 'test123',
    student: 'studentId',
    subject: { name: 'Toán', level: 'THPT' }
  };
  
  await notifyBookingRequest(
    mockBooking,
    'tutorId',
    'Nguyễn Văn A'
  );
  
  console.log('✅ Notification created successfully!');
}

testNotification();
```

### Debugging

#### Enable Debug Logs

```javascript
// frontend/assets/js/notifications.js
// Uncomment console.log statements

console.log('🔔 Notification loaded:', notifications);
console.log('📊 Unread count:', unreadCount);
```

#### Check Database

```javascript
// MongoDB shell
use tutormis;
db.notifications.find({ recipient: ObjectId("userId") }).pretty();
db.notifications.countDocuments({ recipient: ObjectId("userId"), isRead: false });
```

#### Monitor API Calls

```javascript
// Chrome DevTools > Network tab
// Filter: "notifications"
// Check request/response
```

## FAQ

### Q: Tại sao tôi không nhận được thông báo?

**A:** Kiểm tra:
1. Token có còn hợp lệ không?
2. API endpoint có hoạt động không?
3. Console có báo lỗi không?
4. Database có notification record không?

### Q: Badge không cập nhật real-time?

**A:** Hệ thống cập nhật mỗi 30 giây. Để cập nhật ngay lập tức:
- Refresh trang
- Click vào icon chuông
- Hoặc giảm interval trong `notifications.js`

### Q: Làm sao để xóa tất cả thông báo cũ?

**A:** Hệ thống tự động xóa thông báo đã đọc sau 30 ngày. Hoặc call:
```javascript
await Notification.cleanupOldNotifications();
```

### Q: Có thể tắt thông báo không?

**A:** Hiện tại chưa có tính năng này. Có thể mở rộng bằng cách thêm:
- User preferences table
- Toggle notification settings
- Filter notifications by type

### Q: Performance issue khi có nhiều notifications?

**A:** 
- Sử dụng pagination (đã implement)
- Add database indexes (đã có)
- Consider caching layer
- Cleanup old notifications thường xuyên

## Support

Nếu gặp vấn đề:
1. Check documentation: `NOTIFICATION_SYSTEM_DOCUMENTATION.md`
2. Check console logs
3. Test API endpoints với Postman
4. Contact: dev@tutormis.com
