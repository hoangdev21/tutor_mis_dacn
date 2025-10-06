# 🔧 Quick Fix: Ringtone Playing During Call

## Vấn đề
Chuông ringtone tiếp tục phát **trong lúc đang gọi** sau khi đã accept.

## Nguyên nhân
`onRemoteStream` callback KHÔNG CÓ lệnh tắt chuông!

## Giải pháp

### 1. Thêm `stopRingtone()` vào `onRemoteStream`:
```javascript
webrtcService.onRemoteStream = (stream) => {
  // CRITICAL: Stop ringtone immediately when remote stream arrives
  stopRingtone();
  console.log('🔕 Remote stream received, stopping all ringtones');
  
  // ... rest of code
};
```

### 2. Thêm `stopRingtone()` vào `onStateChange`:
```javascript
webrtcService.onStateChange = (state) => {
  console.log('Call state changed:', state);
  
  // Stop ringtone when call is connected
  if (state === 'connected') {
    stopRingtone();
    console.log('🔕 Call connected, ensuring ringtones stopped');
  }
};
```

## Kết quả

**Trước khi sửa:**
- Accept call → Ringtone vẫn phát ❌
- Remote stream arrives → Ringtone vẫn phát ❌
- Call connected → Ringtone vẫn phát ❌

**Sau khi sửa:**
- Accept call → Ringtone dừng ✅
- Remote stream arrives → Ringtone dừng (lần 2) ✅
- Call connected → Ringtone dừng (lần 3) ✅

## Cách test

1. **Refresh cả 2 trang** (Ctrl + F5)
2. User A gọi User B
3. User B nghe thấy chuông
4. User B nhấn Accept
5. **Kiểm tra:** Chuông phải TẮT NGAY, không phát trong lúc gọi

## Console log mong đợi

```
🔔 Playing ringtone...
📞 Accepting call from: ...
🔕 Stopping ringtone...
🔕 Remote stream received, stopping all ringtones  ← MỚI
✅ Remote stream set with audio enabled
Call state changed: connected
🔕 Call connected, ensuring ringtones stopped  ← MỚI
```

## Files sửa

✅ `frontend/assets/js/messages.js` - 2 chỗ thêm `stopRingtone()`

## Lưu ý

- Không cần restart backend
- Chỉ cần refresh frontend
- Chuông sẽ tắt tại 3 điểm khác nhau (đảm bảo an toàn)
