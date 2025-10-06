# 📝 Hướng Dẫn Tùy Chỉnh Hamburger Icon

## 🎯 Những gì đã thay đổi (v1.1.3)

### 1. Ẩn dấu X khi sidebar collapsed (không hover)
Khi sidebar ở trạng thái thu nhỏ và không có hover:
- ✅ Chỉ hiển thị icon brand (🎓)
- ✅ Dấu X bị ẩn hoàn toàn
- ✅ Khi hover vào sidebar → Dấu X xuất hiện trở lại

**CSS đã thêm:**
```css
.dashboard-sidebar.collapsed .hamburger-icon {
  opacity: 0;              /* Ẩn icon */
  pointer-events: none;    /* Không nhận click khi ẩn */
}

.dashboard-sidebar.collapsed:hover .hamburger-icon {
  opacity: 1;              /* Hiện lại khi hover */
  pointer-events: auto;    /* Nhận click trở lại */
}
```

---

## 🔧 Cách thay đổi dấu X thành ký tự khác

### Hiện tại: Dấu X (được tạo bằng CSS)
Hamburger icon hiện đang sử dụng **3 dấu gạch ngang** (`<span></span>`) được transform thành dấu X bằng CSS rotation.

### ❓ Muốn đổi thành ký tự khác (ví dụ: `<` hoặc `←` hoặc `⮜`)

Bạn có **2 cách**:

---

## 🎨 CÁCH 1: Sử dụng Text/Icon thay vì CSS Transform (Dễ nhất)

### Bước 1: Thay đổi HTML
Mở **BẤT KỲ FILE DASHBOARD NÀO**, ví dụ: `frontend/pages/student/dashboard.html`

**Tìm đoạn code này:**
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

**Đổi thành:**
```html
<div class="sidebar-brand">
    <span>🎓</span>
    <span class="sidebar-brand-text">TutorMis</span>
    <div class="hamburger-icon-text" id="hamburgerIcon">
        <span class="icon-normal">☰</span>     <!-- Icon khi mở -->
        <span class="icon-collapsed">‹</span>   <!-- Icon khi đóng -->
    </div>
</div>
```

### Bước 2: Thay đổi CSS
Mở file: `frontend/assets/css/dashboard.css`

**Thêm CSS mới:**
```css
/* Hamburger icon dạng text/emoji */
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

/* Mặc định: Hiển thị ☰ (3 gạch) */
.hamburger-icon-text .icon-normal {
  opacity: 1;
}

.hamburger-icon-text .icon-collapsed {
  opacity: 0;
}

/* Khi collapsed: Hiển thị ‹ */
.dashboard-sidebar.collapsed .hamburger-icon-text .icon-normal {
  opacity: 0;
}

.dashboard-sidebar.collapsed .hamburger-icon-text .icon-collapsed {
  opacity: 1;
}

/* Ẩn khi collapsed và không hover */
.dashboard-sidebar.collapsed .hamburger-icon-text {
  opacity: 0;
  pointer-events: none;
}

.dashboard-sidebar.collapsed:hover .hamburger-icon-text {
  opacity: 1;
  pointer-events: auto;
}
```

### Bước 3: Các ký tự bạn có thể dùng thay cho X:

| Ký tự | Mã | Mô tả |
|-------|----|----|
| ‹ | `&#8249;` hoặc `&lsaquo;` | Dấu nhỏ hơn đơn |
| « | `&#171;` hoặc `&laquo;` | Dấu nhỏ hơn kép |
| ← | `&#8592;` hoặc `&larr;` | Mũi tên trái |
| ⮜ | `&#11804;` | Mũi tên trái đậm |
| ◀ | `&#9664;` | Tam giác trái |
| ⏴ | `&#9204;` | Nút trái |
| 🔙 | `&#128281;` | Emoji "Back" |
| < | Dấu nhỏ hơn thông thường |

**Ví dụ sử dụng:**
```html
<span class="icon-collapsed">←</span>   <!-- Mũi tên -->
<span class="icon-collapsed">‹</span>   <!-- Dấu nhỏ hơn -->
<span class="icon-collapsed">«</span>   <!-- Dấu kép -->
```

---

## 🎨 CÁCH 2: Sửa CSS Transform hiện tại (Phức tạp hơn)

Nếu muốn giữ cấu trúc HTML 3-span hiện tại và chỉ sửa CSS:

### Bước 1: Mở file CSS
File: `frontend/assets/css/dashboard.css`

### Bước 2: Tìm và sửa phần này:

**Code hiện tại (tạo dấu X):**
```css
.dashboard-sidebar.collapsed .hamburger-icon span:nth-child(1) {
  transform: translateY(8px) rotate(45deg);
}

.dashboard-sidebar.collapsed .hamburger-icon span:nth-child(2) {
  opacity: 0;
}

.dashboard-sidebar.collapsed .hamburger-icon span:nth-child(3) {
  transform: translateY(-8px) rotate(-45deg);
}
```

### Tạo dấu < (chevron trái):
```css
.dashboard-sidebar.collapsed .hamburger-icon span:nth-child(1) {
  transform: translateY(4px) rotate(-45deg);
  width: 12px;
}

.dashboard-sidebar.collapsed .hamburger-icon span:nth-child(2) {
  opacity: 0;
}

.dashboard-sidebar.collapsed .hamburger-icon span:nth-child(3) {
  transform: translateY(-4px) rotate(45deg);
  width: 12px;
}
```

### Tạo dấu ← (mũi tên trái):
```css
.dashboard-sidebar.collapsed .hamburger-icon span:nth-child(1) {
  transform: translateY(0) rotate(0);
  width: 16px;
}

.dashboard-sidebar.collapsed .hamburger-icon span:nth-child(2) {
  transform: translateX(-6px) translateY(4px) rotate(-45deg);
  width: 10px;
}

.dashboard-sidebar.collapsed .hamburger-icon span:nth-child(3) {
  transform: translateX(-6px) translateY(-4px) rotate(45deg);
  width: 10px;
}
```

---

## 📊 So sánh 2 cách

| Tiêu chí | Cách 1: Text/Icon | Cách 2: CSS Transform |
|----------|-------------------|-----------------------|
| **Độ khó** | ⭐ Dễ | ⭐⭐⭐ Khó |
| **Linh hoạt** | ⭐⭐⭐ Cao | ⭐⭐ Trung bình |
| **Thay đổi ký tự** | Chỉ sửa HTML | Phải tính toán CSS |
| **Sử dụng emoji** | ✅ Được | ❌ Không |
| **Animation** | Fade in/out | Transform |
| **Khuyến nghị** | ✅ **Nên dùng** | Chỉ nếu cần hiệu ứng phức tạp |

---

## 🧪 Kiểm tra sau khi thay đổi

### Trạng thái mặc định (sidebar mở - 280px):
```
┌────────────────────────┐
│ 🎓 TutorMis        ☰   │ ← Hiện icon hamburger (☰)
│                         │
│ MENU CHÍNH             │
│ 📊 Dashboard           │
└────────────────────────┘
```

### Trạng thái collapsed (không hover - 80px):
```
┌────┐
│ 🎓 │ ← CHỈ hiện logo
│    │ ← KHÔNG hiện X
│    │
│ 📊 │
│ 📚 │
└────┘
```

### Trạng thái collapsed + hover (80px → 280px):
```
┌────────────────────────┐
│ 🎓 TutorMis        ‹   │ ← Hiện dấu ‹ (hoặc X tuỳ bạn chọn)
│                         │
│ MENU CHÍNH             │
│ 📊 Dashboard           │
└────────────────────────┘
```

---

## 📝 Tóm tắt các file cần sửa

### Nếu dùng CÁCH 1 (Text/Icon - Khuyến nghị):
1. **HTML** (20+ files): Thay `<div class="hamburger-icon">` thành `<div class="hamburger-icon-text">`
   - `frontend/pages/student/*.html` (7 files)
   - `frontend/pages/tutor/*.html` (7 files)
   - `frontend/pages/admin/*.html` (6 files)

2. **CSS** (1 file): Thêm CSS mới cho `.hamburger-icon-text`
   - `frontend/assets/css/dashboard.css`

3. **JavaScript**: KHÔNG CẦN thay đổi (vẫn dùng `id="hamburgerIcon"`)

### Nếu dùng CÁCH 2 (CSS Transform):
1. **CSS** (1 file): Sửa transform values
   - `frontend/assets/css/dashboard.css`

2. **HTML**: KHÔNG CẦN thay đổi
3. **JavaScript**: KHÔNG CẦN thay đổi

---

## 💡 Gợi ý của tôi

**Dùng CÁCH 1** với các icon sau:
- **‹** (dấu nhỏ hơn đơn) - Đơn giản, rõ ràng
- **←** (mũi tên trái) - Trực quan
- **⮜** (mũi tên đậm) - Nổi bật

**Code mẫu nhanh:**
```html
<div class="hamburger-icon-text" id="hamburgerIcon">
    <span class="icon-normal">☰</span>
    <span class="icon-collapsed">‹</span>  <!-- Đổi ký tự này! -->
</div>
```

---

## ❓ Câu hỏi thường gặp

### Q: Tôi muốn dùng icon Font Awesome thay vì ký tự?
A: Hoàn toàn được! Ví dụ:
```html
<div class="hamburger-icon-text" id="hamburgerIcon">
    <span class="icon-normal"><i class="fas fa-bars"></i></span>
    <span class="icon-collapsed"><i class="fas fa-chevron-left"></i></span>
</div>
```

### Q: Tôi có thể dùng SVG không?
A: Có! Thay `<span>` bằng `<svg>`:
```html
<div class="hamburger-icon-text" id="hamburgerIcon">
    <svg class="icon-collapsed" viewBox="0 0 24 24">
        <path d="M15 18l-6-6 6-6"/>
    </svg>
</div>
```

### Q: Animation có bị ảnh hưởng không?
A: Không! Với CÁCH 1, animation fade vẫn hoạt động mượt mà.

---

## 📁 Files liên quan

- **CSS chính:** `frontend/assets/css/dashboard.css`
- **JavaScript:** `frontend/assets/js/dashboard-common.js` (không cần sửa)
- **HTML templates:** 20+ files trong `frontend/pages/*/`
- **Test file:** `frontend/test-sidebar-width-fix.html`

---

**Tạo bởi:** GitHub Copilot  
**Phiên bản:** v1.1.3  
**Ngày cập nhật:** October 6, 2025  
**Trạng thái:** ✅ Hoàn thành
