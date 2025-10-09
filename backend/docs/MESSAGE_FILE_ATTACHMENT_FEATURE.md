# Message File Attachment Feature Implementation

## Tổng Quan

Tính năng đính kèm file cho hệ thống tin nhắn, cho phép người dùng gửi ảnh, video, audio, và các loại file khác (PDF, DOCX, code files, v.v.) trong tin nhắn.

## Các Thay Đổi Backend

### 1. Message Model (đã có sẵn)
File: `backend/src/models/Message.js`

Model Message đã hỗ trợ:
- Trường `messageType`: 'text', 'image', 'file', 'audio', 'video'
- Trường `attachments`: Array chứa thông tin file đính kèm
  - filename: Tên file
  - originalName: Tên gốc
  - mimeType: Loại file
  - size: Kích thước
  - url: Link Cloudinary

### 2. Upload Middleware
File: `backend/src/middleware/upload.js`

**Thêm mới:**
- `uploadMessageAttachment`: Middleware xử lý upload file tin nhắn
  - Hỗ trợ nhiều loại file: images, videos, audio, documents, code files
  - Giới hạn 10MB/file
  - Sử dụng memory storage cho Cloudinary

### 3. Cloudinary Upload Utility
File: `backend/src/utils/cloudinaryUpload.js`

**Thêm mới:**
- Function `uploadMessageAttachment(buffer, userId, originalName, mimeType)`
  - Upload file lên Cloudinary
  - Tự động phát hiện resource type (image/video/raw)
  - Lưu vào folder `tutornis/messages`
  - Trả về URL và metadata

### 4. Message Controller
File: `backend/src/controllers/messageController.js`

**Thêm mới:**

a) **uploadAttachment** - Upload file và trả về thông tin
```javascript
POST /api/messages/upload
Body: FormData with 'attachment' field
Response: {
  success: true,
  data: {
    url: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    messageType: 'image'|'video'|'audio'|'file'
  }
}
```

b) **sendMessage** - Cập nhật để hỗ trợ attachments
```javascript
POST /api/messages
Body: {
  recipientId: string,
  content: string (optional if has attachment),
  messageType: string,
  attachments: [{
    fileName: string,
    fileType: string,
    fileSize: number,
    url: string
  }]
}
```

### 5. Routes
File: `backend/src/routes/messages.js`

**Thêm mới:**
```javascript
router.post('/upload', uploadMessageAttachment, handleMulterError, uploadAttachment);
```

## Các Thay Đổi Frontend

### 1. HTML Updates
Files: 
- `frontend/pages/student/messages.html`
- `frontend/pages/tutor/messages.html`

**Thêm mới:**
- Hidden file input: `<input type="file" id="fileInput">`
- File preview container: `<div id="filePreviewContainer">`
- Cập nhật nút đính kèm để trigger file input

### 2. JavaScript Implementation
File: `frontend/assets/js/messages.js`

**Thêm mới các function:**

a) **handleFileSelect(event)**
- Xử lý khi người dùng chọn file
- Kiểm tra kích thước file (max 10MB)
- Hiển thị preview
- Upload lên server
- Lưu thông tin vào `currentFileAttachment`

b) **showFilePreview(file)**
- Hiển thị preview image cho ảnh
- Hiển thị icon + tên file cho file khác

c) **clearFilePreview()**
- Xóa preview
- Reset `currentFileAttachment`

d) **getFileIcon(mimeType, fileName)**
- Trả về Font Awesome icon phù hợp với loại file

e) **formatFileSize(bytes)**
- Format kích thước file (Bytes, KB, MB, GB)

**Cập nhật các function:**

a) **sendMessage()**
- Kiểm tra có attachment
- Gửi kèm attachment data với message
- Clear preview sau khi gửi

b) **renderMessages()**
- Render image attachments (hiển thị trực tiếp)
- Render file attachments (icon + tên + link download)

### 3. CSS Styling
File: `frontend/assets/css/messages.css`

**Thêm mới:**

a) **File Preview Styles (before sending)**
- `.file-preview-container`: Container chứa preview
- `.file-preview-image`: Preview cho ảnh
- `.file-preview-file`: Preview cho file
- `.file-preview-close`: Nút xóa preview

b) **Message Attachment Styles (after sending)**
- `.message-image`: Hiển thị ảnh trong tin nhắn
- `.message-file`: Hiển thị file với icon và link download
- `.file-link`: Link để download file
- `.file-icon`: Icon file
- `.file-info`: Thông tin file (tên, size)
- `.download-icon`: Icon download

c) **File Type Icons Colors**
- PDF: Đỏ (#F02849)
- Word: Xanh dương (#2b579a)
- Code: Tím (#667eea)
- Video: Tím đậm (#764ba2)
- Audio: Hồng (#f093fb)

## Luồng Hoạt Động

### Upload và Gửi File:

1. **Người dùng chọn file**
   - Click nút đính kèm (paperclip icon)
   - File input mở, chọn file

2. **Preview file**
   - Ảnh: Hiển thị thumbnail
   - File khác: Hiển thị icon + tên + size

3. **Upload file**
   - POST `/api/messages/upload` với FormData
   - Server upload lên Cloudinary
   - Trả về URL và metadata

4. **Lưu thông tin**
   - Frontend lưu vào `currentFileAttachment`

5. **Gửi tin nhắn**
   - Người dùng nhập nội dung (optional) và click Send
   - POST `/api/messages` với content + attachment
   - Server lưu vào database

6. **Hiển thị tin nhắn**
   - Message được render với attachment
   - Ảnh: Hiển thị trực tiếp
   - File: Hiển thị thẻ file với icon và link download

### Nhận tin nhắn có file:

1. **Socket.IO hoặc polling nhận message mới**
2. **renderMessages() được gọi**
3. **Kiểm tra attachments array**
4. **Render phù hợp:**
   - Image: `<img>` tag
   - File: `<a>` tag với icon và download link

## Các Loại File Được Hỗ Trợ

### Hình Ảnh
- JPEG, JPG, PNG, GIF
- Hiển thị trực tiếp trong chat
- Click để xem full size

### Video
- MP4, AVI, MOV
- Icon video + link download

### Audio
- MP3, WAV
- Icon music + link download

### Documents
- PDF: Icon PDF + link download
- DOC/DOCX: Icon Word + link download
- TXT: Icon text + link download
- HTML: Icon code + link download

### Code Files
- PY, CPP, C, JAVA, JS
- Icon code + link download

## Giới Hạn

- **Kích thước file tối đa**: 10MB
- **Số file mỗi tin nhắn**: 1 file (có thể mở rộng thành nhiều file)
- **Loại file**: Theo danh sách hỗ trợ trong middleware

## Tính Năng Bổ Sung Có Thể Phát Triển

1. **Multiple files per message**: Cho phép gửi nhiều file cùng lúc
2. **Drag & Drop**: Kéo thả file vào chat area
3. **Copy/Paste**: Paste ảnh từ clipboard
4. **Video/Audio preview**: Xem trước video/nghe audio trong chat
5. **Progress bar**: Hiển thị tiến trình upload
6. **File compression**: Nén ảnh trước khi upload
7. **Thumbnail generation**: Tạo thumbnail cho video

## Testing Checklist

- [ ] Upload ảnh (JPG, PNG, GIF)
- [ ] Upload video (MP4)
- [ ] Upload audio (MP3)
- [ ] Upload document (PDF, DOCX)
- [ ] Upload code file (PY, CPP, JS)
- [ ] Hiển thị preview đúng
- [ ] Gửi tin nhắn chỉ có file (không có text)
- [ ] Gửi tin nhắn có cả text và file
- [ ] Download file từ tin nhắn
- [ ] Xem ảnh full size
- [ ] Kiểm tra file size limit (>10MB)
- [ ] Kiểm tra file type không hỗ trợ
- [ ] Clear preview
- [ ] Socket.IO realtime update

## Lưu Ý Bảo Mật

1. **File validation**: Validate MIME type và extension
2. **File size limit**: Enforce 10MB limit
3. **Virus scanning**: Nên thêm virus scan (optional)
4. **CDN security**: Cloudinary URLs có thể public, cân nhắc signed URLs
5. **Storage quota**: Monitor Cloudinary storage usage

## Môi Trường

### Development
- Cloudinary folder: `tutornis_dev/messages`

### Production
- Cloudinary folder: `tutornis/messages`
- Cần configure CLOUDINARY_FOLDER env variable
