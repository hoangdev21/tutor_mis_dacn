# 🔧 FIX: User Info Not Displaying (Second User Shows "UN")

## ❌ Vấn đề
User 1 (caller) thấy tên đúng: "Giảng viên Hồng"  
User 2 (recipient) chỉ thấy: "Unknown User" hoặc avatar "UN"

## ✅ Nguyên nhân & Giải pháp

**Root Cause**: `showIncomingCall()` chỉ set info cho **incoming modal**, KHÔNG set cho **active modal**.

**Fix**: Pre-set `activeCallName` và `activeCallAvatar` NGAY KHI incoming call đến (trong `showIncomingCall()`).

## 📝 Code Changes

### File: `frontend/assets/js/messages.js`

#### Function: `showIncomingCall(data)`
```javascript
// OLD: Chỉ set incoming modal
document.getElementById('incomingCallerName').textContent = data.callerName;

// NEW: Set CẢ active modal luôn
const activeCallName = document.getElementById('activeCallName');
if (activeCallName) {
  activeCallName.textContent = data.callerName || 'Unknown User';
  console.log('✅ Pre-set activeCallName:', activeCallName.textContent);
}
```

#### Function: `handleIncomingCall(data)`
Added detailed logging:
```javascript
console.log('📞 Received incoming call data:', data);
console.log('  - callerName:', data.callerName);
console.log('  - callerAvatar:', data.callerAvatar);
```

#### Function: `acceptIncomingCall()`
Enhanced with logging and fallbacks.

## 🧪 Testing

### Quick Test trong Console (F12):
```javascript
// Kiểm tra elements tồn tại
console.log('activeCallName:', document.getElementById('activeCallName'));
console.log('activeCallAvatar:', document.getElementById('activeCallAvatar'));

// Test set giá trị
document.getElementById('activeCallName').textContent = 'TEST NAME';
document.getElementById('activeCallAvatar').src = 'https://ui-avatars.com/api/?name=Test';
```

### Test với Debug Tool:
1. Mở: http://localhost:8080/test-webrtc-debug.html
2. Click "Login" → "Connect Socket" → "Trigger Incoming Call"
3. Xem logs và preview

### Test thực tế:
1. User B (recipient) mở Console (F12)
2. User A gọi User B
3. User B kiểm tra console log:
   ```
   📞 Received incoming call data: ...
     - callerName: "Giảng viên Hồng"  ← PHẢI CÓ
   🎨 showIncomingCall called...
   ✅ Pre-set activeCallName: Giảng viên Hồng  ← PHẢI THẤY
   ```
4. User B nhấn Accept
5. Kiểm tra góc trên-trái màn hình → Phải hiển thị tên đúng

## 📁 Files

### Modified:
- `frontend/assets/js/messages.js` - Main fix

### Created (for debugging):
- `frontend/test-webrtc-debug.html` - Debug tool
- `frontend/test-check-elements.js` - Element checker  
- `frontend/docs/WEBRTC_CALL_DEBUG.md` - Full guide

## 🎯 Expected Result

**Before Fix**:
```
Incoming: "Giảng viên Hồng" ✅
Accept → Active: "Unknown User" ❌
```

**After Fix**:
```
Incoming: "Giảng viên Hồng" ✅
Accept → Active: "Giảng viên Hồng" ✅
```

## 🚨 If Still Not Working

Gửi screenshot của:
1. Console log khi nhận call (User B)
2. UI showing "UN"
3. Kết quả chạy `test-check-elements.js`

## 💡 Key Insight

Issue không phải ở backend hay socket - backend GỬI ĐÚNG data.  
Issue là **UI state management** - không copy data khi switch modal!

Solution: **Pre-populate** active modal info TRƯỚC KHI cần dùng.
