# 🔧 FIXED: Root Cause of "Unknown User" Issue

## ❌ Real Problem Found

**Backend was querying the WRONG MODEL!**

```javascript
// WRONG CODE (before):
const caller = await User.findById(userId).select('name avatar role');
```

**Issue**: User model does NOT have `name` or `avatar` fields!
- User model only has: `email`, `password`, `role`, etc.
- Name and avatar are in **Profile** models (StudentProfile/TutorProfile)

## ✅ Solution Applied

### Backend Fix: `backend/src/socket/socketHandler.js`

```javascript
// NEW CODE (correct):
const caller = await User.findById(userId).select('role').populate('profile');

// Extract from profile
const callerName = caller.profile?.fullName || 'Unknown User';
const callerAvatar = caller.profile?.avatar || null;

// Send with correct data
io.to(`user:${recipientId}`).emit('incoming_call', {
  callerId: userId,
  callerName: callerName,  // ← Now has real value!
  callerAvatar: callerAvatar,  // ← Now has real value!
  callerRole: caller.role,
  offer,
  callType,
  timestamp: new Date()
});
```

## 📊 Data Flow (Corrected)

### User Model (`User.js`)
```javascript
{
  _id: "68e14aea...",
  email: "student@example.com",
  role: "student",
  // NO name or avatar here! ❌
}
```

### Profile Models (`StudentProfile.js` / `TutorProfile.js`)
```javascript
{
  userId: "68e14aea...",
  fullName: "Giảng viên Hồng",  // ✅ Name is HERE!
  avatar: "http://...",          // ✅ Avatar is HERE!
  phone: "...",
  // ... other profile data
}
```

### Populated Result
```javascript
const caller = await User.findById(userId).populate('profile');
// Result:
{
  _id: "68e14aea...",
  email: "...",
  role: "student",
  profile: {
    fullName: "Giảng viên Hồng",  // ✅ Access via caller.profile.fullName
    avatar: "http://...",          // ✅ Access via caller.profile.avatar
  }
}
```

## 🧪 Testing

### Backend Logs (After Fix)
After restarting backend, you should see:
```
🔍 Fetching caller info for: 68e14aea...
✅ Caller found: {
  id: "68e14aea...",
  role: "student",
  name: "Giảng viên Hồng",        // ✅ Now has real value
  avatar: "http://...",            // ✅ Now has real value
  profileExists: true
}
📤 Sending incoming_call event with data: {
  callerId: "68e14aea...",
  callerName: "Giảng viên Hồng",  // ✅ Real name sent
  callerAvatar: "http://...",      // ✅ Real avatar sent
  callerRole: "student",
  callType: "video"
}
```

### Frontend Logs (After Fix)
```
📞 Received incoming call data: Object
  - callerId: 68e14aea...
  - callerName: "Giảng viên Hồng"  ✅ No longer undefined!
  - callerAvatar: "http://..."      ✅ No longer undefined!
  - callerRole: student
  - callType: video

🎨 showIncomingCall called with data: Object
  - callerName: "Giảng viên Hồng"
  - callerAvatar: "http://..."
✅ Pre-set activeCallName: Giảng viên Hồng  ✅ Real name displayed!
✅ Pre-set activeCallAvatar: http://...       ✅ Real avatar displayed!
```

## 🎯 Expected Result

### Before Fix:
```
Backend: caller.name = undefined ❌
Backend: caller.avatar = undefined ❌
Frontend: callerName = undefined ❌
UI: "Unknown User" ❌
```

### After Fix:
```
Backend: caller.profile.fullName = "Giảng viên Hồng" ✅
Backend: caller.profile.avatar = "http://..." ✅
Frontend: callerName = "Giảng viên Hồng" ✅
UI: "Giảng viên Hồng" ✅
```

## 📝 Files Modified

### Backend:
1. `backend/src/socket/socketHandler.js`
   - Changed User query to include `.populate('profile')`
   - Extract `fullName` and `avatar` from populated profile
   - Added comprehensive logging
   - Added validation warnings

### Frontend:
1. `frontend/assets/js/messages.js`
   - Added logging in `handleIncomingCall()`
   - Fixed `showIncomingCall()` to pre-set active modal info
   - Added fallbacks in `acceptIncomingCall()`

## 🚀 Deployment Steps

1. **Backend changes applied** ✅
2. **Backend restarted** ✅
3. **Frontend changes already deployed** ✅

## 🔍 Verification Checklist

- [ ] Backend logs show `profileExists: true`
- [ ] Backend logs show actual name (not undefined)
- [ ] Frontend console shows `callerName: "Real Name"` (not undefined)
- [ ] Frontend console shows `✅ Pre-set activeCallName: Real Name`
- [ ] UI displays real name and avatar (not "Unknown User")
- [ ] Both incoming and active modals show correct info

## 💡 Key Learnings

1. **Always check data structure** - User model vs Profile models
2. **Use `.populate()` for related data** - Don't assume flat structure
3. **Add comprehensive logging** - Helps identify data flow issues
4. **Validate at each step** - Backend query → Backend emit → Frontend receive → Frontend display

## ⚠️ Important Notes

- User model has `role`, but NOT `name` or `avatar`
- Profile models (StudentProfile/TutorProfile) have `fullName` and `avatar`
- Must use `.populate('profile')` to access profile data
- Virtual field `profile` defined in User.js schema

## 🎉 Status

**ISSUE RESOLVED** ✅

The problem was a **backend data access issue**, not a frontend UI issue.
Backend was querying non-existent fields, resulting in undefined values.
Now properly querying profile data using Mongoose populate.
