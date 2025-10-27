# TutorMis - Nền Tảng Gia Sư Trực Tuyến

TutorMis là nền tảng kết nối gia sư và học sinh được xây dựng với Node.js, Express.js, MongoDB và frontend HTML/CSS/JavaScript thuần túy.

## Tính Năng Chính

### Học Sinh/Phụ Huynh
- Đăng ký và xác thực email bằng OTP
- Tìm kiếm gia sư theo môn học, địa điểm, giá cả
- Đăng yêu cầu tìm gia sư
- Chat, video call trực tiếp với gia sư
- Quản lý khóa học đã đăng ký
- Gửi yêu cầu hỗ trợ đến Admin
- Sử dụng chatbot AI tư vấn
- Cài đặt tài khoản (đổi mật khẩu, thông báo, bảo mật)

### Gia Sư
- Đăng ký và chờ admin duyệt hồ sơ
- Dashboard thống kê thu nhập, học sinh
- Xem và ứng tuyển yêu cầu từ học sinh
- Quản lý danh sách học sinh và lịch dạy
- Chat, video call trực tiếp với học sinh
- Gửi yêu cầu hỗ trợ với hệ thống modal
- Sử dụng chatbot AI tư vấn
- Theo dõi thu nhập chi tiết với biểu đồ (Line, Doughnut, Bar)
- Cài đặt tài khoản đầy đủ

### Admin
- Dashboard tổng quan hệ thống
- Quản lý người dùng (duyệt gia sư, khóa tài khoản)
- Kiểm duyệt nội dung blog
- Hệ thống hỗ trợ khách hàng với modal
- Thống kê tài chính
- Cài đặt hệ thống và tài khoản

## Tính Năng Dashboard

### 🎓 Dashboard Học Sinh
- **Thống Kê**: Tổng khóa học, hoàn thành, gia sư, yêu cầu chờ
- **Biểu Đồ Tiến Độ Học Tập**: Theo dõi tiến độ theo thời gian
- **Thông Báo Mới Nhất**: Hiển thị thông báo quan trọng
- **Khóa Học Gần Đây**: Danh sách khóa học với trạng thái
- **Tin Nhắn Gần Đây**: Các cuộc trò chuyện gần nhất
- **Menu**: Khóa học, Yêu cầu gia sư, Tìm gia sư, Tin nhắn, Blog, Liên hệ, Trợ lý AI, Hồ sơ, Cài đặt

### 👨‍🏫 Dashboard Gia Sư
- **Thống Kê**: Tổng học sinh, thu nhập tháng, yêu cầu có sẵn, đánh giá TB
- **Biểu Đồ Thu Nhập**: Thực tế + dự kiến (7 ngày/30 ngày/12 tháng)
- **Học Sinh Gần Đây**: Danh sách học sinh đang dạy
- **Yêu Cầu Mới**: Các yêu cầu chưa ứng tuyển
- **Lịch Dạy Sắp Tới**: Các buổi học sắp diễn ra
- **Thông Báo Mới Nhất**: Cập nhật từ hệ thống
- **Menu**: Học sinh, Yêu cầu mới, Lịch dạy, Thu nhập, Tin nhắn, Blog, Liên hệ, Trợ lý AI, Hồ sơ, Cài đặt

### 👨‍💼 Dashboard Admin
- **Thống Kê Tổng Quan**: Tổng user, gia sư, khóa học, doanh thu
- **Biểu Đồ Thống Kê Người Dùng**: Đăng ký theo thời gian
- **Biểu Đồ Phân Bố**: Tỷ lệ student/tutor/admin
- **Gia Sư Chờ Duyệt**: Danh sách gia sư cần phê duyệt
- **Người Dùng Mới**: 10 user đăng ký gần nhất
- **Bài Viết Chờ Duyệt**: Blog posts cần kiểm duyệt
- **Hoạt Động Hệ Thống**: Nhật ký hoạt động gần đây
- **Menu**: Người dùng, Duyệt gia sư, Khóa học, Quản lý Blog, Báo cáo, Thống Kê Tài chính, Thông tin, Cài đặt, Logs

## Công Nghệ Sử Dụng

### Backend
- Node.js - JavaScript runtime
- Express.js - Web framework
- MongoDB - NoSQL database
- JWT - Authentication
- Socket.IO - Real-time messaging
- Chart.js - Biểu đồ thống kê

### Frontend
- HTML5 - Markup
- CSS3 - Styling
- JavaScript 

### Bảo Mật
- JWT authentication
- Role-based authorization
- Email verification với OTP
- Rate limiting
- Input sanitization

## Cài Đặt

### Yêu Cầu Hệ Thống
- Node.js v14+
- MongoDB v4+
- npm hoặc yarn

### 1. Clone Repository
```bash
git clone <repository-url>
cd tutormis
```

### 2. Cài Đặt Dependencies
```bash
cd backend
npm install
```

### 3. Cấu Hình Environment
Tạo file `.env` trong thư mục `backend`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/tutormis
JWT_SECRET=your_jwt_secret_key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=http://localhost:8000
```

### 4. Khởi Động MongoDB
```bash
mongod
```

## Chạy Ứng Dụng

### Backend
```bash
cd backend
npm run dev
```
Server chạy tại: `http://localhost:5000`

### Frontend
```bash
cd frontend
npx http-server . -p 8000
```
Frontend chạy tại: `http://localhost:8000`

## API Documentation

Base URL: `http://localhost:5000/api`

### Authentication
- `POST /auth/register` - Đăng ký
- `POST /auth/verify-otp` - Xác thực OTP
- `POST /auth/login` - Đăng nhập
- `POST /auth/logout` - Đăng xuất
- `GET /auth/me` - Thông tin user hiện tại

### Student
- `GET /student/dashboard` - Dashboard học sinh
- `GET /student/courses` - Danh sách khóa học

### Tutor
- `GET /tutor/dashboard` - Dashboard gia sư
- `GET /tutor/requests` - Danh sách yêu cầu
- `GET /tutor/income` - Thống kê thu nhập

### Admin
- `GET /admin/dashboard` - Dashboard admin
- `GET /admin/users` - Quản lý người dùng
- `GET /admin/finance` - Thống kê tài chính

## Phân Quyền

- **student**: Học sinh/Phụ huynh
- **tutor**: Gia sư (cần admin duyệt)
- **admin**: Quản trị viên

## Database Schema

### User
```javascript
{
  email: String,
  password: String,
  role: ['student', 'tutor', 'admin'],
  isEmailVerified: Boolean,
  approvalStatus: ['pending', 'approved', 'rejected']
}
```

## Cấu Trúc Thư Mục

```
tutornis/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Logic xử lý
│   │   ├── models/         # Database schemas
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth, validation
│   │   └── server.js       # Entry point
│   └── package.json
├── frontend/
│   ├── assets/
│   │   ├── css/            # Stylesheets
│   │   └── js/             # JavaScript files
│   ├── pages/              # HTML pages
│   └── index.html          # Landing page
└── README.md
```

## Hỗ Trợ

- Email: support@tutormis.com
- GitHub Issues

---

## Tác Giả

**TutorMis** được phát triển bởi **HoangDev21** (NNH21) với ❤️

- Email: hoangdev21@gmail.com
- GitHub: [NNH21](https://github.com/NNH21)
- LinkedIn: [hoangmis21](https://www.linkedin.com/in/hoangmis21/)

---

**TutorMis** - Kết nối tri thức, xây dựng tương lai 🎓