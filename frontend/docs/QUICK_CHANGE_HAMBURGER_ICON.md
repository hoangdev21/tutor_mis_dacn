# ⚡ Quick Reference: Thay đổi dấu X thành ký tự khác

## 🎯 Mục đích
Hướng dẫn nhanh cách thay dấu X (khi sidebar collapsed) thành ký tự khác như: `<`, `←`, `‹`, v.v.

---

## 🚀 CÁCH NHANH NHẤT (Khuyến nghị)

### Bước 1: Sửa HTML
Mở file: `frontend/pages/student/dashboard.html` (hoặc bất kỳ dashboard nào)

**Tìm:**
```html
<div class="hamburger-icon" id="hamburgerIcon">
    <span></span>
    <span></span>
    <span></span>
</div>
```

**Đổi thành:**
```html
<div class="hamburger-icon-text" id="hamburgerIcon">
    <span class="icon-normal">☰</span>
    <span class="icon-collapsed">‹</span>  👈 ĐỔI KÝ TỰ NÀY!
</div>
```

### Bước 2: Thêm CSS
Mở file: `frontend/assets/css/dashboard.css`

**Thêm vào cuối file (hoặc sau phần hamburger-icon hiện tại):**
```css
/* Hamburger icon dạng text */
.hamburger-icon-text {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  cursor: pointer;
  margin-left: 12px;
  transition: all 0.3s ease;
  position: relative;
}

.hamburger-icon-text span {
  font-size: 24px;
  color: var(--primary-color);
  transition: all 0.3s ease;
  position: absolute;
}

.hamburger-icon-text .icon-normal {
  opacity: 1;
}

.hamburger-icon-text .icon-collapsed {
  opacity: 0;
}

.dashboard-sidebar.collapsed .hamburger-icon-text .icon-normal {
  opacity: 0;
}

.dashboard-sidebar.collapsed .hamburger-icon-text .icon-collapsed {
  opacity: 1;
}

.dashboard-sidebar.collapsed .hamburger-icon-text {
  opacity: 0;
  pointer-events: none;
}

.dashboard-sidebar.collapsed:hover .hamburger-icon-text {
  opacity: 1;
  pointer-events: auto;
}
```

### Bước 3: Xong! 🎉
Refresh trang và test.

---

## 📝 Các ký tự có thể dùng

Copy & paste trực tiếp vào HTML:

| Ký tự | Copy này | Tên | Kích thước |
|-------|----------|-----|------------|
| ‹ | `‹` | Dấu nhỏ hơn đơn | Nhỏ |
| « | `«` | Dấu nhỏ hơn kép | Trung bình |
| ← | `←` | Mũi tên trái | Vừa |
| ⮜ | `⮜` | Mũi tên đậm | Lớn |
| ◀ | `◀` | Tam giác trái | Vừa |
| < | `<` | Dấu nhỏ hơn | Nhỏ |
| 🔙 | `🔙` | Emoji Back | Lớn |
| ⏴ | `⏴` | Nút trái | Vừa |

---

## 💡 Ví dụ cụ thể

### Ví dụ 1: Dùng mũi tên ←
```html
<div class="hamburger-icon-text" id="hamburgerIcon">
    <span class="icon-normal">☰</span>
    <span class="icon-collapsed">←</span>
</div>
```

### Ví dụ 2: Dùng dấu nhỏ hơn kép «
```html
<div class="hamburger-icon-text" id="hamburgerIcon">
    <span class="icon-normal">☰</span>
    <span class="icon-collapsed">«</span>
</div>
```

### Ví dụ 3: Dùng Font Awesome icon
```html
<div class="hamburger-icon-text" id="hamburgerIcon">
    <span class="icon-normal"><i class="fas fa-bars"></i></span>
    <span class="icon-collapsed"><i class="fas fa-chevron-left"></i></span>
</div>
```

---

## 🎨 Điều chỉnh kích thước

Nếu ký tự quá lớn hoặc quá nhỏ, sửa `font-size`:

```css
.hamburger-icon-text span {
  font-size: 20px;  /* Giảm từ 24px → 20px */
  color: var(--primary-color);
}
```

---

## ⚠️ Lưu ý quan trọng

1. **Phải sửa TẤT CẢ các file HTML dashboard** (20+ files):
   - `frontend/pages/student/*.html` (7 files)
   - `frontend/pages/tutor/*.html` (7 files)
   - `frontend/pages/admin/*.html` (6 files)

2. **Giữ nguyên `id="hamburgerIcon"`** - JavaScript cần nó!

3. **Class name phải là `hamburger-icon-text`** (không phải `hamburger-icon`)

4. **Thêm CSS vào `dashboard.css`** - chỉ cần thêm 1 lần

---

## 🧪 Test nhanh

1. Mở dashboard
2. Click hamburger → Sidebar thu nhỏ
3. Không hover → Chỉ thấy 🎓
4. Hover vào sidebar → Thấy ký tự mới của bạn (‹, ←, v.v.)
5. Click ký tự đó → Sidebar mở rộng

---

## 🔧 Troubleshooting

### Vấn đề: Không thấy ký tự mới
- ✅ Kiểm tra class name: `hamburger-icon-text` (không phải `hamburger-icon`)
- ✅ Kiểm tra CSS đã được thêm vào `dashboard.css`
- ✅ Hard refresh: `Ctrl + Shift + R`

### Vấn đề: Click không hoạt động
- ✅ Kiểm tra vẫn có `id="hamburgerIcon"`
- ✅ Kiểm tra `pointer-events: auto` trong CSS hover state

### Vấn đề: Ký tự bị lệch
- ✅ Điều chỉnh `width` và `height` của `.hamburger-icon-text`
- ✅ Thử thêm `text-align: center` và `line-height`

---

## 📞 Cần trợ giúp?

Xem tài liệu đầy đủ: `HAMBURGER_ICON_CUSTOMIZATION.md`

---

**Thời gian:** ~5 phút  
**Độ khó:** ⭐ Dễ  
**Files cần sửa:** HTML (20+) + CSS (1)  
**Khuyến nghị:** Dùng ký tự `‹` hoặc `←`
