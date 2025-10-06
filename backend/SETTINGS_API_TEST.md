# Settings API Testing Guide

## Test Settings API Endpoints

### Prerequisites
- Backend server running on `http://localhost:5000`
- Valid JWT token (get from login)

### Get Your Token
1. Login to get token:
```bash
# Student login
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"nhoag824@gmail.com\",\"password\":\"your_password\"}"

# Tutor login
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"hoangaccins1@gmail.com\",\"password\":\"your_password\"}"
```

### Test Endpoints (Replace YOUR_TOKEN with actual token)

#### 1. Get Preferences
```bash
curl -X GET http://localhost:5000/api/settings/preferences -H "Authorization: Bearer YOUR_TOKEN"
```

#### 2. Update Preferences
```bash
curl -X PUT http://localhost:5000/api/settings/preferences ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"preferences\":{\"language\":\"vi\",\"theme\":\"dark\",\"emailNotifications\":{\"newMessages\":true,\"newRequests\":true}}}"
```

#### 3. Update Account Info
```bash
curl -X PUT http://localhost:5000/api/settings/account ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"displayName\":\"Test User\",\"phone\":\"0123456789\",\"language\":\"vi\"}"
```

#### 4. Change Password
```bash
curl -X POST http://localhost:5000/api/settings/change-password ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"currentPassword\":\"old_password\",\"newPassword\":\"new_password123\"}"
```

#### 5. Get Security Settings
```bash
curl -X GET http://localhost:5000/api/settings/security -H "Authorization: Bearer YOUR_TOKEN"
```

#### 6. Toggle 2FA
```bash
curl -X POST http://localhost:5000/api/settings/2fa/toggle ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"enabled\":true}"
```

#### 7. Logout All Devices
```bash
curl -X POST http://localhost:5000/api/settings/logout-all -H "Authorization: Bearer YOUR_TOKEN"
```

#### 8. Request Data Download
```bash
curl -X POST http://localhost:5000/api/settings/download-data -H "Authorization: Bearer YOUR_TOKEN"
```

#### 9. Clear History
```bash
curl -X DELETE http://localhost:5000/api/settings/clear-history -H "Authorization: Bearer YOUR_TOKEN"
```

#### 10. Deactivate Account (Be Careful!)
```bash
curl -X POST http://localhost:5000/api/settings/deactivate -H "Authorization: Bearer YOUR_TOKEN"
```

#### 11. Delete Account (DANGEROUS!)
```bash
curl -X DELETE http://localhost:5000/api/settings/delete-account -H "Authorization: Bearer YOUR_TOKEN"
```

## Testing from Frontend

1. Open browser console (F12)
2. Navigate to Settings page:
   - Student: http://localhost:5173/pages/student/settings.html
   - Tutor: http://localhost:5173/pages/tutor/settings.html
   - Admin: http://localhost:5173/pages/admin/settings.html

3. Check console for any errors
4. Test features:
   - Toggle switches (notifications, privacy)
   - Update account info
   - Change password
   - View tabs

## Expected Responses

### Success Response
```json
{
  "success": true,
  "message": "Success message here",
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message here"
}
```

## Common Issues

### 401 Unauthorized
- Token expired or invalid
- Solution: Login again to get new token

### 404 Not Found
- Route doesn't exist
- Check URL spelling

### 500 Server Error
- Check server logs
- Verify database connection
- Check User model has preferences field

## Verification Steps

1. ✅ Server starts without errors
2. ✅ All routes registered: `/api/settings/*`
3. ✅ Middleware authenticates correctly
4. ✅ Controller methods work
5. ✅ User model updated with preferences
6. ✅ Frontend loads and displays tabs
7. ✅ Settings save to database
8. ✅ Notifications display correctly

---

**Status:** ✅ Backend running successfully!
**Next Steps:** Test each endpoint and verify frontend integration
