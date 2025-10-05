# User Online Status Feature - Implementation Summary

## 📋 Tổng Quan

Tính năng hiển thị trạng thái online/offline và "last seen" (hoạt động lần cuối) của người dùng trong hệ thống tin nhắn messenger.

**Trạng thái hiển thị:**
- ✅ **Đang hoạt động** - User đang online
- ⏰ **Vừa xong** - Hoạt động < 1 phút trước
- ⏰ **Hoạt động X phút trước** - 1-59 phút
- ⏰ **Hoạt động X giờ trước** - 1-23 giờ
- ⏰ **Hoạt động X ngày trước** - 1-6 ngày
- ⏰ **Hoạt động [ngày/tháng]** - > 7 ngày
- ❌ **Không hoạt động** - Không có thông tin lastSeen

---

## 🔧 Backend Changes

### 1. User Model (User.js)
**File:** `backend/src/models/User.js`

**Thêm trường:**
```javascript
lastSeen: {
  type: Date,
  default: Date.now
}
```

**Mục đích:** Lưu thời gian hoạt động cuối cùng của user vào database.

---

### 2. Socket Handler (socketHandler.js)
**File:** `backend/src/socket/socketHandler.js`

**Thay đổi:**

#### 2.1. Khi user connect (online):
```javascript
// Update lastSeen in database to current time (user is now online)
await User.findByIdAndUpdate(userId, { 
  lastSeen: new Date(),
  lastLogin: new Date()
});

// Broadcast user online status with lastSeen
io.emit('user_online', { 
  userId,
  lastSeen: new Date()
});
```

#### 2.2. Khi user disconnect (offline):
```javascript
// Update lastSeen in database
const lastSeenTime = new Date();
await User.findByIdAndUpdate(userId, { 
  lastSeen: lastSeenTime
});

// Broadcast user offline status with lastSeen time
io.emit('user_offline', { 
  userId,
  lastSeen: lastSeenTime
});
```

**Mục đích:** 
- Cập nhật thời gian lastSeen vào database khi user online/offline
- Emit events với thông tin lastSeen để frontend có thể cập nhật real-time

---

### 3. Message Controller (messageController.js)
**File:** `backend/src/controllers/messageController.js`

**Thêm 2 endpoints mới:**

#### 3.1. Get Single User Status
```javascript
// @desc    Get user online status and lastSeen
// @route   GET /api/messages/user-status/:userId
// @access  Private
const getUserStatus = async (req, res) => {
  const { userId } = req.params;
  
  // Get user's lastSeen from database
  const user = await User.findById(userId).select('lastSeen name avatar');
  
  // Check if user is currently online via Socket.IO
  const { isUserOnline } = require('../socket/socketHandler');
  const isOnline = isUserOnline(userId);

  res.json({
    success: true,
    data: {
      userId: user._id,
      name: user.name,
      avatar: user.avatar,
      isOnline,
      lastSeen: user.lastSeen
    }
  });
};
```

#### 3.2. Get Multiple Users Status (Batch)
```javascript
// @desc    Get multiple users status (batch request)
// @route   POST /api/messages/users-status
// @access  Private
const getUsersStatus = async (req, res) => {
  const { userIds } = req.body;
  
  // Get users' lastSeen from database
  const users = await User.find({ _id: { $in: validUserIds } })
    .select('lastSeen name avatar');

  // Map users with their online status
  const usersStatus = users.map(user => ({
    userId: user._id,
    name: user.name,
    avatar: user.avatar,
    isOnline: isUserOnline(user._id.toString()),
    lastSeen: user.lastSeen
  }));

  res.json({
    success: true,
    data: usersStatus
  });
};
```

**Mục đích:** 
- Cung cấp API để frontend query trạng thái user
- Support cả single và batch requests để tối ưu performance

---

### 4. Routes (messages.js)
**File:** `backend/src/routes/messages.js`

**Thêm routes:**
```javascript
// Get single user status
router.get('/user-status/:userId', getUserStatus);

// Get multiple users status
router.post('/users-status', getUsersStatus);
```

---

## 🎨 Frontend Changes

### 1. Messages JavaScript (messages.js)
**File:** `frontend/assets/js/messages.js`

#### 1.1. Thêm biến global:
```javascript
let messageSocket = null;
```

#### 1.2. Format Last Seen Function:
```javascript
/**
 * Format lastSeen time to human readable string
 * @param {Date|string} lastSeen - Last seen timestamp
 * @param {boolean} isOnline - Whether user is currently online
 * @returns {string} Formatted status text
 */
function formatLastSeen(lastSeen, isOnline) {
  if (isOnline) {
    return 'Đang hoạt động';
  }
  
  if (!lastSeen) {
    return 'Không hoạt động';
  }
  
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffMs = now - lastSeenDate;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMinutes < 1) {
    return 'Vừa xong';
  } else if (diffMinutes < 60) {
    return `Hoạt động ${diffMinutes} phút trước`;
  } else if (diffHours < 24) {
    return `Hoạt động ${diffHours} giờ trước`;
  } else if (diffDays < 7) {
    return `Hoạt động ${diffDays} ngày trước`;
  } else {
    return `Hoạt động ${lastSeenDate.toLocaleDateString('vi-VN')}`;
  }
}
```

#### 1.3. Update User Status Display:
```javascript
/**
 * Update user status display in chat header
 */
function updateUserStatusDisplay(userId, isOnline, lastSeen) {
  // Only update if this is the current conversation
  if (!currentRecipient || currentRecipient._id !== userId) {
    return;
  }
  
  const statusElement = document.querySelector('.chat-header .chat-status');
  if (!statusElement) {
    return;
  }
  
  const statusText = formatLastSeen(lastSeen, isOnline);
  statusElement.textContent = statusText;
  
  // Update status indicator color
  const statusIndicator = document.querySelector('.chat-header .status-indicator');
  if (statusIndicator) {
    if (isOnline) {
      statusIndicator.classList.add('online');
      statusIndicator.classList.remove('offline');
    } else {
      statusIndicator.classList.add('offline');
      statusIndicator.classList.remove('online');
    }
  }
}
```

#### 1.4. Fetch and Display User Status:
```javascript
/**
 * Fetch and display user status from API
 */
async function fetchAndDisplayUserStatus(userId) {
  try {
    const response = await apiRequest(`/messages/user-status/${userId}`, {
      method: 'GET'
    });
    
    if (response.success && response.data) {
      updateUserStatusDisplay(
        response.data.userId,
        response.data.isOnline,
        response.data.lastSeen
      );
    }
  } catch (error) {
    console.error('Error fetching user status:', error);
  }
}
```

#### 1.5. Initialize Socket.IO:
```javascript
/**
 * Initialize Socket.IO connection for real-time updates
 */
async function initializeSocket() {
  try {
    // Load Socket.IO client script
    if (typeof MessageSocket === 'undefined') {
      await loadScript('/assets/js/messages-socket.js');
    }
    
    // Create socket instance
    messageSocket = new MessageSocket(API_BASE_URL);
    
    // Setup callbacks for online/offline events
    messageSocket.onUserOnline = (data) => {
      console.log('🟢 User came online:', data);
      if (data.userId) {
        updateUserStatusDisplay(data.userId, true, data.lastSeen || new Date());
      }
    };
    
    messageSocket.onUserOffline = (data) => {
      console.log('⚫ User went offline:', data);
      if (data.userId) {
        updateUserStatusDisplay(data.userId, false, data.lastSeen || new Date());
      }
    };
    
    // Connect to socket
    await messageSocket.connect();
  } catch (error) {
    console.error('Error initializing socket:', error);
  }
}
```

#### 1.6. Update in DOMContentLoaded:
```javascript
document.addEventListener('DOMContentLoaded', async () => {
  checkAuthentication();
  await loadConversations();
  setupEventListeners();
  startMessagePolling();
  
  // Initialize Socket.IO for real-time updates
  await initializeSocket();
  
  ensureEmptyStateDisplay();
  await checkAndOpenConversation();
});
```

#### 1.7. Update in updateRecipientInfo():
```javascript
function updateRecipientInfo() {
  // ... existing code ...
  
  // Fetch and update real-time user status
  if (currentRecipient && currentRecipient._id) {
    fetchAndDisplayUserStatus(currentRecipient._id);
  }
}
```

#### 1.8. Simplify getStatusText():
```javascript
function getStatusText(user) {
  if (!user) return 'Không hoạt động';
  return formatLastSeen(user.lastSeen || user.lastLogin, user.isOnline);
}
```

---

### 2. HTML Updates
**Files:** 
- `frontend/pages/tutor/messages.html`
- `frontend/pages/student/messages.html`

**Thay đổi:**
```html
<!-- Thêm class "chat-status" để dễ dàng target element -->
<span id="chatUserStatus" class="user-status chat-status offline">Không hoạt động</span>
```

---

## 🧪 Testing

### Test File
**File:** `frontend/tests/test-user-status.html`

**4 Test Cases:**

1. **Format Last Seen Function**
   - Test với nhiều timestamps khác nhau
   - Verify output format đúng

2. **User Status API**
   - Test GET `/api/messages/user-status/:userId`
   - Verify response structure
   - Test với current user

3. **Socket.IO Events**
   - Test kết nối Socket.IO
   - Monitor `user_online` và `user_offline` events
   - Verify real-time updates

4. **Real-time Status Display**
   - Monitor user status với polling
   - Test auto-refresh every 3 seconds
   - Verify UI updates correctly

### Cách Test:

1. Start backend server:
```bash
cd backend
npm start
```

2. Open test file:
```
http://localhost:5000/tests/test-user-status.html
```

3. Login trước để có token

4. Run các tests theo thứ tự:
   - Test 1 tự động chạy khi load page
   - Test 2: Nhập User ID hoặc click "Test Current User"
   - Test 3: Click "Connect Socket" để kết nối Socket.IO
   - Test 4: Nhập User ID và click "Start Monitoring"

---

## 🔄 Data Flow

### 1. User Goes Online:
```
User connects → Socket.IO → Update DB (lastSeen = now)
              → Emit 'user_online' → All clients receive
              → Frontend updates UI
```

### 2. User Goes Offline:
```
User disconnects → Socket.IO → Update DB (lastSeen = now)
                → Emit 'user_offline' → All clients receive
                → Frontend updates UI with lastSeen time
```

### 3. View Conversation:
```
User selects conversation → Frontend calls getUserStatus API
                          → Backend returns isOnline + lastSeen
                          → Frontend displays status
                          → Socket.IO monitors real-time changes
```

---

## 🎯 Key Features

### ✅ Chính Xác Tuyệt Đối
- Lưu lastSeen vào database mỗi khi user online/offline
- Query real-time online status từ Socket.IO onlineUsers map
- Kết hợp cả DB persistence và in-memory state

### ✅ Real-time Updates
- Socket.IO events broadcast ngay lập tức
- Frontend tự động cập nhật UI không cần refresh
- Support multiple tabs/devices

### ✅ Performance Optimized
- Batch API endpoint cho multiple users
- Socket.IO chỉ emit events khi có thay đổi
- Efficient database queries với select projection

### ✅ User Experience
- Hiển thị thời gian relative (5 phút trước, 2 giờ trước)
- Visual indicators (green dot = online, gray = offline)
- Smooth transitions và animations

---

## 📝 Notes

### Database Schema
- User model đã có field `lastSeen` với default value `Date.now`
- Existing users sẽ có lastSeen = createdAt nếu chưa update

### Socket.IO Integration
- File `messages-socket.js` đã có sẵn infrastructure
- Chỉ cần thêm callbacks cho onUserOnline/onUserOffline

### CSS Styling
- File `messages.css` đã có styles cho `.online-indicator` và `.user-status`
- Không cần thay đổi CSS

### Backward Compatibility
- Fallback to `lastLogin` nếu `lastSeen` không có
- Hiển thị "Không hoạt động" nếu cả 2 đều null

---

## 🚀 Next Steps (Optional Improvements)

1. **Typing Indicators:**
   - Hiển thị "Đang nhập..." khi user đang type

2. **Online Users List:**
   - Sidebar hiển thị danh sách users đang online

3. **Last Seen Privacy:**
   - Settings để user có thể ẩn last seen

4. **Read Receipts:**
   - Hiển thị "Đã xem lúc X" cho tin nhắn

5. **Push Notifications:**
   - Notify khi user đang waiting comes online

---

## 🐛 Troubleshooting

### Issue: Status không cập nhật
**Solution:** 
- Check Socket.IO connection
- Verify token authentication
- Check browser console for errors

### Issue: "Không hoạt động" luôn hiển thị
**Solution:**
- Check API response có trả về lastSeen không
- Verify database có field lastSeen
- Check formatLastSeen function logic

### Issue: Socket events không fire
**Solution:**
- Verify Socket.IO server đang chạy
- Check CORS settings
- Verify token đúng format

---

## ✅ Summary

**Backend:**
- ✅ User model: thêm lastSeen field
- ✅ Socket handler: cập nhật lastSeen khi connect/disconnect
- ✅ Message controller: 2 endpoints mới (getUserStatus, getUsersStatus)
- ✅ Routes: thêm routes cho status APIs

**Frontend:**
- ✅ formatLastSeen: function format thời gian human-readable
- ✅ updateUserStatusDisplay: cập nhật UI với status mới
- ✅ fetchAndDisplayUserStatus: fetch từ API
- ✅ initializeSocket: khởi tạo Socket.IO với callbacks
- ✅ HTML: thêm class chat-status cho element

**Testing:**
- ✅ test-user-status.html: comprehensive test suite

**Kết quả:** Trạng thái online/offline/last seen hoạt động chính xác, real-time, và user-friendly! 🎉
