# Hệ Thống Thống Kê Tài Chính và Logs

## 📋 Tổng Quan

Hệ thống quản lý tài chính và logs hoạt động cho admin TutorMis, bao gồm:
- **Financial Statistics**: Thống kê tài chính chi tiết với biểu đồ và báo cáo
- **Activity Logs**: Theo dõi toàn bộ hoạt động hệ thống real-time

---

## 🎯 Tính Năng

### 💰 Financial Statistics (Thống kê Tài chính)

#### Chức năng chính:
1. **Dashboard Cards**
   - Tổng doanh thu
   - Hoa hồng thu được
   - Doanh thu ròng
   - Số lượng giao dịch
   - Đặt lịch đang chờ

2. **Biểu đồ Revenue**
   - Biểu đồ theo tháng (Line chart)
   - Biểu đồ theo loại giao dịch (Doughnut chart)
   - Tích hợp Chart.js
   - Responsive và interactive

3. **Quản lý Giao dịch**
   - Danh sách giao dịch với pagination
   - Lọc theo: status, type, date range
   - Tìm kiếm giao dịch
   - Xuất dữ liệu ra CSV
   - Chi tiết từng giao dịch

4. **API Endpoints** (`/api/financial`)
   - `GET /statistics` - Thống kê tổng quan
   - `GET /transactions` - Danh sách giao dịch
   - `GET /transactions/:id` - Chi tiết giao dịch
   - `GET /revenue-chart` - Dữ liệu biểu đồ
   - `POST /transactions` - Tạo giao dịch thủ công
   - `PUT /transactions/:id` - Cập nhật giao dịch
   - `POST /transactions/:id/refund` - Hoàn tiền
   - `GET /export` - Xuất CSV

### 📊 Activity Logs (Logs Hoạt động)

#### Chức năng chính:
1. **Statistics Cards**
   - Tổng số hoạt động
   - Số lượng theo severity (info, warning, error)
   - Lỗi chưa giải quyết

2. **Timeline Logs**
   - Hiển thị logs theo timeline
   - Color-coded theo severity
   - Auto-refresh mỗi 30 giây
   - Real-time updates

3. **Filters và Search**
   - Lọc theo: type, severity, status, date range
   - Tìm kiếm full-text trong logs
   - Export logs ra CSV

4. **Log Management**
   - Đánh dấu lỗi đã giải quyết
   - Xem chi tiết log
   - Dọn dẹp logs cũ (> 6 tháng)
   - Track IP, device, browser

5. **API Endpoints** (`/api/logs`)
   - `GET /` - Danh sách logs
   - `GET /statistics` - Thống kê logs
   - `GET /unresolved` - Lỗi chưa giải quyết
   - `GET /:id` - Chi tiết log
   - `GET /user/:userId` - Timeline người dùng
   - `PUT /:id/resolve` - Đánh dấu giải quyết
   - `DELETE /cleanup` - Dọn dẹp logs cũ
   - `GET /export` - Xuất CSV

---

## 🗄️ Database Models

### Transaction Model
```javascript
{
  type: String, // booking, commission, refund, withdrawal, deposit, penalty, bonus
  status: String, // pending, completed, failed, cancelled, refunded
  user: ObjectId,
  booking: ObjectId,
  amount: Number,
  commission: {
    rate: Number,
    amount: Number
  },
  netAmount: Number,
  paymentMethod: String,
  description: String,
  metadata: Mixed,
  timestamps: true
}
```

**Indexes:**
- `user + createdAt`
- `type + status`
- `createdAt (desc)`

**Methods:**
- `getRevenueByPeriod(startDate, endDate)`
- `getRevenueByType(startDate, endDate)`
- `getMonthlyRevenue(year)`
- `getTopUsers(startDate, endDate, limit)`

### ActivityLog Model
```javascript
{
  type: String, // auth, user, booking, transaction, admin, system, error
  action: String,
  user: ObjectId,
  userRole: String,
  resource: String,
  resourceId: ObjectId,
  description: String,
  severity: String, // info, warning, error, critical
  status: String, // success, failed, pending
  beforeData: Mixed,
  afterData: Mixed,
  metadata: Mixed,
  request: {
    ip: String,
    userAgent: String,
    device: String,
    browser: String,
    os: String
  },
  isRead: Boolean,
  isResolved: Boolean,
  timestamps: true
}
```

**Indexes:**
- `createdAt (desc)`
- `user + createdAt`
- `type + createdAt`
- `severity + isRead`

**Methods:**
- `logActivity(data)` - Static method tạo log
- `getRecentActivities(limit, filters)`
- `getActivityStats(startDate, endDate)`
- `getUnresolvedErrors()`
- `searchLogs(searchTerm, filters, limit)`
- `cleanupOldLogs()` - Xóa logs > 6 tháng

---

## 🔧 Middleware

### Logging Middleware (`logging.js`)

Auto-logging tất cả requests quan trọng:

```javascript
// Tự động log:
- Tất cả errors (status >= 400)
- Tất cả non-GET requests
- Tất cả admin requests
- Tất cả auth requests

// Capture:
- IP address
- User agent (device, browser, OS)
- Request duration
- Error stack traces
- Before/after data changes
```

**Helper Functions:**
- `logAuth(action, userId, userRole, status, metadata)`
- `logUserAction(action, userId, userRole, targetUserId, description)`
- `logBookingAction(action, userId, userRole, bookingId, description)`
- `logTransaction(action, userId, userRole, transactionId, amount)`
- `logAdminAction(action, adminId, description, metadata, severity)`
- `logError(error, req, additionalInfo)`
- `logSecurityEvent(event, severity, req, metadata)`

---

## 🎨 Frontend Design

### Financial Statistics Page

**CSS File:** `financial-statistics.css`

**Features:**
- Responsive grid layout cho stat cards
- Gradient backgrounds và hover effects
- Professional table design
- Chart container với fixed height
- Loading states và empty states
- Mobile-first responsive design

**Colors:**
- Primary: #667eea (Purple)
- Success: #48bb78 (Green)
- Warning: #ed8936 (Orange)
- Info: #4299e1 (Blue)
- Danger: #f56565 (Red)

### Logs Page

**CSS File:** `logs.css`

**Features:**
- Timeline vertical design
- Color-coded severity markers
- Card-based log items
- Hover effects với smooth transitions
- Filter bar với multiple options
- Badges và status indicators
- Mobile-friendly timeline

---

## 📝 Sử Dụng

### 1. Backend Setup

```bash
# Đã tích hợp vào server.js
# Routes đã được thêm:
app.use('/api/financial', require('./routes/financial'));
app.use('/api/logs', require('./routes/logs'));

# Middleware logging đã được thêm:
app.use(requestLogger);
```

### 2. Frontend Pages

**Financial Statistics:**
- URL: `/pages/admin/financial_statistics.html`
- Requires: Admin authentication
- Dependencies: Chart.js

**Logs:**
- URL: `/pages/admin/logs.html`
- Requires: Admin authentication
- Auto-refresh: 30 seconds

### 3. Tích hợp Logging vào Controllers

```javascript
const { logAuth, logUserAction, logError } = require('../middleware/logging');

// Example trong authController
await logAuth('login', user._id, user.role, 'success', { ip: req.ip });

// Example trong userController
await logUserAction('update_user', req.user._id, req.user.role, 
                    userId, 'User profile updated', { changes });

// Example error logging
await logError(error, req, { additionalContext });
```

---

## 🔐 Security

### Authentication
- Tất cả API endpoints require JWT token
- Only admin role có thể access
- Token verification qua middleware `protect` và `authorize('admin')`

### Data Protection
- Sensitive data không log trong ActivityLog
- Password và tokens được filter ra
- IP tracking cho security monitoring
- Rate limiting áp dụng cho tất cả endpoints

### Privacy
- User data được populate selective
- Logs cũ tự động cleanup sau 6 tháng (trừ errors)
- Export CSV chỉ admin mới được access

---

## 📊 Performance

### Database Optimization
- Indexes trên các trường thường query
- Aggregate pipelines cho statistics
- Pagination cho large datasets
- Limit results mặc định

### Frontend Optimization
- Debounce cho search inputs
- Lazy loading cho charts
- Pagination cho tables và logs
- CSS animations GPU-accelerated

---

## 🐛 Error Handling

### Backend
- Try-catch cho tất cả async operations
- Consistent error responses
- Error logging tự động
- Stack traces trong development mode

### Frontend
- Loading states
- Empty states
- Error messages user-friendly
- Retry mechanisms

---

## 🚀 Next Steps (Tùy chọn)

### Improvements có thể thêm:
1. **Financial**
   - PDF report generation
   - Email scheduled reports
   - Advanced filtering (multiple users, custom date ranges)
   - Revenue forecasting
   - Budget tracking

2. **Logs**
   - Real-time WebSocket updates
   - Advanced search với regex
   - Log aggregation và analysis
   - Alert system cho critical errors
   - Integration với external monitoring tools

3. **General**
   - Dashboard widgets
   - Custom date range picker
   - Data visualization improvements
   - Export to Excel với formatting
   - API rate limiting per user

---

## 📦 Files Created

### Backend
- `backend/src/models/Transaction.js`
- `backend/src/models/ActivityLog.js`
- `backend/src/controllers/financialController.js`
- `backend/src/controllers/logsController.js`
- `backend/src/routes/financial.js`
- `backend/src/routes/logs.js`
- `backend/src/middleware/logging.js`
- Updated: `backend/src/models/index.js`
- Updated: `backend/src/server.js`

### Frontend
- `frontend/assets/css/financial-statistics.css`
- `frontend/assets/css/logs.css`
- `frontend/assets/js/financial-statistics.js`
- `frontend/assets/js/logs.js`
- Updated: `frontend/pages/admin/financial_statistics.html`
- Updated: `frontend/pages/admin/logs.html`

---

## 📞 Support

Nếu gặp vấn đề:
1. Check console logs (browser và server)
2. Verify authentication token
3. Check API responses
4. Review database indexes
5. Monitor server performance

---

**Developed with ❤️ for TutorMis Admin Dashboard**
