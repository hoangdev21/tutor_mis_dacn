# 🧪 Testing Guide - Collapsible Sidebar Feature

## 📋 Test Checklist

### ✅ **Basic Functionality Tests**

#### 1. Toggle Click Test
- [ ] Click hamburger icon → Sidebar collapses to 80px
- [ ] Click hamburger icon again → Sidebar expands to 280px
- [ ] Icon animates (3 lines → X → 3 lines)
- [ ] Content area adjusts margin accordingly

#### 2. Hover Functionality Test
- [ ] Collapse sidebar using hamburger icon
- [ ] Hover mouse over collapsed sidebar → Expands to 280px
- [ ] Move mouse away → Collapses back to 80px
- [ ] Text appears/disappears smoothly

#### 3. State Persistence Test
- [ ] Collapse sidebar
- [ ] Refresh page → Sidebar remains collapsed
- [ ] Navigate to another page → State persists
- [ ] Expand sidebar and refresh → Remains expanded
- [ ] Clear localStorage → Sidebar resets to default (expanded)

### ✅ **Visual Tests**

#### 4. Collapsed State Appearance
- [ ] Only icons visible (no text)
- [ ] Logo emoji (🎓) visible
- [ ] "TutorMis" text hidden
- [ ] Hamburger icon transforms to X shape
- [ ] Width exactly 80px
- [ ] Section titles hidden

#### 5. Expanded State Appearance
- [ ] Full text visible for all menu items
- [ ] Logo + "TutorMis" text visible
- [ ] Hamburger icon shows 3 horizontal lines
- [ ] Width exactly 280px
- [ ] Section titles visible

#### 6. Hover State Appearance
- [ ] Smooth expansion animation
- [ ] Text fades in gradually
- [ ] No layout jump or jitter
- [ ] Content margin adjusts smoothly

### ✅ **Responsive Tests**

#### 7. Desktop View (> 768px)
- [ ] Hamburger icon visible
- [ ] Collapse functionality works
- [ ] Hover expansion works
- [ ] State saves correctly

#### 8. Mobile View (≤ 768px)
- [ ] Hamburger icon hidden
- [ ] Traditional toggle button visible
- [ ] Sidebar slides from left
- [ ] Overlay behavior works
- [ ] Close button (X) works

### ✅ **Cross-Browser Tests**

#### 9. Browser Compatibility
- [ ] Chrome/Edge (Latest)
- [ ] Firefox (Latest)
- [ ] Safari (Latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

### ✅ **Role-Specific Tests**

#### 10. Student Dashboard
- [ ] Navigate to `/pages/student/dashboard.html`
- [ ] Test collapse/expand
- [ ] Navigate between: Dashboard → Courses → Messages → Profile
- [ ] State persists across navigation

#### 11. Tutor Dashboard
- [ ] Navigate to `/pages/tutor/dashboard.html`
- [ ] Test collapse/expand
- [ ] Navigate between: Dashboard → Students → Requests → Income
- [ ] State persists across navigation

#### 12. Admin Dashboard
- [ ] Navigate to `/pages/admin/dashboard.html`
- [ ] Test collapse/expand
- [ ] Navigate between: Dashboard → Users → Courses → Blog
- [ ] State persists across navigation

### ✅ **Edge Cases Tests**

#### 13. Quick Toggle Test
- [ ] Rapidly click hamburger icon 10 times
- [ ] No animation glitches
- [ ] Final state is correct

#### 14. Hover During Transition Test
- [ ] Click to collapse
- [ ] Immediately hover before animation completes
- [ ] No visual bugs or stuck states

#### 15. Multi-Tab Test
- [ ] Open dashboard in Tab 1 → Collapse sidebar
- [ ] Open dashboard in Tab 2 → Check if collapsed
- [ ] Expand in Tab 2
- [ ] Refresh Tab 1 → Should be expanded

### ✅ **Accessibility Tests**

#### 16. Keyboard Navigation
- [ ] Tab to hamburger icon
- [ ] Press Enter → Sidebar toggles
- [ ] Tab through menu items when collapsed
- [ ] Focus indicator visible

#### 17. Screen Reader Test
- [ ] Hamburger button has proper aria-label
- [ ] State changes announced
- [ ] Menu items readable when collapsed

### ✅ **Performance Tests**

#### 18. Animation Smoothness
- [ ] No lag during collapse/expand
- [ ] Hover expansion is instant (< 50ms)
- [ ] 60fps animation (check DevTools)

#### 19. Memory Leak Test
- [ ] Toggle sidebar 50+ times
- [ ] Check memory usage in DevTools
- [ ] No significant memory increase

---

## 🐛 Known Issues (If Any)

### Issue 1: [None reported]
**Description:** N/A  
**Workaround:** N/A

---

## 📊 Test Results Template

```
Date: _______________
Tester: _______________
Browser: _______________
Device: _______________

Tests Passed: _____ / 19
Tests Failed: _____

Critical Issues: _____
Minor Issues: _____

Overall Status: ☐ Pass  ☐ Fail  ☐ Needs Review

Notes:
_________________________________
_________________________________
_________________________________
```

---

## 🚀 Quick Test Commands

### Open Student Dashboard
```
Navigate to: http://localhost/pages/student/dashboard.html
```

### Open Tutor Dashboard
```
Navigate to: http://localhost/pages/tutor/dashboard.html
```

### Open Admin Dashboard
```
Navigate to: http://localhost/pages/admin/dashboard.html
```

### Clear localStorage (Reset State)
```javascript
// Open Browser DevTools Console (F12)
localStorage.removeItem('sidebarCollapsed');
location.reload();
```

### Check Current State
```javascript
// Open Browser DevTools Console (F12)
console.log('Sidebar Collapsed:', localStorage.getItem('sidebarCollapsed'));
```

---

## ✅ Sign-Off

**Developed by:** GitHub Copilot  
**Tested by:** _____________  
**Approved by:** _____________  
**Date:** _____________

