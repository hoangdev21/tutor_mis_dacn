# Dashboard Redesign - Testing Guide

## 📋 Overview

This document provides comprehensive testing instructions for the new student dashboard redesign, which replaces the "Active Requests" section with:
- **Learning Progress Chart** (left): Visual bar chart showing course completion by subject
- **Recent Notifications Panel** (right): Last 10 notifications with type-based styling

---

## 🚀 Quick Start

### 1. Start Backend Server
```bash
cd backend
npm start
# Server should run on http://localhost:3000
```

### 2. Create Sample Data (if needed)
```bash
# Create test student account
node tests/create-test-student.js

# Create sample booking requests
node tests/create-sample-requests.js

# Create sample notifications
node tests/create-sample-notifications.js
```

### 3. Open Dashboard
1. Navigate to: `http://localhost:8000/pages/student/dashboard.html`
2. Login with test credentials:
   - **Email**: `student@test.com`
   - **Password**: `Test123!@#`

---

## ✅ Testing Checklist

### A. Page Load & Layout

- [ ] Dashboard loads without errors
- [ ] Chart.js CDN loads successfully (check Network tab)
- [ ] Page displays 2-column grid layout:
  - Left column: Learning progress chart + stats cards
  - Right column: Notifications panel
- [ ] Active Requests section is NOT visible
- [ ] Courses and Messages sections still display correctly

### B. Learning Progress Chart

#### Visual Elements
- [ ] Chart renders inside the left column
- [ ] Chart displays as a bar chart (not line/pie/etc.)
- [ ] Chart has two datasets:
  - Green bars: "Hoàn thành" (Completed)
  - Blue bars: "Đang học" (Active/In Progress)
- [ ] X-axis shows subject names (Toán, Vật lý, etc.)
- [ ] Y-axis shows course count (starts at 0)
- [ ] Legend displays at the top
- [ ] Chart is responsive (max-height: 300px)

#### Stats Cards
- [ ] Three stats cards display above the chart:
  - **Card 1** (Purple gradient): Total hours
  - **Card 2** (Green gradient): Completed hours
  - **Card 3** (Blue gradient): Progress percentage
- [ ] Numbers are accurate (not NaN or undefined)
- [ ] Cards have gradient backgrounds

#### Edge Cases
- [ ] If no bookings exist, displays "Chưa có dữ liệu" message
- [ ] Chart handles zero values gracefully

### C. Notifications Panel

#### Visual Elements
- [ ] Panel displays in the right column
- [ ] Shows up to 10 most recent notifications
- [ ] Each notification card has:
  - Icon (circle background with Font Awesome icon)
  - Title (bold if unread, normal if read)
  - Message text (2-line clamp)
  - Timestamp with "fa-clock" icon
  - Left border colored by notification type
  - Blue dot indicator (only for unread)

#### Notification Types & Colors
Verify each type displays correct icon and color:

| Type | Icon | Color | Border Color |
|------|------|-------|--------------|
| `booking_request` | fa-calendar-plus | Blue | #3b82f6 |
| `booking_accepted` | fa-calendar-check | Green | #10b981 |
| `booking_rejected` | fa-calendar-times | Red | #ef4444 |
| `booking_completed` | fa-trophy | Orange | #f59e0b |
| `booking_cancelled` | fa-calendar-xmark | Gray | #6b7280 |
| `message_received` | fa-envelope | Purple | #8b5cf6 |
| `system` | fa-info-circle | Gray | #6b7280 |

#### Background Colors
- [ ] Unread notifications: Light blue (#eff6ff)
- [ ] Read notifications: Light gray (#f9fafb)
- [ ] Hover effect: Changes to #f1f5f9

#### Timestamps
- [ ] Shows relative time (e.g., "2 giờ trước", "1 ngày trước")
- [ ] Updates correctly based on `createdAt` field

#### Edge Cases
- [ ] If no notifications exist, displays empty state:
  - Bell-slash icon (fa-bell-slash)
  - "Chưa có thông báo" heading
  - "Các thông báo mới sẽ xuất hiện ở đây" message

### D. Notification Click Functionality

- [ ] Clicking unread notification triggers `markNotificationAsRead()`
- [ ] API call sent to `PUT /api/notifications/:id/read`
- [ ] After click, notification:
  - Background changes from #eff6ff to #f9fafb
  - Blue dot indicator disappears
  - Title font-weight changes from 700 to 600
- [ ] Clicking read notification does nothing (already marked)
- [ ] Dashboard reloads to show updated state

### E. Backend API Responses

#### Dashboard API (`GET /api/student/dashboard`)
Check in Network tab → Response:
```json
{
  "success": true,
  "data": {
    "stats": { ... },
    "learningProgress": {
      "totalHours": 20,
      "completedHours": 8,
      "progressPercentage": 40,
      "subjectProgress": [
        {
          "subject": "Toán",
          "total": 5,
          "completed": 2,
          "active": 3,
          "progress": 40
        }
      ]
    },
    "recentNotifications": [
      {
        "_id": "...",
        "type": "booking_accepted",
        "title": "Yêu cầu đặt lịch được chấp nhận",
        "message": "...",
        "isRead": false,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "recentCourses": [ ... ],
    "recentMessages": [ ... ]
  }
}
```

**Verify:**
- [ ] `learningProgress` object exists
- [ ] `subjectProgress` is an array with at least 1 item
- [ ] `recentNotifications` is an array
- [ ] All notification types are valid enum values
- [ ] `isRead` is boolean
- [ ] `createdAt` is valid ISO date string

#### Notification Mark Read API (`PUT /api/notifications/:id/read`)
**Request:**
```
PUT /api/notifications/67896d2b3f1e4a0012345678/read
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "success": true,
  "message": "Đã đánh dấu đã đọc",
  "data": {
    "notification": { ... },
    "unreadCount": 2
  }
}
```

**Verify:**
- [ ] Returns 200 status
- [ ] `success` is true
- [ ] `unreadCount` decreases by 1

### F. Browser Console

- [ ] No JavaScript errors
- [ ] No 404 errors for Chart.js CDN
- [ ] No authentication errors (401/403)
- [ ] Logs show:
  ```
  📊 Rendering learning progress chart: {...}
  🔔 Rendering recent notifications: [...]
  ⚠️ renderActiveRequests called but is deprecated
  ```

---

## 🐛 Common Issues & Solutions

### Issue 1: Chart.js Not Loading
**Symptoms:** Chart doesn't render, console error: `Chart is not defined`

**Solutions:**
1. Check Network tab → Verify Chart.js CDN loaded (status 200)
2. Verify CDN URL in `<head>`: 
   ```html
   <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
   ```
3. Check if script is loaded BEFORE `student-dashboard.js`

### Issue 2: Notifications Not Displaying
**Symptoms:** Empty state shows even though notifications exist

**Solutions:**
1. Check API response in Network tab
2. Verify backend query uses `recipient` field (not `userId`)
3. Check MongoDB: `db.notifications.find({ recipient: ObjectId(...) })`
4. Run: `node tests/create-sample-notifications.js`

### Issue 3: Notification Icons Missing
**Symptoms:** Icons show as squares or don't display

**Solutions:**
1. Verify Font Awesome CDN in dashboard.html:
   ```html
   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
   ```
2. Check if notification type is valid enum value
3. Verify `typeIcons` mapping in student-dashboard.js

### Issue 4: Chart Shows No Data
**Symptoms:** Chart area is blank or shows "Chưa có dữ liệu"

**Solutions:**
1. Verify test bookings exist: `node tests/create-sample-requests.js`
2. Check aggregation pipeline returns data
3. Inspect API response: `learningProgress.subjectProgress` should be non-empty array
4. Verify booking status is `accepted` or `completed`

### Issue 5: Click Not Marking as Read
**Symptoms:** Clicking notification doesn't change UI

**Solutions:**
1. Check Network tab → Verify PUT request sent
2. Check API response: should return `success: true`
3. Verify token is valid (not expired)
4. Check `markNotificationAsRead()` function is defined
5. Verify notification ID is correct in onclick handler

---

## 🧪 Automated Testing Script

Create a test automation script (optional):

```javascript
// tests/test-dashboard-ui.js
const puppeteer = require('puppeteer');

async function testDashboard() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Login
  await page.goto('http://localhost:8000/pages/student/dashboard.html');
  await page.type('input[name="email"]', 'student@test.com');
  await page.type('input[name="password"]', 'Test123!@#');
  await page.click('button[type="submit"]');
  
  // Wait for dashboard to load
  await page.waitForSelector('#learningProgressChart', { timeout: 5000 });
  
  // Test 1: Chart exists
  const chartExists = await page.$('#learningProgressChart');
  console.log('✅ Chart canvas exists:', !!chartExists);
  
  // Test 2: Notifications exist
  const notifExists = await page.$('#notificationsContainer');
  console.log('✅ Notifications container exists:', !!notifExists);
  
  // Test 3: Active Requests removed
  const requestsRemoved = !(await page.$('#requestsContainer'));
  console.log('✅ Active Requests section removed:', requestsRemoved);
  
  // Test 4: Click notification
  const firstNotif = await page.$('.notification-item');
  if (firstNotif) {
    await firstNotif.click();
    console.log('✅ Clicked first notification');
  }
  
  await browser.close();
}

testDashboard().catch(console.error);
```

**Run:**
```bash
npm install puppeteer --save-dev
node tests/test-dashboard-ui.js
```

---

## 📊 Expected Results

### Success Criteria
- [x] Chart.js loads without errors
- [x] Learning progress chart displays with bars
- [x] Stats cards show correct values
- [x] Notifications render with proper styling
- [x] Click marks notification as read
- [x] No console errors
- [x] API responses match schema
- [x] Active Requests section removed

### Performance Benchmarks
- **Page Load Time**: < 2 seconds
- **Chart Render Time**: < 500ms
- **API Response Time**: < 300ms
- **Notification Click Response**: < 200ms

---

## 📝 Test Report Template

Copy this template for testing sessions:

```
## Dashboard Redesign Test Report

**Date:** YYYY-MM-DD
**Tester:** Your Name
**Browser:** Chrome/Firefox/Safari Version X
**Environment:** Local/Staging/Production

### Test Results

#### A. Page Load & Layout
- [ ] PASS / FAIL - Dashboard loads
- [ ] PASS / FAIL - 2-column grid layout
- [ ] PASS / FAIL - Active Requests removed

#### B. Learning Progress Chart
- [ ] PASS / FAIL - Chart renders
- [ ] PASS / FAIL - Shows completed/active bars
- [ ] PASS / FAIL - Stats cards display

#### C. Notifications Panel
- [ ] PASS / FAIL - Notifications display
- [ ] PASS / FAIL - Correct icons/colors
- [ ] PASS / FAIL - Unread indicator works

#### D. Functionality
- [ ] PASS / FAIL - Click marks as read
- [ ] PASS / FAIL - UI updates correctly

#### E. API Responses
- [ ] PASS / FAIL - Dashboard API correct
- [ ] PASS / FAIL - Mark read API works

#### F. Console
- [ ] PASS / FAIL - No errors

### Issues Found
1. Issue description
2. Steps to reproduce
3. Expected vs Actual behavior

### Screenshots
[Attach screenshots of bugs]

### Overall Result: PASS / FAIL
```

---

## 🎯 Next Steps

After all tests pass:
1. ✅ Mark todo #8 as completed
2. ✅ Mark todo #9 as completed
3. 📝 Update README with new dashboard features
4. 🚀 Deploy to staging environment
5. 👥 Request user acceptance testing

---

## 📚 Related Documentation

- [STUDENT_DASHBOARD_FIX_SUMMARY.md](./STUDENT_DASHBOARD_FIX_SUMMARY.md) - Original bug fix documentation
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - API endpoints and data structures
- [Notification Model](../src/models/Notification.js) - Notification schema
- [Student Controller](../src/controllers/studentController.js) - Dashboard API logic

---

**Last Updated:** 2024-01-15  
**Version:** 2.0 (Dashboard Redesign)
