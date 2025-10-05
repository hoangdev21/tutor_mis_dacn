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
- 💬 Chat trực tiếp với gia sư
- 📚 Quản lý khóa học đã đăng ký
- ⭐ Đánh giá gia sư sau khóa học
- 📖 Đọc và viết blog

### 👨‍🏫 Gia Sư
- ✅ Đăng ký và chờ admin duyệt hồ sơ
- 📊 Dashboard thống kê thu nhập, học sinh
- 📋 Xem và ứng tuyển yêu cầu từ học sinh
- 👥 Quản lý danh sách học sinh
- 📅 Quản lý lịch dạy
- 💰 Theo dõi thu nhập chi tiết
- 📖 Viết blog chia sẻ kiến thức

### 👨‍💼 Admin
- 📊 Dashboard tổng quan hệ thống
- 👥 Quản lý người dùng (duyệt gia sư, khóa tài khoản)
- 📝 Kiểm duyệt nội dung blog
- 💰 Thống kê tài chính
- ⚙️ Cài đặt hệ thống
- 🎫 Hỗ trợ khách hàng

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
cd tutornis
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
- Tải và cài đặt MongoDB Community Server
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
MONGODB_URI=mongodb://localhost:27017/tutornis

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
EMAIL_FROM=noreply@tutornis.com

# Frontend URL
FRONTEND_URL=http://localhost:3000

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
npx http-server frontend -p 3000

# Hoặc Python
cd frontend
python -m http.server 3000
```

Frontend sẽ chạy tại: `http://localhost:3000`

### 4. Kiểm Tra Health
- Backend: `http://localhost:5000/health`
- Frontend: `http://localhost:3000`

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
GET    /tutor/income           # Thống kê thu nhập
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

### Request/Response Format

#### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
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
- Email: `admin@tutornis.com`
- Password: `Admin123!`
- Tạo thủ công trong MongoDB hoặc qua script

```javascript
// Script tạo admin account
const bcrypt = require('bcryptjs');
const { User, AdminProfile } = require('./src/models');

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('Admin123!', 12);
  
  const admin = await User.create({
    email: 'admin@tutornis.com',
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

## 🚀 Deployment

### Production Checklist
- [ ] Cập nhật NODE_ENV=production
- [ ] Sử dụng MongoDB Atlas hoặc dedicated server
- [ ] Cấu hình HTTPS
- [ ] Cập nhật FRONTEND_URL và CORS settings
- [ ] Cấu hình reverse proxy (Nginx)
- [ ] Setup monitoring và logging
- [ ] Backup strategy cho database

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tutornis
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

- Email: support@tutornis.com
- GitHub Issues: [Create Issue](link-to-issues)
- Documentation: [Wiki](link-to-wiki)

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [JWT](https://jwt.io/)
- [Font Awesome](https://fontawesome.com/)
- [Google Fonts](https://fonts.google.com/)

---

**TutorMis** - Kết nối tri thức, xây dựng tương lai 🎓