# Hướng Dẫn Sử Dụng Tính Năng Đính Kèm File

## Cho Developer

### 1. Upload File API

**Endpoint:** `POST /api/messages/upload`

**Headers:**
```javascript
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (FormData):**
```javascript
const formData = new FormData();
formData.append('attachment', fileObject);
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/..../msg_12345_1234567890_file.jpg",
    "fileName": "example.jpg",
    "fileType": "image/jpeg",
    "fileSize": 204800,
    "messageType": "image"
  }
}
```

### 2. Send Message with Attachment API

**Endpoint:** `POST /api/messages`

**Headers:**
```javascript
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "recipientId": "60d5ec49eb4c234d88a9b123",
  "content": "Check out this file!",
  "messageType": "image",
  "attachments": [
    {
      "url": "https://res.cloudinary.com/..../msg_12345_1234567890_file.jpg",
      "fileName": "example.jpg",
      "fileType": "image/jpeg",
      "fileSize": 204800
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49eb4c234d88a9b456",
    "senderId": {
      "_id": "60d5ec49eb4c234d88a9b789",
      "email": "user@example.com",
      "role": "student"
    },
    "receiverId": "60d5ec49eb4c234d88a9b123",
    "content": "Check out this file!",
    "messageType": "image",
    "attachments": [
      {
        "filename": "example.jpg",
        "originalName": "example.jpg",
        "mimeType": "image/jpeg",
        "size": 204800,
        "url": "https://res.cloudinary.com/..../msg_12345_1234567890_file.jpg"
      }
    ],
    "isRead": false,
    "createdAt": "2024-10-08T10:30:00.000Z"
  }
}
```

## Cho End User

### Cách Gửi File

#### Bước 1: Mở Chat
- Chọn một cuộc trò chuyện từ danh sách bên trái

#### Bước 2: Chọn File
- Click vào icon kẹp giấy (📎) bên cạnh ô nhập tin nhắn
- Cửa sổ chọn file của hệ thống sẽ mở ra
- Chọn file bạn muốn gửi

#### Bước 3: Xem Preview
**Nếu là ảnh:**
```
┌─────────────────────┐
│                     │
│   [Thumbnail Ảnh]   │
│                     │
│   filename.jpg      │
│                     │
│        [X]          │ ← Click để hủy
└─────────────────────┘
```

**Nếu là file khác:**
```
┌─────────────────────────────┐
│  📄  document.pdf           │
│      2.5 MB            [X]  │
└─────────────────────────────┘
```

#### Bước 4: Gửi
- Nhập nội dung tin nhắn (tùy chọn)
- Click nút Gửi (✈️)

### Cách Xem File Nhận Được

#### Ảnh
- Ảnh hiển thị trực tiếp trong tin nhắn
- Click vào ảnh để xem full size trong tab mới

#### File Khác
```
┌────────────────────────────────┐
│  📄  Report.pdf                │
│      Size: 1.2 MB              │
│                           ⬇️   │
└────────────────────────────────┘
```
- Click vào thẻ file để download

## Code Examples

### Frontend - Upload và Gửi File

```javascript
// 1. Handle file selection
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Check size
  if (file.size > 10 * 1024 * 1024) {
    alert('File quá lớn!');
    return;
  }

  // Show preview
  showFilePreview(file);

  // Upload to server
  const formData = new FormData();
  formData.append('attachment', file);

  const response = await apiRequest('/messages/upload', {
    method: 'POST',
    body: formData,
    headers: {}
  });

  // Store attachment data
  currentFileAttachment = response.data;
}

// 2. Send message with attachment
async function sendMessage() {
  const content = document.getElementById('messageInput').value;

  const messageData = {
    recipientId: currentRecipient._id,
    content: content || '',
    messageType: currentFileAttachment?.messageType || 'text',
    attachments: currentFileAttachment ? [currentFileAttachment] : []
  };

  await apiRequest('/messages', {
    method: 'POST',
    body: JSON.stringify(messageData)
  });

  clearFilePreview();
}
```

### Frontend - Render Messages

```javascript
function renderMessages() {
  messages.forEach(msg => {
    let attachmentHTML = '';
    
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach(att => {
        if (att.mimeType.startsWith('image/')) {
          // Render image
          attachmentHTML += `
            <div class="message-image">
              <img src="${att.url}" alt="${att.originalName}">
            </div>
          `;
        } else {
          // Render file
          const icon = getFileIcon(att.mimeType, att.originalName);
          const size = formatFileSize(att.size);
          
          attachmentHTML += `
            <div class="message-file">
              <a href="${att.url}" target="_blank">
                <i class="fas ${icon}"></i>
                <span>${att.originalName}</span>
                <span>${size}</span>
              </a>
            </div>
          `;
        }
      });
    }
    
    // Render message with attachment
    html += `
      <div class="message">
        ${msg.content ? `<p>${msg.content}</p>` : ''}
        ${attachmentHTML}
      </div>
    `;
  });
}
```

### Backend - Upload Handler

```javascript
const uploadAttachment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { buffer, originalname, mimetype, size } = req.file;

    // Upload to Cloudinary
    const uploadResult = await uploadMessageAttachment(
      buffer,
      userId.toString(),
      originalname,
      mimetype
    );

    // Determine message type
    let messageType = 'file';
    if (mimetype.startsWith('image/')) {
      messageType = 'image';
    } else if (mimetype.startsWith('video/')) {
      messageType = 'video';
    } else if (mimetype.startsWith('audio/')) {
      messageType = 'audio';
    }

    // Return file info
    res.json({
      success: true,
      data: {
        url: uploadResult.url,
        fileName: originalname,
        fileType: mimetype,
        fileSize: size,
        messageType: messageType
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to upload attachment',
      error: error.message
    });
  }
};
```

## UI/UX Guidelines

### Preview Area
```css
/* Positioned above message input */
.file-preview-container {
  padding: 12px 16px;
  background: #f0f2f5;
  border-top: 1px solid #e4e6eb;
}
```

### Image Preview
```css
.file-preview-image img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
}
```

### File Preview
```css
.file-preview-file {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  border-radius: 12px;
  padding: 12px 16px;
}
```

### Message Image
```css
.message-image {
  max-width: 300px;
  border-radius: 12px;
  cursor: pointer;
}

.message-image:hover {
  transform: scale(1.02);
}
```

### Message File
```css
.message-file {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}

.file-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}
```

## Error Handling

### File Too Large
```javascript
if (file.size > 10 * 1024 * 1024) {
  showError('File quá lớn. Kích thước tối đa là 10MB');
  return;
}
```

### Unsupported File Type
```javascript
// Backend validation in multer fileFilter
if (!isValidFileType) {
  cb(new Error('Định dạng file không được hỗ trợ'));
}
```

### Upload Failed
```javascript
try {
  const response = await uploadFile();
  if (!response.success) {
    showError('Không thể tải file lên');
  }
} catch (error) {
  showError('Lỗi khi tải file: ' + error.message);
}
```

## Cloudinary Configuration

### Environment Variables
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=tutornis
```

### Upload Options
```javascript
const uploadOptions = {
  folder: `${process.env.CLOUDINARY_FOLDER}/messages`,
  public_id: `msg_${userId}_${timestamp}_${filename}`,
  resource_type: 'auto', // image, video, or raw
  transformation: [
    { width: 1200, height: 1200, crop: 'limit' },
    { quality: 'auto:good' }
  ]
};
```

## Testing Scenarios

### 1. Test Upload Different File Types
```javascript
const testFiles = [
  { name: 'image.jpg', type: 'image/jpeg' },
  { name: 'video.mp4', type: 'video/mp4' },
  { name: 'audio.mp3', type: 'audio/mpeg' },
  { name: 'document.pdf', type: 'application/pdf' },
  { name: 'code.py', type: 'text/x-python' }
];
```

### 2. Test File Size Limits
```javascript
// Should pass
const validFile = new File([new ArrayBuffer(5 * 1024 * 1024)], 'test.jpg');

// Should fail
const invalidFile = new File([new ArrayBuffer(15 * 1024 * 1024)], 'large.jpg');
```

### 3. Test Message Display
- Send image only
- Send file only
- Send text + image
- Send text + file
- Receive messages with attachments

### 4. Test Edge Cases
- Upload while offline
- Upload very small file (< 1KB)
- Upload file with special characters in name
- Cancel upload mid-way
- Multiple rapid uploads
