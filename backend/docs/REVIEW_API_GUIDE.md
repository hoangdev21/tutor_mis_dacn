# API Hướng Dẫn Chức Năng Đánh Giá (Review) cho Gia Sư

## Tổng Quan

Hệ thống đánh giá cho phép **học sinh/phụ huynh** đánh giá chất lượng giảng dạy của **gia sư** sau khi khóa học hoàn thành. Hệ thống được thiết kế chuyên nghiệp, an toàn và có kiểm duyệt từ admin.

### Các Tính Năng Chính

1. ✅ **Chỉ học sinh mới có thể đánh giá** - Có xác thực quyền
2. ✅ **Chỉ đánh giá lịch học hoàn thành** - Có kiểm tra trạng thái booking
3. ✅ **Hỗ trợ đánh giá chi tiết** - Với các tiêu chí cụ thể (chuyên nghiệp, giao tiếp, kiến thức, kiên nhẫn, hiệu quả)
4. ✅ **Kiểm duyệt từ Admin** - Tất cả đánh giá mới phải được phê duyệt trước khi hiển thị
5. ✅ **Gia sư có thể phản hồi** - Trả lời các đánh giá từ học sinh
6. ✅ **Cập nhật thống kê tự động** - Điểm số trung bình của gia sư cập nhật tự động
7. ✅ **Thông báo Email & In-App** - Cả gia sư và học sinh được thông báo

---

## API Endpoints

### 1. TẠO ĐÁNH GIÁ (Học Sinh)

**POST** `/api/reviews`

#### Yêu Cầu:
```json
{
  "bookingId": "objectId",
  "rating": 4,
  "comment": "Gia sư rất tuyệt vời, giảng dạy dễ hiểu",
  "criteria": {
    "professionalism": 5,
    "communication": 4,
    "knowledgeLevel": 5,
    "patience": 4,
    "effectiveness": 5
  },
  "attachments": [],
  "subject": "Toán",
  "level": "THPT"
}
```

#### Tham Số:
- `bookingId` (required): ID của yêu cầu đặt lịch
- `rating` (required): Điểm từ 1-5
- `comment` (optional): Bình luận (tối đa 1000 ký tự)
- `criteria` (optional): Đánh giá chi tiết các tiêu chí
  - `professionalism` (1-5): Chuyên nghiệp
  - `communication` (1-5): Giao tiếp
  - `knowledgeLevel` (1-5): Trình độ kiến thức
  - `patience` (1-5): Kiên nhẫn
  - `effectiveness` (1-5): Hiệu quả giảng dạy
- `attachments` (optional): Mảng các URL ảnh/video
- `subject` (optional): Tên môn học
- `level` (optional): Cấp học

#### Phản Hồi Thành Công:
```json
{
  "success": true,
  "message": "Đánh giá của bạn đã được gửi và chờ phê duyệt",
  "data": {
    "_id": "objectId",
    "reviewer": {
      "_id": "objectId",
      "email": "student@example.com",
      "profile": {
        "fullName": "Nguyễn Văn A",
        "avatar": "url"
      }
    },
    "tutor": {
      "_id": "objectId",
      "email": "tutor@example.com",
      "profile": {
        "fullName": "Trần Thầy B",
        "avatar": "url"
      }
    },
    "rating": 4,
    "comment": "Gia sư rất tuyệt vời, giảng dạy dễ hiểu",
    "criteria": { ... },
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Lỗi Có Thể Xảy Ra:
- **403**: Không phải học sinh
- **404**: Không tìm thấy booking hoặc gia sư không tồn tại
- **400**: Booking chưa hoàn thành, booking không đủ điều kiện, hoặc đã đánh giá trước
- **400**: Điểm rating không hợp lệ (phải từ 1-5)

#### Xác Thực:
- ✅ Người dùng phải là **học sinh** (`role === 'student'`)
- ✅ Booking phải thuộc học sinh này
- ✅ Booking phải có trạng thái **`completed`** và `isReviewable === true`
- ✅ Học sinh chưa đánh giá lịch học này trước đó
- ✅ Điểm rating phải từ 1 đến 5

---

### 2. LẤY CÁC ĐÁNH GIÁ CỦA GIA SƯ (Công Khai)

**GET** `/api/reviews/tutor/:tutorId`

#### Tham Số Query:
- `page` (default: 1): Trang
- `limit` (default: 10): Số lượng trên mỗi trang

#### Phản Hồi:
```json
{
  "success": true,
  "count": 10,
  "stats": {
    "averageRating": 4.5,
    "totalReviews": 25,
    "averageProfessionalism": 4.6,
    "averageCommunication": 4.4,
    "averageKnowledgeLevel": 4.8,
    "averagePatience": 4.3,
    "averageEffectiveness": 4.7
  },
  "data": [
    {
      "_id": "objectId",
      "reviewer": { ... },
      "rating": 5,
      "comment": "Tuyệt vời!",
      "criteria": { ... },
      "status": "approved",
      "helpfulCount": 12,
      "createdAt": "2024-01-15T10:30:00Z"
    },
    ...
  ]
}
```

---

### 3. LẤY CÁC ĐÁNH GIÁ CỦA TÔI (Học Sinh)

**GET** `/api/reviews/my`

#### Tham Số Query:
- `page` (default: 1)
- `limit` (default: 10)

#### Phản Hồi:
```json
{
  "success": true,
  "count": 5,
  "total": 15,
  "page": 1,
  "pages": 3,
  "data": [ ... ]
}
```

---

### 4. CẬP NHẬT ĐÁNH GIÁ (Học Sinh)

**PUT** `/api/reviews/:reviewId`

#### Yêu Cầu:
```json
{
  "rating": 5,
  "comment": "Cập nhật bình luận mới",
  "criteria": {
    "professionalism": 5
  }
}
```

#### Lưu Ý:
- Chỉ học sinh tạo ra đánh giá mới có thể cập nhật
- Sau khi cập nhật, trạng thái sẽ reset về `pending` (chờ phê duyệt lại)
- Không thể cập nhật đánh giá bị từ chối hoặc ẩn

---

### 5. XÓA ĐÁNH GIÁ (Học Sinh)

**DELETE** `/api/reviews/:reviewId`

#### Phản Hồi:
```json
{
  "success": true,
  "message": "Xóa đánh giá thành công"
}
```

---

### 6. GIA SƯ PHẢN HỒI ĐÁNH GIÁ (Gia Sư)

**PUT** `/api/reviews/:reviewId/respond`

#### Yêu Cầu:
```json
{
  "message": "Cảm ơn bạn rất nhiều! Tôi rất vui khi giúp bạn cải thiện kỹ năng toán học."
}
```

#### Phản Hồi:
```json
{
  "success": true,
  "message": "Phản hồi đánh giá thành công",
  "data": {
    "_id": "objectId",
    ...
    "tutorResponse": {
      "message": "Cảm ơn bạn rất nhiều!...",
      "respondedAt": "2024-01-15T11:45:00Z"
    }
  }
}
```

#### Xác Thực:
- ✅ Người dùng phải là **gia sư** của đánh giá này

---

### 7. ĐÁNH DẤU ĐÁNH GIÁ LÀ HỮU ÍCH (Công Khai)

**PUT** `/api/reviews/:reviewId/helpful`

#### Phản Hồi:
```json
{
  "success": true,
  "message": "Cập nhật trạng thái hữu ích thành công",
  "data": {
    "reviewId": "objectId",
    "helpfulCount": 15,
    "isHelpful": true
  }
}
```

#### Lưu Ý:
- Gọi endpoint này lần nữa sẽ bỏ đánh dấu (toggle)

---

### 8. LẤY CHI TIẾT ĐÁNH GIÁ (Công Khai)

**GET** `/api/reviews/:reviewId`

---

### 9. LẤY ĐỀ XUẤT THEO TRẠNG THÁI (Admin)

**GET** `/api/reviews/status/:status`

#### Tham Số Path:
- `status`: `pending` | `approved` | `rejected` | `hidden`

#### Tham Số Query:
- `page` (default: 1)
- `limit` (default: 20)

#### Lưu Ý:
- ✅ Chỉ admin mới có quyền

---

### 10. PHÊ DUYỆT ĐÁNH GIÁ (Admin)

**PUT** `/api/reviews/:reviewId/approve`

#### Phản Hồi:
```json
{
  "success": true,
  "message": "Phê duyệt đánh giá thành công",
  "data": {
    "_id": "objectId",
    "status": "approved",
    ...
  }
}
```

#### Xác Thực:
- ✅ Chỉ **admin** mới có quyền
- ✅ Tự động cập nhật thống kê của gia sư

---

### 11. TỪ CHỐI ĐÁNH GIÁ (Admin)

**PUT** `/api/reviews/:reviewId/reject`

#### Yêu Cầu:
```json
{
  "reason": "Vi phạm tiêu chuẩn cộng đồng"
}
```

#### Phản Hồi:
```json
{
  "success": true,
  "message": "Từ chối đánh giá thành công",
  "data": { ... }
}
```

---

## Quy Trình Luồng Đánh Giá

### Sơ Đồ Luồng:

```
1. Booking Hoàn Thành
   ↓
2. Gia sư gọi PUT /api/bookings/{id}/complete
   ↓
3. Hệ thống đặt isReviewable = true cho booking
   ↓
4. Học sinh gọi POST /api/reviews
   ↓
5. Tạo review với status = "pending"
   ↓
6. Gửi thông báo email cho gia sư
   ↓
7. Admin duyệt: PUT /api/reviews/{id}/approve
   ↓
8. Status = "approved", cập nhật TutorProfile.averageRating
   ↓
9. Thông báo gửi cho học sinh
   ↓
10. Gia sư có thể phản hồi: PUT /api/reviews/{id}/respond
```

---

## Điều Kiện Đánh Giá

### ✅ CÓ THỂ ĐỀ XUẤT KHI:
1. Booking có trạng thái `completed`
2. `booking.isReviewable = true`
3. Người dùng là **học sinh** của booking
4. Chưa đánh giá booking này trước đó
5. Rating từ 1-5

### ❌ KHÔNG THỂ ĐỀ XUẤT KHI:
1. Booking chưa hoàn thành
2. Người dùng không phải học sinh
3. Đã đánh giá booking này trước
4. Booking bị hủy
5. Rating ngoài khoảng 1-5

---

## Thống Kê Tự Động

Khi một đánh giá được **phê duyệt**, hệ thống tự động cập nhật:

### TutorProfile:
```javascript
{
  averageRating: 4.5,           // Trung bình các rating
  totalReviews: 25,             // Tổng số đánh giá đã duyệt
  stats: {
    averageRating: 4.5,
    totalReviews: 25,
    averageProfessionalism: 4.6,
    averageCommunication: 4.4,
    averageKnowledgeLevel: 4.8,
    averagePatience: 4.3,
    averageEffectiveness: 4.7
  }
}
```

---

## Thông Báo

### Email Gửi Cho Gia Sư:
- ✉️ Khi học sinh gửi đánh giá mới
- ✉️ Nội dung: Tên học sinh, điểm số, bình luận

### In-App Notifications:
- 🔔 **review_received**: Đánh giá mới
- 🔔 **tutor_response**: Học sinh có phản hồi mới

### Email Gửi Cho Học Sinh:
- ✉️ Khi gia sư phản hồi đánh giá
- ✉️ Khi admin phê duyệt/từ chối

---

## Bảo Mật & Kiểm Soát

### Authentication:
- ✅ Tất cả endpoint POST/PUT/DELETE yêu cầu JWT token
- ✅ Xác minh quyền người dùng

### Authorization:
- ✅ Học sinh chỉ có thể đánh giá booking của mình
- ✅ Gia sư chỉ có thể phản hồi đánh giá của mình
- ✅ Chỉ admin có thể phê duyệt/từ chối

### Validation:
- ✅ Rating phải từ 1-5
- ✅ Comment tối đa 1000 ký tự
- ✅ Criteria phải từ 1-5 nếu có
- ✅ Email validation cho booking

---

## Ví Dụ Đầy Đủ

### Scenario: Học sinh đánh giá gia sư

**Step 1**: Booking hoàn thành
```bash
PUT /api/bookings/booking123/complete
```

**Step 2**: Học sinh tạo đánh giá
```bash
POST /api/reviews
Authorization: Bearer {student_token}

{
  "bookingId": "booking123",
  "rating": 5,
  "comment": "Gia sư giảng dạy rất tuyệt vời",
  "criteria": {
    "professionalism": 5,
    "communication": 5,
    "knowledgeLevel": 5,
    "patience": 5,
    "effectiveness": 5
  }
}
```

**Response**: Status `pending` (chờ phê duyệt)

**Step 3**: Admin duyệt đánh giá
```bash
PUT /api/reviews/review123/approve
Authorization: Bearer {admin_token}
```

**Step 4**: Gia sư phản hồi
```bash
PUT /api/reviews/review123/respond
Authorization: Bearer {tutor_token}

{
  "message": "Cảm ơn bạn rất nhiều! Rất vui khi giúp bạn."
}
```

**Step 5**: Lấy đánh giá
```bash
GET /api/reviews/tutor/tutor123
```

---

## Error Handling

### HTTP Status Codes:
- `201`: Review tạo thành công
- `200`: Thao tác thành công
- `400`: Dữ liệu không hợp lệ
- `403`: Không có quyền
- `404`: Không tìm thấy
- `500`: Lỗi server

### Error Response:
```json
{
  "success": false,
  "message": "Lỗi mô tả",
  "error": "Chi tiết lỗi (development mode)"
}
```

---

## Lưu Ý Quan Trọng

1. 🔒 **Chỉ học sinh mới có thể đánh giá** - Hệ thống xác minh quyền
2. ✅ **Tất cả đánh giá phải được phê duyệt** - Không có đánh giá tự động công khai
3. 📊 **Thống kê tự động cập nhật** - Điểm số gia sư cập nhật khi đánh giá được phê duyệt
4. 📧 **Thông báo tự động** - Email và in-app notifications gửi tự động
5. 🔄 **Học sinh có thể cập nhật/xóa** - Trước khi admin phê duyệt hoặc sau bất kỳ lúc nào
6. 💬 **Gia sư có thể phản hồi** - Trả lời các đánh giá để xây dựng tin cậy

---

## Cập Nhật Database

Để hỗ trợ Review, các bảng sau đã được cập nhật:

### Collections:
1. **Review** (Mới) - Lưu trữ các đánh giá
2. **BookingRequest** - Thêm các field:
   - `review`: ObjectId liên kết đến Review
   - `isReviewable`: Boolean (cho phép đánh giá)
   - `reviewBlockReason`: String (lý do không thể đánh giá)
3. **TutorProfile** - Thêm các field:
   - `reviews`: Array of ObjectId (danh sách đánh giá)

### Indexes:
- Tạo index trên `Review.tutor` và `Review.status` để tối ưu tìm kiếm
- Tạo index trên `Review.reviewer` để lấy đánh giá của học sinh

---

## Hỗ Trợ

Nếu có câu hỏi hoặc vấn đề, vui lòng liên hệ với team phát triển backend.
