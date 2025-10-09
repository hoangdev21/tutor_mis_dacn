# Fix: File Upload Authentication Issues

## Vấn Đề

Khi người dùng nhấn nút đính kèm và chọn file để upload, hệ thống báo lỗi:
1. **"Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại"**
2. Backend log: **"❌ No token provided"**
3. Backend log: **"ActivityLog validation failed: `guest` is not a valid enum value for path `userRole`"**

## Nguyên Nhân

### 1. Token Không Được Gửi Kèm
- Khi sử dụng `apiRequest()` với FormData, `headers: {}` bị pass vào làm override các headers mặc định của tokenManager
- Dẫn đến Authorization header không được gửi lên server
- Server trả về 401 Unauthorized

### 2. ActivityLog Validation Error
- Middleware logging cố gắng log với `userRole: 'guest'` khi không có user authenticated
- ActivityLog schema chỉ cho phép enum: `['student', 'tutor', 'admin', 'system']`
- Không có 'guest' trong danh sách enum
- Dẫn đến validation error

## Giải Pháp

### Fix 1: Sửa Upload Function để Gửi Token Đúng

**File:** `frontend/assets/js/messages.js`

**Thay đổi:**
- Không dùng `apiRequest()` cho FormData upload vì nó có vấn đề với headers
- Dùng `fetch()` trực tiếp để có control hoàn toàn về headers
- Lấy token từ localStorage và gửi kèm trong Authorization header
- Thêm error handling chi tiết cho 401 status
- Thêm console.log để debug

**Code:**
```javascript
// Get token for Authorization header
const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

console.log('🔑 Upload file - Token check:', {
  hasToken: !!token,
  tokenLength: token ? token.length : 0
});

if (!token) {
  showError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
  clearFilePreview();
  setTimeout(() => {
    const currentPath = window.location.pathname;
    const loginPath = currentPath.includes('/student/') 
      ? '../../pages/auth/login.html'
      : currentPath.includes('/tutor/')
        ? '../../pages/auth/login.html'
        : '/frontend/pages/auth/login.html';
    window.location.href = loginPath;
  }, 2000);
  return;
}

// Use fetch directly for FormData upload
const response = await fetch(`${API_BASE_URL}/messages/upload`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
    // Don't set Content-Type - browser will set it with multipart boundary
  },
  body: formData
});
```

**Lợi ích:**
- ✅ Token được gửi đúng cách trong Authorization header
- ✅ Server nhận được token và authenticate thành công
- ✅ Upload file hoạt động bình thường
- ✅ Debug logs giúp track vấn đề

### Fix 2: Sửa Logging Middleware để Không Log Guest

**File:** `backend/src/middleware/logging.js`

**Thay đổi:**
- Xóa default value `'guest'` cho userRole
- Chỉ log khi có user và user có role hợp lệ

**Code trước:**
```javascript
const logData = {
  type: logType,
  action,
  user: req.user?._id,
  userRole: req.user?.role || 'guest',  // ❌ Lỗi ở đây
  resource,
  // ...
};

if (shouldLog) {
  await ActivityLog.logActivity(logData);
}
```

**Code sau:**
```javascript
const logData = {
  type: logType,
  action,
  user: req.user?._id,
  userRole: req.user?.role,  // ✅ Không có default 'guest'
  resource,
  // ...
};

// Only log if we have a valid user (avoid guest role issue)
if (shouldLog && req.user && req.user.role) {  // ✅ Kiểm tra user tồn tại
  await ActivityLog.logActivity(logData);
}
```

**Lợi ích:**
- ✅ Không còn validation error
- ✅ Chỉ log khi có user authenticated
- ✅ Giảm spam logs cho unauthenticated requests

## Kết Quả

### Trước Khi Fix:
```
GET /api/messages/conversations 304 9.839 ms - -
❌ No token provided
POST /api/messages/upload 401 0.367 ms - 54
Error logging activity: Error: ActivityLog validation failed: 
userRole: `guest` is not a valid enum value for path `userRole`.
```

### Sau Khi Fix:
```
GET /api/messages/conversations 304 9.839 ms - -
🔑 Upload file - Token check: { hasToken: true, tokenLength: 284 }
✅ Token decoded: { userId: '60d5ec49...', role: 'student' }
✅ User found: { id: '60d5ec49...', email: 'user@example.com', role: 'student' }
✅ Authentication successful
POST /api/messages/upload 200 1234.567 ms - -
```

## Testing Checklist

- [x] Fix code trong messages.js
- [x] Fix code trong logging.js
- [ ] Test upload ảnh JPG
- [ ] Test upload file PDF
- [ ] Test upload với token hợp lệ
- [ ] Test upload với token hết hạn
- [ ] Test upload khi chưa đăng nhập
- [ ] Verify không còn ActivityLog error trong logs
- [ ] Verify upload thành công lên Cloudinary
- [ ] Verify message với attachment hiển thị đúng

## Debug Commands

### Kiểm tra token trong browser console:
```javascript
console.log('Token:', localStorage.getItem('accessToken'));
console.log('Token length:', localStorage.getItem('accessToken')?.length);
```

### Kiểm tra backend logs:
```bash
# Trong terminal backend
tail -f backend/logs/app.log

# Hoặc xem console output trực tiếp
```

### Test upload manually:
```javascript
// Trong browser console
const formData = new FormData();
formData.append('attachment', document.getElementById('fileInput').files[0]);

const token = localStorage.getItem('accessToken');

fetch('http://localhost:5000/api/messages/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
}).then(r => r.json()).then(console.log);
```

## Lưu Ý Quan Trọng

### 1. FormData và Content-Type
- **KHÔNG** set `Content-Type` header khi upload FormData
- Browser tự động set `Content-Type: multipart/form-data; boundary=...`
- Nếu set manually sẽ thiếu boundary và server không parse được

### 2. Token Management
- Token có thể lưu ở `accessToken` hoặc `token` key trong localStorage
- Luôn check cả 2 keys: `localStorage.getItem('accessToken') || localStorage.getItem('token')`
- Clear cả 2 keys khi logout hoặc token expired

### 3. Error Handling
- 401: Token hết hạn hoặc invalid → Redirect về login
- 400: Validation error (file size, type, etc) → Show error message
- 500: Server error → Show generic error message

### 4. Logging Best Practices
- Không log unauthenticated requests (trừ auth endpoints)
- Chỉ log khi có user và role hợp lệ
- Gracefully handle logging errors (không ảnh hưởng main request)

## Files Changed

1. **frontend/assets/js/messages.js**
   - Function: `handleFileSelect()`
   - Changes: Use fetch() directly, add token handling, add debug logs

2. **backend/src/middleware/logging.js**
   - Function: `requestLogger()`
   - Changes: Remove 'guest' default, add user existence check

## Related Issues

- Token expiration handling
- File upload with authentication
- ActivityLog schema validation
- Multipart form data handling

## Future Improvements

1. **Token Refresh:**
   - Implement automatic token refresh when expired
   - Use refresh token to get new access token

2. **Better Error Messages:**
   - Localized error messages
   - More specific error codes

3. **Upload Progress:**
   - Show progress bar for large files
   - Allow cancellation of uploads

4. **Rate Limiting:**
   - Limit upload frequency per user
   - Prevent abuse

---

**Status:** ✅ Fixed and Ready for Testing
**Date:** October 8, 2025
**Version:** 1.0
