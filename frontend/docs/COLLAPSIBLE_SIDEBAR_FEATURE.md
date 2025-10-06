# 🎯 Tính Năng Sidebar Thu Gọn (Collapsible Sidebar)

## 📋 Tổng Quan

Tính năng sidebar thu gọn cho phép người dùng tối ưu hóa không gian màn hình bằng cách thu gọn/mở rộng menu điều hướng. Tính năng này được áp dụng cho **tất cả các role**: Student, Tutor, và Admin.

## ✨ Tính Năng Chính

### 1. **Icon Hamburger Menu (3 Gạch)**
- Hiển thị ngay sau chữ "TutorMis" trong sidebar-brand
- Click để toggle trạng thái thu gọn/mở rộng
- Animation mượt mà khi chuyển đổi trạng thái

### 2. **Chế Độ Thu Gọn (Collapsed Mode)**
- Sidebar **slide từ phải sang trái**, ẩn đi 200px
- Chỉ hiển thị **80px** bên trái với các icon
- Text menu items và section titles được ẩn đi với hiệu ứng slide
- Icon hamburger chuyển đổi thành dấu X khi thu gọn

### 3. **Hover để Mở Rộng**
- Khi sidebar đang thu gọn, di chuột vào sẽ **slide từ trái sang phải**
- Sidebar tự động mở rộng ra với animation mượt mà
- Hiển thị đầy đủ text của menu items
- Tự động thu gọn lại (slide về trái) khi di chuột ra ngoài

### 4. **Lưu Trạng Thái**
- Trạng thái thu gọn/mở rộng được lưu trong **localStorage**
- Giữ nguyên trạng thái khi reload trang hoặc chuyển trang

### 5. **Responsive Design**
- Trên mobile: Hamburger icon bị ẩn, sử dụng menu toggle button truyền thống
- Sidebar hoạt động dạng overlay trên mobile

## 🎨 Các Trạng Thái Sidebar

### **Mở Rộng (Expanded) - Mặc Định**
```
Position: translateX(0)
Width: 280px - Hiển thị đầy đủ
- Logo "🎓 TutorMis" + hamburger icon (☰)
- Full icon + text hiển thị
```

### **Thu Gọn (Collapsed)**
```
Position: translateX(-200px) - Slide từ phải sang trái
Width visible: 80px
- Chỉ hiển thị 80px bên trái (phần còn lại ẩn bên trái màn hình)
- Logo "🎓" + hamburger icon (X)
- Text menu items ẩn hoàn toàn
- Hiệu ứng: Slide animation 0.4s cubic-bezier
```

### **Thu Gọn + Hover**
```
Position: translateX(0) - Slide từ trái sang phải
Width: 280px (hiển thị tạm thời)
- Sidebar slide ra khi hover
- Hiển thị full text với fade-in effect
- Thu gọn lại (slide về trái) khi mouse leave
```

## 🔧 Cấu Trúc HTML

### Hamburger Icon Structure
```html
<div class="sidebar-brand">
    <span>🎓</span>
    <span class="sidebar-brand-text">TutorMis</span>
    <div class="hamburger-icon" id="hamburgerIcon">
        <span></span>
        <span></span>
        <span></span>
    </div>
</div>
```

## 📁 Files Đã Cập Nhật

### **CSS Files**
- `frontend/assets/css/dashboard.css` - Thêm styles cho collapsed state, hamburger icon, animations

### **JavaScript Files**
- `frontend/assets/js/dashboard-common.js` - Thêm toggle logic, localStorage, hover handlers

### **HTML Files - Student Role**
- `frontend/pages/student/dashboard.html`
- `frontend/pages/student/course.html`
- `frontend/pages/student/tutor_request.html`
- `frontend/pages/student/find_tutor.html`
- `frontend/pages/student/messages.html`
- `frontend/pages/student/profile_student.html`
- `frontend/pages/student/blog.html`

### **HTML Files - Tutor Role**
- `frontend/pages/tutor/dashboard.html`
- `frontend/pages/tutor/student_management.html`
- `frontend/pages/tutor/new_request.html`
- `frontend/pages/tutor/schedule.html`
- `frontend/pages/tutor/income.html`
- `frontend/pages/tutor/messages.html`
- `frontend/pages/tutor/blog.html`
- `frontend/pages/tutor/profile_tutor.html`

### **HTML Files - Admin Role**
- `frontend/pages/admin/dashboard.html`
- `frontend/pages/admin/user.html`
- `frontend/pages/admin/approve.html`
- `frontend/pages/admin/course.html`
- `frontend/pages/admin/blog_management.html`
- `frontend/pages/admin/report.html`
- `frontend/pages/admin/financial_statistics.html`

## 🎯 Cách Sử Dụng

### **Cho Người Dùng:**

1. **Thu gọn sidebar:**
   - Click vào icon 3 gạch (hamburger) bên cạnh "TutorMis"
   - Sidebar sẽ thu nhỏ, chỉ hiển thị icons

2. **Mở rộng lại:**
   - Click vào hamburger icon lần nữa
   - HOẶC di chuột vào sidebar khi đang thu gọn

3. **Xem menu khi thu gọn:**
   - Không cần click, chỉ cần di chuột vào sidebar
   - Menu sẽ tự động mở rộng tạm thời

## 🎨 CSS Classes

### **Main Classes:**
```css
.dashboard-sidebar              /* Sidebar container */
.dashboard-sidebar.collapsed    /* Collapsed state */
.sidebar-brand                  /* Logo + hamburger container */
.sidebar-brand-text             /* "TutorMis" text */
.hamburger-icon                 /* 3-line hamburger icon */
.menu-item                      /* Menu item */
.menu-section-title             /* Section title */
```

### **Responsive Behavior:**
```css
@media (max-width: 768px) {
  /* Mobile: Hide hamburger, use traditional toggle */
  .hamburger-icon { display: none; }
  .dashboard-sidebar { transform: translateX(-100%); }
}
```

## ⚙️ JavaScript Logic

### **Toggle Function:**
```javascript
hamburgerIcon.addEventListener('click', (e) => {
  dashboardSidebar.classList.toggle('collapsed');
  localStorage.setItem('sidebarCollapsed', collapsed);
});
```

### **Load Saved State:**
```javascript
const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
if (isCollapsed) {
  dashboardSidebar.classList.add('collapsed');
}
```

## 🎬 Animation Details

### **Hamburger Icon Animation:**
- **Default:** 3 horizontal lines (☰)
- **Collapsed:** Top and bottom lines rotate to form X (✕)
- **Transition:** 0.3s ease

### **Sidebar Slide Animation:**
- **Direction:** Phải → Trái khi đóng, Trái → Phải khi mở
- **Transform:** translateX(0) ↔ translateX(-200px)
- **Timing:** 0.4s cubic-bezier(0.4, 0.0, 0.2, 1) - Material Design easing
- **Visible Width:** 80px khi collapsed (200px ẩn bên trái)
- **Main content margin:** 280px → 80px (smooth transition)

### **Text Slide & Fade:**
- **Menu text:** Opacity 1 → 0 + TranslateX(0 → -10px) - 0.25s
- **Section titles:** Opacity 1 → 0 + TranslateX(0 → -20px) - 0.25s
- **Hover restore:** Fade-in + Slide back (0 → full opacity, -10px → 0)

## 📱 Responsive Behavior

### **Desktop (> 768px):**
- Hamburger icon visible and functional
- Hover to expand feature enabled
- State saved in localStorage

### **Mobile (≤ 768px):**
- Hamburger icon hidden
- Traditional sidebar toggle button shown
- Sidebar slides from left (overlay mode)
- No collapse feature, only show/hide

## 🔄 State Management

### **LocalStorage Key:**
```
sidebarCollapsed: "true" | "false"
```

### **Persist Across:**
- ✅ Page refreshes
- ✅ Navigation between pages
- ✅ Browser sessions

## 🐛 Troubleshooting

### **Issue: Sidebar không thu gọn**
- Kiểm tra console có lỗi JavaScript không
- Verify `hamburgerIcon` element exists trong HTML
- Check `dashboard-common.js` đã được load chưa

### **Issue: State không được lưu**
- Kiểm tra localStorage có bị disabled không
- Clear localStorage và thử lại

### **Issue: Hover không hoạt động**
- Verify CSS class `.collapsed` đã được apply
- Check CSS hover selector trong `dashboard.css`

## 🎉 Kết Quả

Tính năng này giúp:
- ✅ Tối ưu hóa không gian màn hình
- ✅ Tăng diện tích hiển thị nội dung chính
- ✅ UX mượt mà với animation đẹp
- ✅ Nhất quán trên tất cả các role
- ✅ Responsive tốt trên mobile

---

**Created:** June 2025  
**Last Updated:** June 2025  
**Version:** 1.0.0
