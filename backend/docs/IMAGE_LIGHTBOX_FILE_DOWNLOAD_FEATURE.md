# Image Lightbox & Direct File Download Feature

## Tổng Quan

Cải tiến trải nghiệm người dùng khi xem ảnh và tải file trong tin nhắn:

1. **Ảnh**: Click để xem trong lightbox modal (không mở tab mới)
2. **File khác**: Click để download trực tiếp (không mở tab mới)

## Tính Năng

### 1. Image Lightbox Modal 🖼️

**Mô tả:**
- Click vào ảnh trong tin nhắn → Mở lightbox full-screen
- Ảnh hiển thị to, rõ nét trong modal overlay
- Có caption hiển thị tên file
- Click bên ngoài hoặc nút X để đóng
- Nhấn ESC để đóng

**UI/UX:**
```
┌─────────────────────────────────────────────┐
│  [X]                                        │
│                                             │
│                                             │
│        ╔══════════════════════╗             │
│        ║                      ║             │
│        ║    [IMAGE PREVIEW]   ║             │
│        ║                      ║             │
│        ╚══════════════════════╝             │
│                                             │
│         ┌────────────────┐                  │
│         │  filename.jpg  │                  │
│         └────────────────┘                  │
└─────────────────────────────────────────────┘
```

**Tính năng:**
- ✅ Full-screen overlay với backdrop đen (opacity 95%)
- ✅ Image zoom in animation khi mở
- ✅ Fade in animation cho modal
- ✅ Caption hiển thị tên file
- ✅ Click outside để đóng
- ✅ Nút X để đóng
- ✅ ESC key để đóng
- ✅ Responsive cho mobile
- ✅ Prevent body scroll khi lightbox mở
- ✅ Cursor zoom-in trên ảnh

### 2. Direct File Download 📥

**Mô tả:**
- Click vào file (PDF, DOCX, MP4, MP3, etc.) → Download trực tiếp
- Không mở tab mới
- Hiển thị notification "Đang tải file xuống..."
- Sử dụng download attribute

**UI/UX:**
```
┌─────────────────────────────────────────┐
│  📄  Document.pdf                       │
│      2.5 MB                        ⬇️  │
│  [Hover effect: gradient underline]    │
└─────────────────────────────────────────┘
```

**Tính năng:**
- ✅ Download attribute trên link
- ✅ Fetch + Blob API cho Cloudinary URLs
- ✅ Notification khi bắt đầu download
- ✅ Fallback: mở tab mới nếu download fails
- ✅ Hover effect: gradient underline animation
- ✅ Console log để debug

## Implementation Details

### HTML Changes

**Files Modified:**
- `frontend/pages/student/messages.html`
- `frontend/pages/tutor/messages.html`

**Added:**
```html
<!-- Image Lightbox Modal -->
<div class="image-lightbox" id="imageLightbox" onclick="closeImageLightbox()">
    <span class="lightbox-close">&times;</span>
    <img class="lightbox-content" id="lightboxImage">
    <div class="lightbox-caption" id="lightboxCaption"></div>
</div>
```

### JavaScript Changes

**File:** `frontend/assets/js/messages.js`

#### 1. Image Rendering
```javascript
// OLD: Open in new tab
<img src="${att.url}" onclick="window.open('${att.url}', '_blank')">

// NEW: Open in lightbox
<img src="${att.url}" 
     onclick="openImageLightbox('${att.url}', '${fileName}')">
```

#### 2. File Rendering
```javascript
// OLD: Open in new tab
<a href="${att.url}" target="_blank" class="file-link">

// NEW: Direct download
<a href="${att.url}" 
   download="${fileName}" 
   onclick="handleFileDownload(event, '${att.url}', '${fileName}')">
```

#### 3. Lightbox Functions
```javascript
/**
 * Open image in lightbox modal
 */
function openImageLightbox(imageUrl, caption) {
  const lightbox = document.getElementById('imageLightbox');
  const lightboxImg = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  
  lightboxImg.src = imageUrl;
  lightboxCaption.textContent = caption || '';
  lightbox.style.display = 'flex';
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

/**
 * Close image lightbox
 */
function closeImageLightbox() {
  const lightbox = document.getElementById('imageLightbox');
  lightbox.style.display = 'none';
  
  // Restore body scroll
  document.body.style.overflow = 'auto';
  
  // Clear image to free memory
  document.getElementById('lightboxImage').src = '';
}
```

#### 4. Download Function
```javascript
/**
 * Handle file download
 */
function handleFileDownload(event, fileUrl, fileName) {
  event.preventDefault();
  
  // For Cloudinary URLs, fetch and create blob
  if (fileUrl.includes('cloudinary.com')) {
    fetch(fileUrl)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
        
        showNotification('Đang tải file xuống...', 'info');
      })
      .catch(error => {
        // Fallback: open in new tab
        window.open(fileUrl, '_blank');
        showNotification('Mở file trong tab mới', 'info');
      });
  } else {
    // Direct download for non-Cloudinary URLs
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
```

#### 5. Keyboard Support
```javascript
// ESC key to close lightbox
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' || event.key === 'Esc') {
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox && lightbox.style.display === 'flex') {
      closeImageLightbox();
    }
  }
});
```

### CSS Changes

**File:** `frontend/assets/css/messages.css`

#### 1. Lightbox Modal Styles
```css
.image-lightbox {
  display: none;
  position: fixed;
  z-index: 10000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.95);
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

#### 2. Lightbox Close Button
```css
.lightbox-close {
  position: absolute;
  top: 20px;
  right: 40px;
  color: white;
  font-size: 40px;
  font-weight: bold;
  cursor: pointer;
  transition: color 0.3s;
  z-index: 10001;
}

.lightbox-close:hover {
  color: #bbb;
}
```

#### 3. Lightbox Image
```css
.lightbox-content {
  max-width: 90%;
  max-height: 85vh;
  object-fit: contain;
  animation: zoomIn 0.3s ease;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

@keyframes zoomIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
```

#### 4. Lightbox Caption
```css
.lightbox-caption {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  font-size: 16px;
  background: rgba(0, 0, 0, 0.7);
  padding: 12px 24px;
  border-radius: 8px;
  max-width: 80%;
  text-align: center;
  backdrop-filter: blur(10px);
}
```

#### 5. Enhanced Cursor & Hover Effects
```css
/* Zoom-in cursor for images */
.message-image img {
  cursor: zoom-in;
}

/* Download link hover effect */
.file-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: all 0.3s ease;
  transform: translateX(-50%);
}

.file-link:hover::after {
  width: 80%;
}
```

#### 6. Responsive Design
```css
@media (max-width: 768px) {
  .lightbox-close {
    top: 10px;
    right: 20px;
    font-size: 32px;
  }
  
  .lightbox-content {
    max-width: 95%;
    max-height: 80vh;
  }
  
  .lightbox-caption {
    font-size: 14px;
    padding: 8px 16px;
    bottom: 20px;
    max-width: 90%;
  }
}
```

## User Experience Flow

### Viewing Images

1. **User sees image in message**
   - Cursor changes to zoom-in icon
   
2. **User clicks image**
   - Lightbox opens with fade-in animation
   - Image zooms in smoothly
   - Backdrop dims the background
   - Body scroll is prevented
   
3. **User views image**
   - Image displayed at optimal size
   - Caption shows filename
   - User can see clearly
   
4. **User closes lightbox**
   - Click outside image → Close
   - Click X button → Close
   - Press ESC key → Close
   - Lightbox fades out
   - Body scroll restored

### Downloading Files

1. **User sees file in message**
   - File card with icon, name, size
   - Download icon visible
   
2. **User hovers over file**
   - Gradient underline animates in
   - Visual feedback
   
3. **User clicks file**
   - Download starts immediately
   - Notification: "Đang tải file xuống..."
   - No new tab opens
   
4. **Download completes**
   - File saves to Downloads folder
   - Browser shows download progress

## Testing Checklist

### Image Lightbox Tests

- [ ] Click image in sent message → Lightbox opens
- [ ] Click image in received message → Lightbox opens
- [ ] Image displays correctly at full size
- [ ] Caption shows correct filename
- [ ] Click outside image → Lightbox closes
- [ ] Click X button → Lightbox closes
- [ ] Press ESC key → Lightbox closes
- [ ] Body scroll prevented when lightbox open
- [ ] Body scroll restored when lightbox closed
- [ ] Animations smooth (fade in, zoom in)
- [ ] Responsive on mobile (smaller image, adjusted caption)
- [ ] Multiple images can be opened sequentially

### File Download Tests

- [ ] Click PDF file → Downloads directly
- [ ] Click DOCX file → Downloads directly
- [ ] Click MP4 file → Downloads directly
- [ ] Click MP3 file → Downloads directly
- [ ] Click code file (.py, .cpp) → Downloads directly
- [ ] Cloudinary URLs → Download works
- [ ] Non-Cloudinary URLs → Download works
- [ ] Notification shows "Đang tải file xuống..."
- [ ] Hover effect shows gradient underline
- [ ] Downloaded file has correct name
- [ ] Downloaded file opens correctly
- [ ] Fallback: Opens in new tab if download fails

### Edge Cases

- [ ] Very large image (>10MB) → Loads smoothly
- [ ] Very wide image → Fits in viewport
- [ ] Very tall image → Fits in viewport
- [ ] Slow network → Loading indicator (optional)
- [ ] Multiple rapid clicks → No duplicate lightboxes
- [ ] Download same file multiple times → Works
- [ ] Special characters in filename → Handled correctly

## Browser Compatibility

### Lightbox
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile Chrome
- ✅ Mobile Safari

### Download
- ✅ Chrome 90+ (download attribute)
- ✅ Firefox 88+ (download attribute)
- ✅ Safari 14+ (download attribute with blob)
- ✅ Edge 90+ (download attribute)
- ⚠️ Mobile browsers (may open in new tab depending on OS)

## Performance Considerations

### Lightbox
- ✅ Lazy loading: Image only loads when lightbox opens
- ✅ Memory cleanup: Clear image src when closing
- ✅ Smooth animations with GPU acceleration
- ✅ No layout shift

### Download
- ✅ Blob creation only for Cloudinary URLs
- ✅ Blob URL cleanup after download
- ✅ Minimal memory usage
- ✅ Non-blocking UI

## Known Limitations

1. **Mobile Download:** Some mobile browsers may still open files in new tab depending on OS settings
2. **Large Files:** Very large files (>100MB) may timeout during blob fetch
3. **CORS:** Some external URLs may have CORS issues preventing blob download

## Future Enhancements

### Lightbox
- [ ] Image zoom/pan functionality
- [ ] Gallery mode (previous/next buttons for multiple images)
- [ ] Swipe gestures on mobile
- [ ] Loading spinner for large images
- [ ] Image info overlay (size, dimensions, date)

### Download
- [ ] Progress bar for large downloads
- [ ] Pause/Resume download
- [ ] Batch download multiple files
- [ ] Download history
- [ ] Preview before download (for videos/audio)

## Files Changed

1. **frontend/pages/student/messages.html** - Added lightbox HTML
2. **frontend/pages/tutor/messages.html** - Added lightbox HTML
3. **frontend/assets/js/messages.js** - Added lightbox and download functions
4. **frontend/assets/css/messages.css** - Added lightbox styles

---

**Status:** ✅ Implemented and Ready for Testing
**Date:** October 8, 2025
**Version:** 1.2
