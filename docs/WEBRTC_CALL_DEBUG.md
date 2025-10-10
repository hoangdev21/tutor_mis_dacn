# 🔧 WebRTC Call Debug Guide

## Vấn đề
Người dùng thứ 2 (người nhận cuộc gọi) thấy "Unknown User" hoặc "UN" thay vì tên thật của người gọi.

## Nguyên nhân đã tìm ra
**Root Cause**: Hàm `showIncomingCall()` chỉ set thông tin cho **incoming call modal**, KHÔNG set cho **active call modal**. Khi user nhấn "Accept", code chỉ ẩn incoming modal và hiện active modal, nhưng KHÔNG copy thông tin sang!

## Giải pháp đã áp dụng

### 1. Sửa `showIncomingCall()` function
**File**: `frontend/assets/js/messages.js`

**Thay đổi**:
- ✅ Thêm logging để debug
- ✅ **Pre-set activeCallName và activeCallAvatar NGAY KHI incoming call đến**
- ✅ Thêm fallback cho trường hợp dữ liệu thiếu
- ✅ Kiểm tra xem elements có tồn tại không

**Code logic mới**:
```javascript
function showIncomingCall(data) {
  // ... set incoming call modal ...
  
  // CRITICAL FIX: Pre-set active call info NOW
  const activeCallName = document.getElementById('activeCallName');
  const activeCallAvatar = document.getElementById('activeCallAvatar');
  
  if (activeCallName) {
    activeCallName.textContent = data.callerName || 'Unknown User';
  }
  
  if (activeCallAvatar) {
    activeCallAvatar.src = data.callerAvatar || fallback;
  }
}
```

### 2. Thêm logging vào `handleIncomingCall()`
- Log toàn bộ data nhận được từ socket
- Log từng field riêng lẻ để dễ debug

### 3. Thêm logging vào `acceptIncomingCall()`
- Xác nhận data có đầy đủ không
- Xác nhận elements được tìm thấy và set giá trị

## Cách test

### Test 1: Sử dụng Debug Tool (Khuyến nghị)

1. **Mở file**: `frontend/test-webrtc-debug.html` trong trình duyệt
2. **Bước 1**: Click "Login" để giả lập đăng nhập
3. **Bước 2**: Click "Connect Socket" để kết nối
4. **Bước 3**: Nhập thông tin người gọi:
   - Caller Name: `Giảng viên Hồng`
   - Caller Avatar: URL avatar hoặc để mặc định
5. **Bước 4**: Click "Trigger Incoming Call"
6. **Kiểm tra**:
   - ✅ Event Logs hiển thị dữ liệu đầy đủ
   - ✅ Incoming Call Data Preview hiển thị đúng tên và avatar
   - ✅ Không có field nào bị `undefined` hoặc `null`

### Test 2: Kiểm tra Elements trong trang thực

1. **Mở trang messages** (student hoặc tutor)
2. **Mở Console** (F12)
3. **Copy-paste file**: `frontend/test-check-elements.js` vào console và Enter
4. **Kiểm tra output**:
   - ✅ Tất cả elements phải được tìm thấy (checkmark xanh)
   - ✅ Test assignments hoạt động
   - ❌ Nếu có element nào NOT FOUND → Kiểm tra HTML

### Test 3: Test thực tế giữa 2 user

1. **User A** (Caller):
   - Đăng nhập và mở messages
   - Mở Console (F12)
   - Gọi User B

2. **User B** (Recipient):
   - Đăng nhập và mở messages  
   - Mở Console (F12) → XEM LOG TẠI ĐÂY!
   - Khi incoming call xuất hiện, kiểm tra console:

   ```
   📞 Received incoming call data: { ... }
     - callerId: "xxx"
     - callerName: "Giảng viên Hồng"  ← PHẢI CÓ TÊN THẬT
     - callerAvatar: "http://..."       ← PHẢI CÓ URL
     - callerRole: "tutor"
     - callType: "video"
   
   🎨 showIncomingCall called with data: { ... }
     - callerName: "Giảng viên Hồng"
     - callerAvatar: "http://..."
   ✅ Pre-set activeCallName: Giảng viên Hồng
   ✅ Pre-set activeCallAvatar: http://...
   ```

3. **User B nhấn Accept**:
   - Console sẽ hiển thị:
   ```
   📞 Accepting call from: { ... }
   ✅ Set active call name: Giảng viên Hồng
   ✅ Set active call avatar: http://...
   ```

4. **Kiểm tra UI**:
   - ✅ Góc trên-trái màn hình hiển thị tên và avatar đúng
   - ❌ Nếu vẫn thấy "UN" hoặc "Unknown User" → GỬI SCREENSHOT CONSOLE CHO TÔI

## Các file test đã tạo

### 1. `test-webrtc-debug.html`
- Tool debug độc lập, không cần backend thực
- Mô phỏng incoming call event
- Hiển thị data chi tiết
- Logging đầy đủ

### 2. `test-check-elements.js`
- Script kiểm tra DOM elements
- Test assignments
- Tìm missing elements

## Checklist Debug

- [ ] Backend có gửi `callerName` và `callerAvatar` trong event `incoming_call`?
- [ ] Frontend `handleIncomingCall()` nhận đầy đủ data?
- [ ] `showIncomingCall()` được gọi với data đầy đủ?
- [ ] Elements `activeCallName` và `activeCallAvatar` tồn tại trong HTML?
- [ ] Elements được set giá trị trong `showIncomingCall()`?
- [ ] `acceptIncomingCall()` không ghi đè giá trị đã set?
- [ ] Console không có lỗi JavaScript?

## Expected Console Output (User B - Recipient)

Khi nhận call từ "Giảng viên Hồng":

```javascript
📞 Received incoming call data: {
  callerId: "678c123456789...",
  callerName: "Giảng viên Hồng",        // ← MUST HAVE
  callerAvatar: "http://localhost:5000/uploads/avatars/...",  // ← MUST HAVE
  callerRole: "tutor",
  offer: { type: "offer", sdp: "..." },
  callType: "video",
  timestamp: "2025-01-06T..."
}
  - callerId: 678c123456789...
  - callerName: Giảng viên Hồng          // ← CHECK THIS
  - callerAvatar: http://localhost:5000/...  // ← CHECK THIS
  - callerRole: tutor
  - callType: video

🎨 showIncomingCall called with data: {...}
  - callerName: Giảng viên Hồng
  - callerAvatar: http://localhost:5000/...
✅ Pre-set activeCallName: Giảng viên Hồng    // ← CRITICAL
✅ Pre-set activeCallAvatar: http://...        // ← CRITICAL
```

## Nếu vẫn không hoạt động

Gửi cho tôi:
1. **Screenshot Console** của User B khi nhận call
2. **Screenshot UI** showing "UN" or "Unknown User"
3. **Network tab** - Kiểm tra avatar URL có load được không
4. Kết quả của `test-check-elements.js`

## Backend Verification

File: `backend/src/socket/socketHandler.js`

Đã verify:
```javascript
io.to(`user:${recipientId}`).emit('incoming_call', {
  callerId: userId,
  callerName: caller.name,      // ✅ Correct
  callerAvatar: caller.avatar,  // ✅ Correct
  callerRole: caller.role,      // ✅ Correct
  offer,
  callType,
  timestamp: new Date()
});
```

Backend logging:
```
✅ Caller found: Giảng viên Hồng
✅ Recipient found: [recipient name]
✅ Call notification sent to user:[recipientId]
```

## Files Modified

1. `frontend/assets/js/messages.js`:
   - `handleIncomingCall()` - Added detailed logging
   - `showIncomingCall()` - **CRITICAL FIX**: Pre-set active call info
   - `acceptIncomingCall()` - Enhanced logging and fallbacks

2. Files Created:
   - `frontend/test-webrtc-debug.html` - Debug tool
   - `frontend/test-check-elements.js` - Element checker
   - `frontend/docs/WEBRTC_CALL_DEBUG.md` - This file

## Solution Summary

**Before**: 
- `showIncomingCall()` only set incoming modal
- When accepting, switched to active modal with placeholder data
- Result: "UN" or "Unknown User" displayed

**After**:
- `showIncomingCall()` now sets BOTH incoming and active modals
- Active call info is ready BEFORE switching modals
- Result: Real name and avatar should display correctly

**Key Insight**: The issue wasn't with data transmission or socket events - it was with UI state management. We were switching modals without copying the data over!
