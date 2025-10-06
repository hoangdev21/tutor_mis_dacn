# 🎓 TutorMis - Nền Tảng Gia Sư Trực Tuyến

TutorMis là một nền tảng kết nối gia sư và học sinh được xây dựng với Node.js, Express.js, MongoDB và frontend HTML/CSS/JavaScript thuần túy.

## 📋 Mục Lục

- [Tính Năng Chính](#-tính-năng-chính)
- [Công Nghệ Sử Dụng](#-công-nghệ-sử-dụng)
- [Cài Đặt](#-cài-đặt)
- [Cấu Hình](#-cấu-hình)
- [Chạy Ứng Dụng](#-chạy-ứng-dụng)
- [API Documentation](#-api-documentation)
- [Phân Quyền](#-phân-quyền)
- [Database Schema](#-database-schema)

## 🚀 Tính Năng Chính

### 👨‍🎓 Học Sinh/Phụ Huynh
- ✅ Đăng ký và xác thực email
- 🔍 Tìm kiếm gia sư theo môn học, địa điểm, giá cả
- 📝 Đăng yêu cầu tìm gia sư
- 💬 Chat, video call trực tiếp với gia sư, học sinh/phụ huynh
- 📚 Quản lý khóa học đã đăng ký
- 🛡️ Trang báo cáo, gửi yêu cầu hỗ trợ đến Admin.
- 💬 Chatbot AI tư vấn, hỗ trợ
- ⚙️ **Settings Page - Cài đặt đầy đủ**
  - 🔐 Đổi mật khẩu, xác thực 2FA
  - 🔔 Quản lý thông báo (Email, Push)
  - 🛡️ Quyền riêng tư và bảo mật
  - 👤 Cài đặt tài khoản
- ⭐ Đánh giá gia sư sau khóa học
- 📖 Đọc và viết blog

### 👨‍🏫 Gia Sư
- ✅ Đăng ký và chờ admin duyệt hồ sơ
- 📊 Dashboard thống kê thu nhập, học sinh
- 📋 Xem và ứng tuyển yêu cầu từ học sinh
- 👥 Quản lý danh sách học sinh
- 📅 Quản lý lịch dạy
- 💬 Chat, video call trực tiếp với gia sư, học sinh/phụ huynh
- 🛡️ **Hệ thống hỗ trợ với Custom Modals**
  - 🎫 Gửi yêu cầu hỗ trợ 
  - 🔔 Nhận phản hồi từ Admin
- 💬 Chatbot AI tư vấn, hỗ trợ
- 💰 **Theo dõi thu nhập chi tiết với biểu đồ**
  - 📈 Thống kê tổng thu nhập, thu nhập đang chờ, thu nhập tháng
  - 📊 Biểu đồ Line Chart: Thu nhập theo tháng + Giờ dạy
  - 🍩 Biểu đồ Doughnut: Thu nhập theo môn học
  - 📊 Biểu đồ Bar: Thu nhập theo cấp độ
  - 📋 Bảng chi tiết các khóa học đã hoàn thành
  - 🔍 Filter theo thời gian (1/3/6/12 tháng)
- ⚙️ **Settings Page - Cài đặt đầy đủ**
  - 🔐 Đổi mật khẩu, xác thực 2FA
  - 🔔 Quản lý thông báo (Email, Push, SMS)
  - 🛡️ Quyền riêng tư và bảo mật
  - 👤 Cài đặt tài khoản
- 📖 Viết blog chia sẻ kiến thức

### 👨‍💼 Admin
- 📊 Dashboard tổng quan hệ thống
- 👥 Quản lý người dùng (duyệt gia sư, khóa tài khoản)
- 📝 Kiểm duyệt nội dung blog
- 🎫 **Hệ thống hỗ trợ khách hàng chuyên nghiệp**
  - 📋 Xem tất cả tickets với filter theo trạng thái
  - 👁️ Xem chi tiết ticket với popup modal
  - ✍️ Phản hồi ticket với popup xác nhận custom
  - 🔔 Cập nhật trạng thái ticket (pending, in-progress, resolved, closed)
  - 📊 Thống kê ticket theo priority và category
- 💰 Thống kê tài chính
- ⚙️ **Settings Page - Cài đặt hệ thống & tài khoản**
  - 🔐 Bảo mật và đổi mật khẩu
  - 🔔 Quản lý thông báo
  - 🛡️ Quyền riêng tư
  - 👤 Quản lý tài khoản admin
  - 📊 Quản lý phiên đăng nhập

## 🛠 Công Nghệ Sử Dụng

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Nodemailer** - Email service
- **Express Validator** - Input validation
- **Helmet** - Security middleware
- **Rate Limiting** - API protection

### Frontend
- **HTML5** - Markup
- **CSS3** - Styling (Flexbox, Grid, Animations)
- **Vanilla JavaScript** - Client-side logic
- **Font Awesome** - Icons
- **Google Fonts** - Typography

### Security Features
- 🔐 JWT-based authentication
- 🛡️ Role-based authorization (RBAC)
- 📧 Email verification
- 🔒 Password strength validation
- 🚫 Rate limiting
- 🧹 Input sanitization
- 🔒 CORS protection
- 🛡️ Security headers (Helmet)

## 📦 Cài Đặt

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

#### Backend
```bash
cd backend
npm install
```

#### Frontend (nếu cần)
```bash
cd frontend
# Không cần cài đặt gì thêm vì sử dụng vanilla JavaScript
```

### 3. Cài Đặt MongoDB
- Tải và cài đặt MongoDB Community Server, MongoDB Compass
- Hoặc sử dụng MongoDB Atlas (cloud)

## ⚙️ Cấu Hình

### 1. Environment Variables
Tạo file `.env` trong thư mục `backend`:

```bash
cd backend
cp .env.example .env
```

Cập nhật các giá trị trong `.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/tutormis

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars
JWT_REFRESH_SECRET=your_refresh_token_secret_here_min_32_chars
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Email Configuration (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@tutormis.com

# Frontend URL
FRONTEND_URL=http://localhost:8000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads/
```

### 2. Cấu Hình Email (Gmail)
1. Bật 2-factor authentication cho Gmail
2. Tạo App Password: Google Account > Security > App passwords
3. Sử dụng App Password làm `EMAIL_PASS`

## 🚀 Chạy Ứng Dụng

### 1. Khởi Động MongoDB
```bash
# Local MongoDB
mongod

# Hoặc sử dụng MongoDB Compass GUI
```

### 2. Khởi Động Backend
```bash
cd backend

# Development mode (với nodemon)
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại: `http://localhost:5000`

### 3. Khởi Động Frontend
```bash
# Sử dụng Live Server (VS Code extension)
# Hoặc http-server
npx http-server frontend -p 8000

# Hoặc Python
cd frontend
python -m http.server 5000
```

Frontend sẽ chạy tại: `http://localhost:8000`

### 4. Kiểm Tra Health
- Backend: `http://localhost:5000/health`
- Frontend: `http://localhost:8000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints
```bash
POST   /auth/register          # Đăng ký
POST   /auth/login             # Đăng nhập  
POST   /auth/logout            # Đăng xuất
GET    /auth/verify-email/:token # Xác thực email
POST   /auth/refresh           # Làm mới token
POST   /auth/forgot-password   # Quên mật khẩu
POST   /auth/reset-password/:token # Đặt lại mật khẩu
GET    /auth/me                # Thông tin user hiện tại
```

### Student Endpoints
```bash
GET    /student/dashboard      # Dashboard học sinh
GET    /student/profile        # Thông tin profile
PUT    /student/profile        # Cập nhật profile
GET    /student/courses        # Danh sách khóa học
GET    /student/courses/:id    # Chi tiết khóa học
POST   /student/courses/:id/rate # Đánh giá khóa học
```

### Tutor Endpoints
```bash
GET    /tutor/dashboard        # Dashboard gia sư
GET    /tutor/profile          # Thông tin profile
PUT    /tutor/profile          # Cập nhật profile
GET    /tutor/requests         # Danh sách yêu cầu
POST   /tutor/requests/:id/apply # Ứng tuyển yêu cầu
GET    /tutor/students         # Danh sách học sinh
GET    /tutor/income?period=year # Thống kê thu nhập chi tiết
                                # period: month|3months|6months|year
```


### Admin Endpoints
```bash
GET    /admin/dashboard        # Dashboard admin
GET    /admin/users            # Quản lý người dùng
PUT    /admin/users/:id/approve # Duyệt gia sư
PUT    /admin/users/:id/toggle-status # Khóa/mở khóa user
GET    /admin/content/blogs    # Quản lý blog
PUT    /admin/content/blogs/:id/moderate # Duyệt blog
GET    /admin/finance          # Thống kê tài chính
```

## 🔐 Phân Quyền

### Roles
- **student** - Học sinh/Phụ huynh
- **tutor** - Gia sư  
- **admin** - Quản trị viên

### Authorization Flow
1. User đăng ký với role
2. Email verification required
3. Tutor cần admin approval
4. JWT token chứa role information
5. Middleware kiểm tra permissions

### Permission Matrix

| Resource | Student | Tutor | Admin |
|----------|---------|--------|-------|
| Profile Management | ✅ Own | ✅ Own | ✅ All |
| Course Access | ✅ Enrolled | ✅ Teaching | ✅ All |
| Messages | ✅ Own | ✅ Own | ✅ All |
| Blog Posts | ✅ Read/Write | ✅ Read/Write | ✅ All + Moderate |
| User Management | ❌ | ❌ | ✅ |
| Finance Stats | ❌ | ✅ Own | ✅ All |

## 🗄️ Database Schema

### Collections

#### Users
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  role: Enum['student', 'tutor', 'admin'],
  isEmailVerified: Boolean,
  isActive: Boolean,
  approvalStatus: Enum['pending', 'approved', 'rejected'],
  loginAttempts: Number,
  lockUntil: Date,
  timestamps: true
}
```

#### StudentProfile
```javascript
{
  userId: ObjectId (ref: User),
  fullName: String,
  phone: String,
  dateOfBirth: Date,
  currentEducationLevel: String,
  subjects: [String],
  tutorPreferences: Object,
  timestamps: true
}
```

#### TutorProfile
```javascript
{
  userId: ObjectId (ref: User),
  fullName: String,
  phone: String,
  education: [Object],
  subjects: [Object],
  teachingExperience: Object,
  stats: Object,
  verificationDocuments: Object,
  timestamps: true
}
```

#### Course
```javascript
{
  tutorId: ObjectId (ref: User),
  studentId: ObjectId (ref: User),
  subject: String,
  level: String,
  hourlyRate: Number,
  status: Enum['pending', 'active', 'completed', 'cancelled'],
  payment: Object,
  rating: Object,
  timestamps: true
}
```

## 🧪 Testing

### Automated Testing (Blog Features)

TutorMis bao gồm test suite tự động để kiểm tra các chức năng blog.

#### 1. Chạy Automated Test
```bash
cd backend

# Test với một user
node test-blog-automated.js

# Test nhanh với nhiều users
node test-blog-quick.js
```

**Các test cases:**
- ✅ Authentication & JWT Token
- ✅ User Profile & Avatar (Cloudinary)
- ✅ Create Blog Post (with/without images)
- ✅ Get Posts (all, filtered by category)
- ✅ Like/Unlike Post
- ✅ Add Comment
- ✅ Share Post
- ✅ Get My Posts (all, filtered by status)

**Xem thêm**: [AUTOMATED_TEST_GUIDE.md](./AUTOMATED_TEST_GUIDE.md)

#### 2. Manual HTML Testing
Mở file `frontend/test-blog-features.html` trong browser để test thủ công với UI.

**Xem thêm**: [TEST_BLOG_GUIDE.md](./TEST_BLOG_GUIDE.md)

### API Testing

#### 1. User Registration Flow
```bash
# Student Registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "Test123!",
    "role": "student",
    "fullName": "Test Student"
  }'

# Tutor Registration  
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tutor@test.com", 
    "password": "Test123!",
    "role": "tutor",
    "fullName": "Test Tutor"
  }'
```

#### 2. Login Test
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "Test123!"
  }'
```

### Test Accounts

#### Default Admin
- Email: `admin@tutormis.com`
- Password: `Admin123!`
- Tạo thủ công trong MongoDB hoặc qua script

```javascript
// Script tạo admin account
const bcrypt = require('bcryptjs');
const { User, AdminProfile } = require('./src/models');

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('Admin123!', 12);
  
  const admin = await User.create({
    email: 'admin@tutormis.com',
    password: hashedPassword,
    role: 'admin',
    isEmailVerified: true,
    approvalStatus: 'approved'
  });
  
  await AdminProfile.create({
    userId: admin._id,
    fullName: 'System Administrator',
    phone: '0900000000',
    department: 'technical',
    position: 'Super Admin',
    level: 'super_admin'
  });
  
  console.log('Admin created successfully');
}
```

## � Income Dashboard Features

### Tutor Income Page
Trang thu nhập cung cấp **thống kê chi tiết và chuyên nghiệp** về thu nhập của gia sư:

#### 🎨 Giao Diện
- **4 Stat Cards** với gradient màu đẹp mắt:
  - 💰 Tổng Thu Nhập (Purple gradient)
  - ⏱️ Thu Nhập Đang Chờ (Green gradient)
  - 📅 Thu Nhập Tháng Này (Orange gradient)
  - 🎓 Tổng Giờ Dạy (Blue gradient)

#### 📈 Biểu Đồ
1. **Line Chart** - Thu nhập theo tháng
   - Dual Y-axis: Thu nhập (VND) + Giờ dạy
   - Hiển thị 12 tháng gần nhất
   - Smooth curves với gradient fill

2. **Doughnut Chart** - Thu nhập theo môn học
   - Top 10 môn có thu nhập cao nhất
   - Màu sắc phân biệt rõ ràng
   - Tooltip hiển thị số tiền chi tiết

3. **Bar Chart** - Thu nhập theo cấp độ
   - Tiểu học, THCS, THPT, Đại học
   - Rounded corners, gradient colors

#### 📋 Bảng Chi Tiết
- **Khóa Học Gần Đây** với thông tin:
  - Avatar học sinh
  - Môn học & cấp độ (badges)
  - Giờ dạy & học phí/giờ
  - Tổng thu nhập (highlighted)
  - Ngày hoàn thành & rating sao ⭐

#### 🔍 Filter & Responsive
- Filter theo thời gian: 1/3/6/12 tháng
- Responsive design (Desktop/Tablet/Mobile)
- Loading states & Empty states chuyên nghiệp

#### 🛠️ Công Nghệ
- **Chart.js** - Thư viện biểu đồ
- **CSS Grid & Flexbox** - Layout responsive
- **Gradient Colors** - Thiết kế hiện đại
- **Animations** - Smooth transitions

## �🚀 Deployment

### Production Checklist
- [ ] Cập nhật NODE_ENV=production
- [ ] Sử dụng MongoDB Atlas hoặc dedicated server
- [ ] Cấu hình HTTPS
- [ ] Cập nhật FRONTEND_URL và CORS settings
- [ ] Cấu hình reverse proxy (Nginx)
- [ ] Setup monitoring và logging
- [ ] Backup strategy cho database
- [ ] Optimize Chart.js bundle size
- [ ] Enable CDN cho static assets

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tutormis
FRONTEND_URL=https://yourdomain.com
# ... other configs
```

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Support

- Email: support@tutormis.com hoặc hoangdev21@gmail.com
- GitHub Issues: [Create Issue](https://github.com/NNH21/)
- Documentation: [Linkedin](https://www.linkedin.com/in/hoangmis21/)

## � Project Structure

```
tutornis/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, Cloudinary, Swagger configs
│   │   ├── controllers/     # Business logic
│   │   │   ├── tutorController.js    # ✨ Income API included
│   │   │   ├── studentController.js
│   │   │   ├── adminController.js
│   │   │   └── ...
│   │   ├── middleware/      # Auth, validation, security
│   │   ├── models/          # MongoDB schemas
│   │   │   ├── BookingRequest.js    # 💰 Income data source
│   │   │   ├── User.js
│   │   │   └── ...
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # AI Chatbot, Email services
│   │   ├── socket/          # Socket.IO real-time messaging
│   │   ├── utils/           # Helpers, JWT, validation
│   │   └── server.js        # Express app entry point
│   ├── .env                 # Environment variables
│   └── package.json
│
├── frontend/
│   ├── assets/
│   │   ├── css/
│   │   │   ├── main.css
│   │   │   ├── dashboard.css
│   │   │   ├── tutor-income.css     # 📊 Income page styles
│   │   │   └── ...
│   │   ├── js/
│   │   │   ├── main.js
│   │   │   ├── dashboard-common.js
│   │   │   ├── tutor-income.js      # 📈 Income charts & logic
│   │   │   └── ...
│   │   ├── images/
│   │   └── audio/           # WebRTC call ringtones
│   ├── pages/
│   │   ├── student/         # Student dashboard pages
│   │   ├── tutor/           # Tutor dashboard pages
│   │   │   ├── dashboard.html
│   │   │   ├── income.html         # 💰 Income dashboard
│   │   │   └── ...
│   │   └── admin/           # Admin dashboard pages
│   ├── docs/                # Frontend documentation
│   └── index.html           # Landing page
│
└── README.md                # 📖 This file
```

## 🎯 Key Features Implemented

### ✅ Completed Features
- [x] JWT Authentication & Authorization
- [x] Email Verification with OTP
- [x] Student/Tutor/Admin Dashboards
- [x] Tutor Profile Approval System
- [x] Booking Request System
- [x] Real-time Messaging (Socket.IO)
- [x] WebRTC Video/Audio Calls
- [x] Blog System with Comments & Likes
- [x] AI Chatbot (Gemini API)
- [x] **Income Dashboard with Charts** 📊
  - Line Chart (Monthly income + Hours)
  - Doughnut Chart (Income by subject)
  - Bar Chart (Income by level)
  - Recent bookings table
  - Period filter (1/3/6/12 months)
- [x] Cloudinary Image Upload
- [x] **Support Ticket System với Custom Modals** 🎨 NEW
  - Success Modal cho thông báo thành công
  - Ticket Detail Modal cho xem chi tiết ticket
  - Confirm Modal cho xác nhận phản hồi admin
  - Professional UI/UX với animations
  - Responsive design cho mobile
- [x] **Settings Pages cho 3 roles** ⚙️ NEW
  - Account Settings (Email, Display Name, Language)
  - Security Settings (Password Change, 2FA, Sessions)
  - Notification Settings (Email, Push, SMS preferences)
  - Privacy Settings (Profile visibility, Data export)
  - Danger Zone (Account deactivation/deletion)
- [x] Notification System
- [x] Rate Limiting & Security
- [x] Responsive Design (Mobile/Tablet/Desktop)

### 🔄 In Progress
- [ ] Payment Integration (VNPay/Momo)
- [ ] Advanced Search & Filters
- [ ] Email Templates Enhancement
- [ ] Push Notifications

### 📱 Responsive Design
- ✅ **Desktop** (1200px+) - Full features
- ✅ **Tablet** (768px - 1200px) - Optimized layout
- ✅ **Mobile** (< 768px) - Touch-friendly interface

## �🙏 Acknowledgments

- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [JWT](https://jwt.io/)
- [Chart.js](https://www.chartjs.org/) - 📊 Beautiful charts
- [Socket.IO](https://socket.io/) - Real-time messaging
- [Font Awesome](https://fontawesome.com/)
- [Google Fonts](https://fonts.google.com/)
- [Cloudinary](https://cloudinary.com/) - Image hosting
- [Gemini API](https://ai.google.dev/) - AI chatbot

---

**TutorMis** - Kết nối tri thức, xây dựng tương lai 🎓

Được xây dựng bởi **HoangDev21** với ❤️

📊 Version: 2.1 (Custom Modals & Settings Pages - Oct 6, 2025)