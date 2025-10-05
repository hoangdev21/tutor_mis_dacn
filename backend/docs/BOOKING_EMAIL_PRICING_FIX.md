# 🔧 Fix: Email Booking Hiển Thị Học Phí 0 VND

## ❌ Vấn Đề

Khi học sinh/phụ huynh gửi yêu cầu đặt lịch tới gia sư, email thông báo gửi đến gia sư hiển thị:

```
💰 Học phí: 0đ/giờ
```

Thay vì hiển thị **số tiền học phí thực tế** như trên hồ sơ gia sư.

## 🔍 Nguyên Nhân

Trong `bookingController.js`, code lấy học phí từ `tutorProfile.hourlyRate` (học phí chung ở top-level) có thể bị **0 hoặc undefined**.

Hệ thống có **2 cấp học phí** trong TutorProfile:
1. **`hourlyRate`** - Học phí chung (top-level) - mặc định 0
2. **`subjects[].hourlyRate`** - Học phí theo từng môn học cụ thể

Code cũ chỉ lấy học phí chung mà không kiểm tra học phí theo môn học.

## ✅ Giải Pháp

### Logic Ưu Tiên Mới

Khi gửi email thông báo booking, hệ thống sẽ lấy học phí theo **thứ tự ưu tiên**:

```
1️⃣  PRIORITY 1: Học phí theo môn học cụ thể (subjects[].hourlyRate)
2️⃣  PRIORITY 2: Học phí chung của gia sư (hourlyRate)
3️⃣  PRIORITY 3: Học phí từ booking request (last resort)
```

### Code Implementation

#### 1. **Tạo Booking Request** (`createBookingRequest`)

```javascript
// Get tutor profile to fetch actual hourly rate
const tutorProfile = await TutorProfile.findOne({ user: tutorId });

// Determine hourly rate - Priority: 1. Subject-specific, 2. General, 3. Provided in request
let hourlyRate = 0;

// Try subject-specific rate first
if (tutorProfile && tutorProfile.subjects && tutorProfile.subjects.length > 0) {
  const matchingSubject = tutorProfile.subjects.find(s => s.subject === subject.name);
  if (matchingSubject && matchingSubject.hourlyRate > 0) {
    hourlyRate = matchingSubject.hourlyRate;
  }
}

// Fallback to general tutor rate
if (hourlyRate === 0 && tutorProfile?.hourlyRate > 0) {
  hourlyRate = tutorProfile.hourlyRate;
}

// Last resort: use provided rate in request
if (hourlyRate === 0 && pricing?.hourlyRate > 0) {
  hourlyRate = pricing.hourlyRate;
}
```

#### 2. **Gửi Email Thông Báo**

```javascript
// IMPORTANT: Get actual hourly rate from tutor profile
// Priority: 1. Subject-specific rate, 2. General rate, 3. Booking request rate
let actualHourlyRate = 0;

// Try to find subject-specific rate first
if (tutorProfile && tutorProfile.subjects && tutorProfile.subjects.length > 0) {
  const matchingSubject = tutorProfile.subjects.find(s => 
    s.subject === bookingRequest.subject.name
  );
  if (matchingSubject && matchingSubject.hourlyRate > 0) {
    actualHourlyRate = matchingSubject.hourlyRate;
    console.log('📌 Using subject-specific rate:', actualHourlyRate);
  }
}

// Fallback to general rate
if (actualHourlyRate === 0 && tutorProfile?.hourlyRate > 0) {
  actualHourlyRate = tutorProfile.hourlyRate;
  console.log('📌 Using general tutor rate:', actualHourlyRate);
}

// Last resort: use booking request rate
if (actualHourlyRate === 0) {
  actualHourlyRate = bookingRequest.pricing.hourlyRate || 0;
  console.log('⚠️ Using booking request rate:', actualHourlyRate);
}

const emailTemplate = newBookingNotificationTemplate(tutorName, studentName, {
  // ...
  pricing: {
    hourlyRate: actualHourlyRate  // ✅ Correct rate
  }
});
```

#### 3. **Accept Booking Email**

Tương tự logic được áp dụng cho email chấp nhận booking gửi đến học sinh.

## 📊 Các Trường Hợp Test

### Case 1: Gia sư có học phí theo môn học
```
Tutor Profile:
  - General Rate: 300,000 VND/hour
  - Toán Học Rate: 400,000 VND/hour ← SẼ DÙNG
  
Email hiển thị: 400,000 VND/hour ✅
```

### Case 2: Gia sư chỉ có học phí chung
```
Tutor Profile:
  - General Rate: 250,000 VND/hour ← SẼ DÙNG
  - Tiếng Anh: không có rate riêng
  
Email hiển thị: 250,000 VND/hour ✅
```

### Case 3: Gia sư chưa set học phí
```
Tutor Profile:
  - General Rate: 0 VND/hour
  - Hóa Học: 0 VND/hour
Booking Request: 180,000 VND/hour ← SẼ DÙNG
  
Email hiển thị: 180,000 VND/hour ✅
```

## 🧪 Test Script

File: `backend/tests/test-booking-email-fix.js`

```bash
cd backend
node tests/test-booking-email-fix.js
```

Output:
```
✅ EMAIL WILL SHOW: 400.000 VND/hour (Using subject-specific rate)
✅ EMAIL WILL SHOW: 250.000 VND/hour (Fallback to general rate)
✅ EMAIL WILL SHOW: 180.000 VND/hour (Last resort: booking request rate)
```

## 🔍 Cách Kiểm Tra

1. **Tạo Booking Request:**
   - Login as student
   - Chọn gia sư và tạo booking request

2. **Check Server Console:**
   ```bash
   📌 Using subject-specific rate: 400000 for Toán Học
   ✅ Booking notification email sent to tutor: tutor@example.com
   📊 Email pricing - Hourly rate: 400000 VND/hour (from tutor profile)
   ```

3. **Check Email Inbox:**
   - Mở email của gia sư
   - Kiểm tra section "💰 Học phí"
   - Xác nhận hiển thị đúng số tiền (không phải 0đ)

## 📂 Files Đã Sửa

### `backend/src/controllers/bookingController.js`

**3 hàm được cập nhật:**
1. ✅ `createBookingRequest` - Lưu đúng học phí vào database
2. ✅ `createBookingRequest` (email logic) - Gửi email với học phí đúng
3. ✅ `acceptBooking` - Email chấp nhận với học phí đúng

## 📈 Lợi Ích

✅ **Độ chính xác:** Email hiển thị mức giá thực tế từ hồ sơ gia sư  
✅ **Ưu tiên đúng:** Học phí môn học cụ thể > Học phí chung > Request rate  
✅ **Tính nhất quán:** Thông tin khớp với hồ sơ công khai của gia sư  
✅ **UX tốt hơn:** Gia sư thấy đúng mức giá họ đã đặt, không bị confused  
✅ **Giảm tranh chấp:** Minh bạch về học phí ngay từ đầu  

## 🚀 Deploy

Sau khi test thành công:

```bash
# Restart server
cd backend
npm start

# Monitor logs
tail -f logs/server.log
```

Kiểm tra logs khi có booking mới:
```
📌 Using subject-specific rate: 400000 for Toán Học
✅ Booking notification email sent to tutor: tutor@example.com
📊 Email pricing - Hourly rate: 400000 VND/hour (from tutor profile)
```

## 📝 Notes

- ⚠️ Nếu gia sư CHƯA set học phí trong profile, email sẽ dùng rate từ booking request
- 💡 Khuyến khích gia sư cập nhật học phí trong profile để chính xác
- 🔄 Logic này cũng áp dụng cho email "Booking Accepted" gửi cho học sinh

---

**Ngày sửa:** 5 tháng 10, 2025  
**Người sửa:** AI Assistant  
**Version:** 1.0.0  
**Status:** ✅ Fixed & Tested
