# Hệ Thống Thông Báo (Notification System)

## Tổng Quan

Hệ thống thông báo được thiết kế để cung cấp trải nghiệm real-time cho người dùng TutorMis, bao gồm học sinh, gia sư và admin. Người dùng sẽ nhận được thông báo về các sự kiện quan trọng như yêu cầu đặt lịch, phê duyệt bài viết, tin nhắn mới, v.v.

## Tính Năng Chính

### 1. **Các Loại Thông Báo**

Hệ thống hỗ trợ 11 loại thông báo khác nhau:

| Loại | Mô Tả | Người Nhận | Màu Sắc | Icon |
|------|-------|-----------|---------|------|
| `booking_request` | Yêu cầu đặt lịch mới | Gia sư | Blue | fa-calendar-plus |
| `booking_accepted` | Yêu cầu được chấp nhận | Học sinh | Green | fa-check-circle |
| `booking_rejected` | Yêu cầu bị từ chối | Học sinh | Red | fa-times-circle |
| `booking_completed` | Khóa học hoàn thành | Cả hai | Green | fa-graduation-cap |
| `booking_cancelled` | Lịch học bị hủy | Cả hai | Red | fa-ban |
| `blog_approved` | Bài viết được duyệt | Gia sư | Green | fa-check-circle |
| `blog_rejected` | Bài viết bị từ chối | Gia sư | Red | fa-times-circle |
| `blog_comment` | Bình luận mới | Tác giả | Blue | fa-comment |
| `message_received` | Tin nhắn mới | Người nhận | Blue | fa-envelope |
| `profile_approved` | Hồ sơ được duyệt | Gia sư | Green | fa-user-check |
| `profile_rejected` | Hồ sơ bị từ chối | Gia sư | Red | fa-user-times |

### 2. **Giao Diện Người Dùng**

#### **Notification Badge**
- Hiển thị số lượng thông báo chưa đọc
- Có animation pulse khi có thông báo mới
- Tự động cập nhật mỗi 30 giây

#### **Notification Panel**
- Dropdown panel xuất hiện khi click vào icon chuông
- Hiển thị 10 thông báo gần nhất
- Có nút "Đánh dấu tất cả đã đọc"
- Mỗi thông báo hiển thị:
  - Icon và màu sắc theo loại
  - Tiêu đề và nội dung
  - Thời gian (tương đối: "5 phút trước")
  - Dot màu xanh cho thông báo chưa đọc
  - Nút xóa thông báo

### 3. **API Endpoints**

#### **GET /api/notifications**
Lấy danh sách thông báo của người dùng

**Query Parameters:**
- `page` (number, optional): Trang hiện tại (default: 1)
- `limit` (number, optional): Số lượng thông báo mỗi trang (default: 20)
- `unreadOnly` (boolean, optional): Chỉ lấy thông báo chưa đọc

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "total": 50,
    "unreadCount": 5,
    "page": 1,
    "pages": 3
  }
}
```

#### **GET /api/notifications/unread-count**
Lấy số lượng thông báo chưa đọc

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

#### **PUT /api/notifications/:id/read**
Đánh dấu một thông báo là đã đọc

**Response:**
```json
{
  "success": true,
  "message": "Đã đánh dấu đã đọc",
  "data": {
    "notification": {...},
    "unreadCount": 4
  }
}
```

#### **PUT /api/notifications/read-all**
Đánh dấu tất cả thông báo là đã đọc

**Response:**
```json
{
  "success": true,
  "message": "Đã đánh dấu tất cả đã đọc",
  "data": {
    "unreadCount": 0
  }
}
```

#### **DELETE /api/notifications/:id**
Xóa một thông báo

**Response:**
```json
{
  "success": true,
  "message": "Đã xóa thông báo",
  "data": {
    "unreadCount": 3
  }
}
```

#### **DELETE /api/notifications/read/all**
Xóa tất cả thông báo đã đọc

**Response:**
```json
{
  "success": true,
  "message": "Đã xóa tất cả thông báo đã đọc"
}
```

## Cấu Trúc Backend

### 1. **Models**

#### **Notification Schema** (`backend/src/models/Notification.js`)

```javascript
{
  type: String,              // Loại thông báo
  recipient: ObjectId,       // Người nhận
  sender: ObjectId,          // Người gửi (optional)
  title: String,             // Tiêu đề
  message: String,           // Nội dung
  link: String,              // Liên kết (optional)
  relatedId: ObjectId,       // ID của entity liên quan (optional)
  relatedModel: String,      // Model của entity liên quan (optional)
  icon: String,              // Icon Font Awesome
  color: String,             // Màu sắc
  isRead: Boolean,           // Đã đọc chưa
  readAt: Date,              // Thời điểm đọc
  createdAt: Date            // Thời điểm tạo
}
```

#### **Static Methods:**
- `createNotification(data)`: Tạo thông báo mới
- `getUnreadCount(userId)`: Đếm số thông báo chưa đọc
- `markAllAsRead(userId)`: Đánh dấu tất cả đã đọc
- `cleanupOldNotifications()`: Xóa thông báo cũ (>30 ngày)

### 2. **Controllers**

#### **notificationController.js** (`backend/src/controllers/notificationController.js`)

**Functions:**
- `getNotifications`: Lấy danh sách thông báo (có phân trang)
- `getUnreadCount`: Lấy số lượng thông báo chưa đọc
- `markAsRead`: Đánh dấu một thông báo đã đọc
- `markAllAsRead`: Đánh dấu tất cả đã đọc
- `deleteNotification`: Xóa một thông báo
- `deleteAllRead`: Xóa tất cả thông báo đã đọc

### 3. **Utilities**

#### **notifications.js** (`backend/src/utils/notifications.js`)

**Helper Functions:**
- `createNotification(params)`: Tạo thông báo generic
- `notifyBookingRequest(booking, tutorId, studentName)`: Thông báo yêu cầu đặt lịch
- `notifyBookingAccepted(booking, studentId, tutorName)`: Thông báo chấp nhận yêu cầu
- `notifyBookingRejected(booking, studentId, tutorName)`: Thông báo từ chối yêu cầu
- `notifyBookingCompleted(booking, recipientId, subjectName)`: Thông báo hoàn thành
- `notifyBlogApproved(blog, authorId)`: Thông báo bài viết được duyệt
- `notifyBlogRejected(blog, authorId, reason)`: Thông báo bài viết bị từ chối
- `notifyNewMessage(message, recipientId, senderName)`: Thông báo tin nhắn mới
- `notifyProfileApproved(tutorId)`: Thông báo hồ sơ được duyệt
- `notifyProfileRejected(tutorId, reason)`: Thông báo hồ sơ bị từ chối

### 4. **Tích Hợp Vào Controllers Hiện Có**

#### **bookingController.js**
- `createBookingRequest`: Tạo thông báo cho gia sư khi có yêu cầu mới
- `acceptBooking`: Tạo thông báo cho học sinh khi yêu cầu được chấp nhận
- `rejectBooking`: Tạo thông báo cho học sinh khi yêu cầu bị từ chối

#### **adminController.js**
- `approveTutor`: Tạo thông báo khi phê duyệt/từ chối hồ sơ gia sư
- `moderateBlogPost`: Tạo thông báo khi phê duyệt/từ chối bài viết blog

## Cấu Trúc Frontend

### 1. **JavaScript**

#### **notifications.js** (`frontend/assets/js/notifications.js`)

**Main Functions:**
- `initNotifications()`: Khởi tạo hệ thống thông báo
- `loadNotifications()`: Tải danh sách thông báo từ API
- `updateNotificationBadge(count)`: Cập nhật badge số lượng
- `toggleNotificationPanel()`: Bật/tắt notification panel
- `createNotificationPanel()`: Tạo HTML cho notification panel
- `renderNotifications(notifications)`: Render danh sách thông báo
- `handleNotificationClick(id, link)`: Xử lý khi click vào thông báo
- `markNotificationAsRead(id)`: Đánh dấu một thông báo đã đọc
- `markAllAsRead()`: Đánh dấu tất cả đã đọc
- `deleteNotification(event, id)`: Xóa một thông báo
- `formatTimeAgo(dateString)`: Format thời gian tương đối

**Features:**
- Auto-refresh badge mỗi 30 giây
- Click outside để đóng panel
- Animation smooth khi mở/đóng panel

### 2. **CSS**

#### **notifications.css** (`frontend/assets/css/notifications.css`)

**Components:**
- `.notification-badge`: Badge hiển thị số lượng
- `.notification-panel`: Container của dropdown panel
- `.notification-panel-header`: Header với tiêu đề và nút actions
- `.notification-panel-body`: Body chứa danh sách thông báo
- `.notification-item`: Mỗi item thông báo
- `.notification-icon`: Icon của thông báo
- `.notification-content`: Nội dung thông báo
- `.notification-unread-dot`: Dot cho thông báo chưa đọc
- `.notification-delete`: Nút xóa thông báo
- `.notification-empty`: Empty state
- `.notification-loading`: Loading state

**Animations:**
- `notificationPulse`: Pulse animation cho badge
- `slideDown`: Slide down animation cho panel
- `notificationDotPulse`: Pulse animation cho unread dot
- `spin`: Spin animation cho loading spinner

### 3. **HTML Integration**

Các file HTML đã được cập nhật để include notification system:

**Tutor Pages:**
- `frontend/pages/tutor/dashboard.html` ✅
- (Các trang tutor khác cần được cập nhật tương tự)

**Student Pages:**
- `frontend/pages/student/dashboard.html` ✅
- (Các trang student khác cần được cập nhật tương tự)

**Admin Pages:**
- `frontend/pages/admin/dashboard.html` ✅

**Integration Steps:**
1. Thêm CSS link trong `<head>`:
```html
<link rel="stylesheet" href="../../assets/css/notifications.css">
```

2. Thêm JS script trước các dashboard scripts:
```html
<script src="../../assets/js/notifications.js"></script>
```

3. HTML button notification đã có sẵn:
```html
<button class="notification-btn">
  <i class="fas fa-bell"></i>
  <span class="notification-badge" id="notificationBadge">0</span>
</button>
```

## Luồng Hoạt Động

### 1. **Tạo Thông Báo**

```
Event xảy ra (Booking created, Blog approved, etc.)
    ↓
Controller gọi utility function (notifyBookingRequest, etc.)
    ↓
Utility function tạo notification với config phù hợp
    ↓
Notification được lưu vào database
    ↓
Người dùng nhận được thông báo
```

### 2. **Hiển Thị Thông Báo**

```
User load trang
    ↓
notifications.js khởi tạo
    ↓
Fetch unread count từ API
    ↓
Update badge number
    ↓
User click vào notification button
    ↓
Fetch 10 thông báo gần nhất
    ↓
Render notification panel
```

### 3. **Đọc Thông Báo**

```
User click vào notification item
    ↓
Call API mark as read
    ↓
Update isRead = true, readAt = now
    ↓
Update unread count
    ↓
Navigate to link (if provided)
    ↓
Panel tự động cập nhật
```

## Best Practices

### 1. **Backend**

- ✅ Luôn kiểm tra quyền truy cập trước khi tạo thông báo
- ✅ Sử dụng utility functions thay vì tạo thông báo trực tiếp
- ✅ Đảm bảo các event tạo thông báo không làm crash main flow
- ✅ Log lỗi khi tạo thông báo thất bại nhưng không throw error
- ✅ Populate sender/recipient info khi cần thiết

### 2. **Frontend**

- ✅ Kiểm tra token trước khi fetch notifications
- ✅ Handle error gracefully (show empty state)
- ✅ Debounce API calls để tránh spam
- ✅ Close panel khi click outside
- ✅ Format thời gian theo múi giờ địa phương

### 3. **Performance**

- ✅ Index các field thường query (recipient, isRead, createdAt)
- ✅ Limit số lượng notifications mỗi lần fetch
- ✅ Auto-cleanup old read notifications (>30 days)
- ✅ Use pagination cho notification list
- ✅ Cache unread count trong một khoảng thời gian

## Mở Rộng Trong Tương Lai

### 1. **Real-time Notifications với WebSocket**
```javascript
// Socket.io integration
io.on('connection', (socket) => {
  socket.on('subscribe-notifications', (userId) => {
    socket.join(`notifications-${userId}`);
  });
});

// Emit notification when created
io.to(`notifications-${recipientId}`).emit('new-notification', notification);
```

### 2. **Push Notifications**
- Service Worker registration
- Firebase Cloud Messaging integration
- Browser notification API

### 3. **Email Notifications**
- Daily digest email cho thông báo chưa đọc
- Configurable notification preferences

### 4. **Advanced Features**
- Group notifications by type
- Notification categories/filters
- Snooze notifications
- Notification templates customization
- Multi-language support

## Testing

### 1. **Manual Testing**

**Booking Notifications:**
```
1. Student tạo booking request → Tutor nhận thông báo
2. Tutor accept booking → Student nhận thông báo
3. Tutor reject booking → Student nhận thông báo
```

**Blog Notifications:**
```
1. Tutor tạo blog post
2. Admin approve/reject → Tutor nhận thông báo
```

**Profile Notifications:**
```
1. Tutor đăng ký tài khoản
2. Admin approve/reject → Tutor nhận thông báo
```

### 2. **API Testing**

```bash
# Get notifications
GET http://localhost:5000/api/notifications
Authorization: Bearer <token>

# Get unread count
GET http://localhost:5000/api/notifications/unread-count
Authorization: Bearer <token>

# Mark as read
PUT http://localhost:5000/api/notifications/:id/read
Authorization: Bearer <token>

# Mark all as read
PUT http://localhost:5000/api/notifications/read-all
Authorization: Bearer <token>

# Delete notification
DELETE http://localhost:5000/api/notifications/:id
Authorization: Bearer <token>
```

## Troubleshooting

### Common Issues:

**1. Badge không cập nhật:**
- Kiểm tra token có hợp lệ không
- Kiểm tra API endpoint có hoạt động không
- Check console log for errors

**2. Panel không hiển thị:**
- Kiểm tra CSS đã được load chưa
- Kiểm tra JS đã được load chưa
- Kiểm tra element IDs có đúng không

**3. Thông báo không được tạo:**
- Check server logs
- Verify notification utility được gọi đúng
- Kiểm tra recipientId có tồn tại không

**4. Performance issues:**
- Check database indexes
- Monitor API response time
- Consider adding caching layer

## Kết Luận

Hệ thống thông báo đã được triển khai đầy đủ với:
- ✅ Backend API hoàn chỉnh
- ✅ Frontend UI đẹp mắt và responsive
- ✅ Tích hợp vào các controllers hiện có
- ✅ Support đa loại thông báo
- ✅ Real-time badge updates
- ✅ Smooth animations và UX tốt

Hệ thống sẵn sàng để sử dụng và có thể mở rộng dễ dàng trong tương lai!
