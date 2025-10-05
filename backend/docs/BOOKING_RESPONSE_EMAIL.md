# 📧 Email Thông Báo Chấp Nhận/Từ Chối Yêu Cầu Đặt Lịch

## Tổng Quan

Khi gia sư **chấp nhận** hoặc **từ chối** yêu cầu đặt lịch từ học sinh, hệ thống sẽ tự động gửi email thông báo chuyên nghiệp đến học sinh để họ biết và có thể hành động tiếp theo.

## 🎯 Tính Năng

### ✨ Email Chấp Nhận (Accepted)

**Gửi khi:** Gia sư chấp nhận yêu cầu đặt lịch

**Nội dung bao gồm:**
- ✅ **Thông báo vui mừng** với header màu xanh lá
- ✅ **Lời nhắn từ gia sư** (nếu có)
- ✅ **Thông tin lịch học đầy đủ:**
  - Môn học và cấp độ
  - Lịch học (ngày bắt đầu, thời gian, số buổi)
  - Địa điểm
  - Học phí (từ hồ sơ gia sư)
- ✅ **Các bước tiếp theo** cho học sinh
- ✅ **Call-to-action buttons:**
  - 💬 Nhắn tin với gia sư
  - 📅 Xem lịch học

**Email Subject:** `🎉 Gia sư đã chấp nhận yêu cầu của bạn!`

### ❌ Email Từ Chối (Rejected)

**Gửi khi:** Gia sư từ chối yêu cầu đặt lịch

**Nội dung bao gồm:**
- ❌ **Thông báo lịch sự** với header màu cam
- 📌 **Lý do từ gia sư** (nếu có)
- 📋 **Yêu cầu ban đầu** để tham khảo
- 💡 **Gợi ý cho học sinh:**
  - Tìm gia sư khác
  - Điều chỉnh yêu cầu
  - Liên hệ hỗ trợ
  - Đăng yêu cầu mới
- ✅ **Call-to-action buttons:**
  - 🔍 Tìm gia sư khác
  - ✏️ Đăng yêu cầu mới
- 💬 **Support box** với thông tin liên hệ

**Email Subject:** `❌ Yêu cầu đặt lịch chưa được chấp nhận`

## 💻 Implementation

### 1. Email Templates (`backend/src/utils/email.js`)

#### Template Chấp Nhận

```javascript
const bookingAcceptedNotificationTemplate = (studentName, tutorName, bookingDetails, tutorMessage) => {
  return {
    subject: '🎉 Gia sư đã chấp nhận yêu cầu của bạn!',
    html: `<!-- Professional HTML template -->`
  };
};
```

**Parameters:**
- `studentName` (string): Tên học sinh
- `tutorName` (string): Tên gia sư
- `bookingDetails` (object): Chi tiết booking
  - `subject`: { name, level }
  - `schedule`: { startDate, preferredTime, daysPerWeek, hoursPerSession }
  - `location`: { type, address, district, city }
  - `pricing`: { hourlyRate }
- `tutorMessage` (string): Lời nhắn từ gia sư (optional)

#### Template Từ Chối

```javascript
const bookingRejectedNotificationTemplate = (studentName, tutorName, bookingDetails, rejectionReason) => {
  return {
    subject: '❌ Yêu cầu đặt lịch chưa được chấp nhận',
    html: `<!-- Professional HTML template -->`
  };
};
```

**Parameters:**
- `studentName` (string): Tên học sinh
- `tutorName` (string): Tên gia sư
- `bookingDetails` (object): Chi tiết booking
- `rejectionReason` (string): Lý do từ chối (optional)

### 2. Controller Integration (`backend/src/controllers/bookingController.js`)

#### Accept Booking Endpoint

```javascript
exports.acceptBooking = async (req, res) => {
  try {
    const { message } = req.body;
    
    // Accept the booking
    await booking.accept(message || 'Gia sư đã chấp nhận yêu cầu của bạn');
    
    // Populate profiles
    await booking.populate([/* ... */]);
    
    // Send email to student
    try {
      const studentEmail = booking.student.email;
      const studentProfile = await StudentProfile.findOne({ user: booking.student._id });
      const studentName = studentProfile?.fullName || booking.student.email;
      
      const tutorProfile = await TutorProfile.findOne({ user: tutorId });
      const tutorName = tutorProfile?.fullName || booking.tutor.email;
      const actualHourlyRate = tutorProfile?.hourlyRate || booking.pricing.hourlyRate;

      const emailTemplate = bookingAcceptedNotificationTemplate(
        studentName, 
        tutorName, 
        {
          subject: booking.subject,
          schedule: booking.schedule,
          location: booking.location,
          pricing: { hourlyRate: actualHourlyRate }
        },
        message
      );

      await sendEmail(studentEmail, emailTemplate);
      console.log('✅ Booking accepted notification sent to student:', studentEmail);
    } catch (emailError) {
      console.error('❌ Failed to send acceptance email:', emailError);
    }
    
    res.json({ success: true, data: booking });
  } catch (error) {
    // Error handling
  }
};
```

#### Reject Booking Endpoint

```javascript
exports.rejectBooking = async (req, res) => {
  try {
    const { message } = req.body;
    
    // Reject the booking
    await booking.reject(message || 'Gia sư đã từ chối yêu cầu của bạn');
    
    // Populate profiles
    await booking.populate([/* ... */]);
    
    // Send email to student
    try {
      const studentEmail = booking.student.email;
      const studentProfile = await StudentProfile.findOne({ user: booking.student._id });
      const studentName = studentProfile?.fullName || booking.student.email;
      
      const tutorProfile = await TutorProfile.findOne({ user: tutorId });
      const tutorName = tutorProfile?.fullName || booking.tutor.email;

      const emailTemplate = bookingRejectedNotificationTemplate(
        studentName, 
        tutorName, 
        {
          subject: booking.subject,
          schedule: booking.schedule,
          location: booking.location
        },
        message
      );

      await sendEmail(studentEmail, emailTemplate);
      console.log('✅ Booking rejected notification sent to student:', studentEmail);
    } catch (emailError) {
      console.error('❌ Failed to send rejection email:', emailError);
    }
    
    res.json({ success: true, data: booking });
  } catch (error) {
    // Error handling
  }
};
```

## 📊 Complete Workflow

```
┌─────────────────────────────────────────┐
│ 1. Student creates booking request     │
│    ↓ Email sent to tutor               │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ 2. Tutor reviews request                │
└─────────────────────────────────────────┘
                 ↓
         ┌───────┴───────┐
         │               │
    [Accept]        [Reject]
         │               │
         ↓               ↓
┌────────────────┐  ┌────────────────┐
│ 3a. Accept     │  │ 3b. Reject     │
│ - Update DB    │  │ - Update DB    │
│ - Send email   │  │ - Send email   │
│   to student   │  │   to student   │
└────────────────┘  └────────────────┘
         │               │
         ↓               ↓
┌────────────────┐  ┌────────────────┐
│ 4a. Student    │  │ 4b. Student    │
│ receives       │  │ receives       │
│ ACCEPTED email │  │ REJECTED email │
│                │  │                │
│ Actions:       │  │ Actions:       │
│ - Message      │  │ - Find other   │
│ - View         │  │ - Create new   │
│   schedule     │  │   request      │
└────────────────┘  └────────────────┘
```

## 💰 Pricing Logic

**Quan trọng:** Email **LUÔN sử dụng học phí từ hồ sơ gia sư**:

```javascript
const tutorProfile = await TutorProfile.findOne({ user: tutorId });
const actualHourlyRate = tutorProfile?.hourlyRate || booking.pricing.hourlyRate;

pricing: {
  hourlyRate: actualHourlyRate  // From tutor profile!
}
```

## 📝 Testing

### Test Email Templates

```bash
# Preview accepted email
Open: frontend/tests/email-preview-accepted.html

# Preview rejected email
Open: frontend/tests/email-preview-rejected.html
```

### Test API Endpoints

#### 1. Accept Booking

```bash
PUT /api/bookings/:bookingId/accept
Authorization: Bearer <tutor_token>

Body:
{
  "message": "Rất vui được hỗ trợ em. Hãy liên hệ để sắp xếp buổi học nhé!"
}
```

**Expected:**
- ✅ Booking status → `accepted`
- ✅ Email sent to student
- ✅ Console log: `✅ Booking accepted notification sent to student: student@example.com`

#### 2. Reject Booking

```bash
PUT /api/bookings/:bookingId/reject
Authorization: Bearer <tutor_token>

Body:
{
  "message": "Hiện tại lịch của tôi đã khá bận. Xin lỗi em!"
}
```

**Expected:**
- ✅ Booking status → `rejected`
- ✅ Email sent to student
- ✅ Console log: `✅ Booking rejected notification sent to student: student@example.com`

### Test Full Flow

1. **Student creates booking** → Tutor receives email
2. **Tutor accepts booking** → Student receives acceptance email
3. Check student's inbox
4. Verify email content and links

Or:

1. **Student creates booking** → Tutor receives email
2. **Tutor rejects booking** → Student receives rejection email
3. Check student's inbox
4. Verify email content and suggestions

## 🎨 Email Design

### Accepted Email Colors

- **Header**: Green gradient (#4caf50 → #45a049)
- **Primary action**: Green buttons
- **Accent**: Blue for secondary action
- **Mood**: Positive, congratulatory

### Rejected Email Colors

- **Header**: Orange gradient (#ff9800 → #f57c00)
- **Primary action**: Green (find tutor)
- **Secondary action**: Blue (create request)
- **Mood**: Supportive, encouraging

## 📊 Console Logs

### Successful Email Sending

```bash
# Acceptance
✅ Booking accepted notification sent to student: student@example.com
📊 Acceptance email - Tutor: Nguyễn Văn A | Student: Trần Thị B

# Rejection
✅ Booking rejected notification sent to student: student@example.com
📊 Rejection email - Tutor: Nguyễn Văn A | Student: Trần Thị B | Reason: Lịch bận
```

### Failed Email Sending

```bash
❌ Failed to send acceptance email: Connection timeout
❌ Failed to send rejection email: Invalid email address
```

## ⚠️ Error Handling

Email failures **KHÔNG làm thất bại** request:

```javascript
try {
  await sendEmail(studentEmail, emailTemplate);
} catch (emailError) {
  console.error('❌ Failed to send email:', emailError);
  // Request vẫn thành công!
}
```

## 🚀 Production Checklist

- [x] Email templates created
- [x] Controller integrated
- [x] Error handling implemented
- [x] Logging added
- [x] Visual previews created
- [ ] Test on staging
- [ ] Configure production email service
- [ ] Monitor email delivery rate

## 📚 Related Documentation

- `BOOKING_EMAIL_NOTIFICATION.md` - Email khi tạo booking
- `QUICK_START_EMAIL.md` - Hướng dẫn nhanh
- `IMPLEMENTATION_SUMMARY.md` - Tổng quan implementation

## 💡 Tips

1. ✅ **Tutor Message:** Khuyến khích gia sư viết lời nhắn khi accept/reject
2. ✅ **Email Timing:** Email gửi ngay lập tức sau khi tutor hành động
3. ✅ **Links:** Tất cả links trong email đều dẫn đến trang phù hợp
4. ✅ **Responsive:** Email hiển thị tốt trên mobile
5. ✅ **Professional:** Tone chuyên nghiệp, thân thiện

---

**Last Updated:** October 4, 2025  
**Version:** 1.0.0  
**Author:** TutorMis Development Team
