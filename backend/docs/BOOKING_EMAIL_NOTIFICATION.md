# 📧 Tính Năng Email Thông Báo Yêu Cầu Đặt Lịch

## Tổng Quan

Khi học sinh gửi yêu cầu đặt lịch khóa học đến gia sư, hệ thống sẽ **tự động gửi email thông báo chuyên nghiệp** đến gia sư để họ biết và có thể phản hồi kịp thời.

## Tính Năng

### ✨ Điểm Nổi Bật

- ✅ **Gửi email tự động** khi học sinh tạo yêu cầu booking thành công
- ✅ **Thiết kế email chuyên nghiệp** với gradient màu sắc và layout bắt mắt
- ✅ **Thông tin đầy đủ** về yêu cầu: môn học, lịch học, địa điểm, học phí
- ✅ **Call-to-action rõ ràng** với các nút "Chấp nhận" và "Xem chi tiết"
- ✅ **Responsive design** hiển thị tốt trên mọi thiết bị
- ✅ **Không gây lỗi** nếu email service gặp sự cố

### 📋 Nội Dung Email

Email thông báo bao gồm các thông tin sau:

#### 1. **Thông tin môn học**
   - Tên môn học
   - Cấp độ (THCS, THPT, Đại học, etc.)

#### 2. **Thông tin lịch học**
   - 📅 Ngày bắt đầu
   - ⏰ Thời gian ưu tiên
   - 📆 Số buổi mỗi tuần
   - ⏱️ Thời lượng mỗi buổi
   - 📊 Tổng thời gian khóa học

#### 3. **Thông tin địa điểm**
   - Loại hình (online, tại nhà học sinh, tại nhà gia sư)
   - Địa chỉ cụ thể (nếu có)
   - Quận/Huyện và Thành phố

#### 4. **Thông tin học phí**
   - 💰 Mức giá mỗi giờ
   - Tổng ước tính toàn khóa

#### 5. **Nội dung bổ sung**
   - Mô tả chi tiết yêu cầu
   - 💬 Lời nhắn từ học sinh (nếu có)

#### 6. **Hành động**
   - Nút "✅ Chấp nhận yêu cầu"
   - Nút "👁️ Xem chi tiết"
   - Link trực tiếp đến trang quản lý yêu cầu

#### 7. **Gợi ý và lưu ý**
   - 💡 Các gợi ý để tăng cơ hội thành công
   - ⏰ Thời hạn phản hồi (48 giờ)

## Cấu Trúc Code

### 1. Email Template (`backend/src/utils/email.js`)

```javascript
const newBookingNotificationTemplate = (tutorName, studentName, bookingDetails) => {
  // ... template generation code
  return {
    subject: '🔔 Bạn có yêu cầu đặt lịch mới từ học sinh!',
    html: `<!-- Professional HTML email template -->`
  };
};
```

**Parameters:**
- `tutorName` (string): Tên gia sư
- `studentName` (string): Tên học sinh
- `bookingDetails` (object): Chi tiết yêu cầu đặt lịch
  - `subject`: { name, level }
  - `schedule`: { startDate, preferredTime, daysPerWeek, hoursPerSession, duration }
  - `location`: { type, address, district, city }
  - `pricing`: { hourlyRate }
  - `description`: string
  - `studentNote`: string

### 2. Booking Controller (`backend/src/controllers/bookingController.js`)

```javascript
// Trong hàm createBookingRequest
exports.createBookingRequest = async (req, res) => {
  try {
    // ... create booking logic
    
    // Send email notification to tutor
    try {
      const tutorEmail = bookingRequest.tutor.email;
      const tutorProfile = await TutorProfile.findOne({ user: tutorId });
      const tutorName = tutorProfile?.fullName || bookingRequest.tutor.email;
      const studentName = studentProfile?.fullName || bookingRequest.student.email;

      // IMPORTANT: Use tutor's profile hourly rate for accurate email display
      // This ensures the email shows the ACTUAL rate from tutor's profile
      // at the time of booking, not the rate submitted in the request
      const actualHourlyRate = tutorProfile?.hourlyRate || bookingRequest.pricing.hourlyRate;

      const emailTemplate = newBookingNotificationTemplate(tutorName, studentName, {
        subject: bookingRequest.subject,
        schedule: bookingRequest.schedule,
        location: bookingRequest.location,
        pricing: {
          hourlyRate: actualHourlyRate  // Use actual rate from tutor profile
        },
        description: bookingRequest.description,
        studentNote: bookingRequest.studentNote
      });

      await sendEmail(tutorEmail, emailTemplate);
      console.log('✅ Booking notification email sent to tutor:', tutorEmail);
      console.log('📊 Email pricing - Hourly rate:', actualHourlyRate, '(from tutor profile)');
    } catch (emailError) {
      console.error('❌ Failed to send booking notification email:', emailError);
      // Don't fail the request if email fails
    }
    
    // ... return response
  } catch (error) {
    // ... error handling
  }
};
```

**⚠️ Important Note about Pricing:**

The email ALWAYS displays the **actual hourly rate from the tutor's profile** at the time the booking request is created. This ensures:
- ✅ Tutor sees their current published rate
- ✅ No confusion if student submitted different rate
- ✅ Accurate pricing information
- ✅ Reflects tutor's real-time pricing

## Cấu Hình

### Environment Variables (.env)

Đảm bảo các biến môi trường sau đã được cấu hình:

```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@tutormis.com

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

### Gmail App Password

Để sử dụng Gmail gửi email:

1. Truy cập: https://myaccount.google.com/security
2. Bật "2-Step Verification"
3. Tạo "App Password" cho ứng dụng
4. Copy password vào `EMAIL_PASS` trong file `.env`

## Testing

### Test Email Template

Chạy script test để xem preview email:

```bash
cd backend
node tests/test-booking-email.js
```

### Test Email Gửi Thực Tế

1. **Tạo tài khoản test:**
   - 1 tài khoản học sinh
   - 1 tài khoản gia sư (đã được duyệt)

2. **Gửi yêu cầu đặt lịch:**
   ```bash
   # Login as student
   POST /api/auth/login
   
   # Create booking request
   POST /api/bookings
   {
     "tutorId": "...",
     "subject": { "name": "Toán Học", "level": "THPT" },
     "schedule": {
       "startDate": "2025-11-01",
       "preferredTime": "18:00-20:00",
       "daysPerWeek": 3,
       "hoursPerSession": 2,
       "duration": 8
     },
     "location": {
       "type": "home",
       "address": "123 Street",
       "district": "District 1",
       "city": "Ho Chi Minh"
     },
     "pricing": { "hourlyRate": 200000 },
     "description": "Need help with math",
     "studentNote": "Please focus on algebra"
   }
   ```

3. **Kiểm tra inbox** của gia sư để xác nhận email đã được gửi

## Xử Lý Lỗi

### Email Gửi Thất Bại

Hệ thống được thiết kế để **không gây lỗi** nếu email service gặp sự cố:

```javascript
try {
  await sendEmail(tutorEmail, emailTemplate);
  console.log('✅ Email sent successfully');
} catch (emailError) {
  console.error('❌ Email failed:', emailError);
  // Request vẫn thành công, chỉ email bị lỗi
}
```

### Logs

Kiểm tra logs server để debug:

```bash
# Thành công
✅ Booking notification email sent to tutor: tutor@example.com

# Thất bại
❌ Failed to send booking notification email: Connection timeout
```

## Tùy Chỉnh

### Thay Đổi Nội Dung Email

Chỉnh sửa template trong `backend/src/utils/email.js`:

```javascript
const newBookingNotificationTemplate = (tutorName, studentName, bookingDetails) => {
  return {
    subject: 'Your custom subject', // Thay đổi tiêu đề
    html: `
      <!-- Customize HTML here -->
    `
  };
};
```

### Thêm Thông Tin

Truyền thêm dữ liệu vào `bookingDetails`:

```javascript
const emailTemplate = newBookingNotificationTemplate(tutorName, studentName, {
  ...bookingDetails,
  customField: 'custom value' // Thêm field mới
});
```

## 💰 Logic Học Phí Trong Email

### ⚠️ QUAN TRỌNG: Email Luôn Hiển Thị Học Phí Từ Hồ Sơ Gia Sư

Email thông báo **LUÔN sử dụng học phí từ hồ sơ gia sư** thay vì học phí trong booking request vì các lý do sau:

#### ✅ Độ Chính Xác
- Hiển thị **mức giá thực tế** mà gia sư đã đặt trong hồ sơ của họ
- Tránh nhầm lẫn nếu học sinh gửi mức giá cũ hoặc không chính xác
- Gia sư thấy **mức giá công khai hiện tại** của họ

#### ✅ Tính Nhất Quán
- Tất cả email hiển thị cùng mức giá cho cùng một gia sư
- Khớp với thông tin trên hồ sơ công khai của gia sư
- Thông tin chuyên nghiệp và đáng tin cậy

#### ✅ Minh Bạch
- Không có bất ngờ cho gia sư
- Kỳ vọng rõ ràng về thu nhập
- Giảm tranh chấp tiềm ẩn

### 📝 Ví Dụ Thực Tế

```javascript
// Mức giá trong hồ sơ gia sư: 400.000 VND/giờ
tutorProfile.hourlyRate = 400000;

// Học sinh gửi booking với giá khác: 350.000 VND/giờ
bookingRequest.pricing.hourlyRate = 350000;

// ✅ Email sẽ hiển thị: 400.000 VND/giờ (từ hồ sơ gia sư)
// Đây là mức giá gia sư mong đợi thấy trong email!
```

### 💻 Implementation Code

```javascript
// Lấy mức giá THỰC TẾ từ hồ sơ gia sư
const tutorProfile = await TutorProfile.findOne({ user: tutorId });
const actualHourlyRate = tutorProfile?.hourlyRate || bookingRequest.pricing.hourlyRate;

// Sử dụng mức giá này trong email template
const emailTemplate = newBookingNotificationTemplate(tutorName, studentName, {
  // ... other details
  pricing: {
    hourlyRate: actualHourlyRate  // ← Luôn từ hồ sơ gia sư
  }
});
```

### 📊 Console Log

Khi email được gửi, bạn sẽ thấy:
```bash
✅ Booking notification email sent to tutor: tutor@example.com
📊 Email pricing - Hourly rate: 400000 (from tutor profile)
```

Điều này xác nhận email đã sử dụng đúng mức giá từ hồ sơ gia sư.

### 🔍 Kiểm Tra Mức Giá

Để verify mức giá đang được sử dụng:

```javascript
// 1. Kiểm tra mức giá trong hồ sơ gia sư
GET /api/tutor/profile/:tutorId

// 2. Tạo booking request
POST /api/bookings

// 3. Check server logs để xem mức giá được dùng trong email
// 📊 Email pricing - Hourly rate: XXX (from tutor profile)
```

## Hiệu Suất

- ✅ **Non-blocking**: Email gửi trong try-catch, không làm chậm API
- ✅ **Async**: Sử dụng async/await để xử lý bất đồng bộ
- ✅ **Fail-safe**: Không làm thất bại request nếu email lỗi
- ✅ **Accurate Pricing**: Luôn lấy học phí từ hồ sơ gia sư thực tế

## Best Practices

1. ✅ **Luôn catch error** khi gửi email
2. ✅ **Log kết quả** để debug dễ dàng
3. ✅ **Test template** trước khi deploy
4. ✅ **Sử dụng HTML responsive** cho mobile
5. ✅ **Cung cấp text alternative** cho email client không hỗ trợ HTML

## Troubleshooting

### Email không được gửi

1. **Kiểm tra .env**
   ```bash
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

2. **Kiểm tra Gmail settings**
   - Bật 2-Step Verification
   - Tạo App Password mới

3. **Kiểm tra logs**
   ```bash
   tail -f backend/logs/server.log
   ```

### Email vào spam

1. Cấu hình SPF, DKIM, DMARC records
2. Sử dụng email service chuyên nghiệp (SendGrid, AWS SES)
3. Tránh từ ngữ spam trong subject/content

### Template không hiển thị đúng

1. Test trên nhiều email client khác nhau
2. Sử dụng inline CSS thay vì external
3. Tránh JavaScript trong email HTML

## Future Enhancements

- [ ] Email template builder với UI
- [ ] A/B testing cho email subject
- [ ] Email tracking (open rate, click rate)
- [ ] Retry logic khi gửi thất bại
- [ ] Queue system cho email (Bull, RabbitMQ)
- [ ] Template đa ngôn ngữ (i18n)
- [ ] Personalization nâng cao

## Support

Nếu có vấn đề hoặc câu hỏi:
- 📧 Email: support@tutormis.com
- 📚 Docs: https://docs.tutormis.com
- 💬 Discord: https://discord.gg/tutormis

---

**Last Updated:** October 4, 2025
**Version:** 1.0.0
**Author:** TutorMis Development Team
