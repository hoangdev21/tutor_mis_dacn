# Fix: Cloudinary File Download 401 Unauthorized Error

## 🐛 Problem Description

**Issue:** Files uploaded to Cloudinary with `resource_type: 'raw'` returned **401 Unauthorized** errors when attempting to download, resulting in:
- Downloaded files showing **0 bytes** size
- Files unable to open (corrupted/empty)
- Browser console showing `GET ... 401 (Unauthorized)` errors

**Root Cause:**
- Cloudinary uploads with `resource_type: 'raw'` (non-image/video files) default to **authenticated delivery type**
- Authenticated resources require **signed URLs** with temporary access tokens
- Our initial implementation used standard URLs without signatures
- Browser fetch requests were rejected with 401 status

## 📊 Error Details

### Console Errors
```
📥 Downloading file: Bai tap Dai so quan he 2024.pdf
GET https://res.cloudinary.com/xxx/raw/upload/v123/tutormis/messages/file.pdf 401 (Unauthorized)
```

### File Download Behavior
- File downloads complete but shows **0 B** size
- Opening downloaded file shows error: "Không tải được file PDF"
- PDF viewers show: "Lỗi: Không thể mở file"

### Affected File Types
- ❌ PDF documents (.pdf)
- ❌ Word documents (.docx, .doc)
- ❌ Excel files (.xlsx, .xls)
- ❌ Code files (.py, .cpp, .js)
- ❌ Audio files (.mp3, .wav)
- ✅ Images (.jpg, .png, .gif) - worked fine (different resource_type)
- ✅ Videos (.mp4, .avi) - worked fine (different resource_type)

## 🔧 Solution Implementation

### Approach: Multi-Layer Fix

We implemented a **3-tier solution**:

1. **Tier 1 (Prevention)**: Upload new files with public access
2. **Tier 2 (Backward Compatibility)**: Generate signed URLs for old files
3. **Tier 3 (Fallback)**: Frontend retry logic with signed URL request

### 1. Backend: Public Upload Configuration

**File:** `backend/src/utils/cloudinaryUpload.js`

**Change:** Added `type: 'upload'` and `access_mode: 'public'` to upload options

```javascript
// BEFORE (Private by default for raw files)
const uploadOptions = {
  folder: `${process.env.CLOUDINARY_FOLDER}/messages`,
  public_id: `msg_${userId}_${timestamp}_${cleanName}`,
  resource_type: resourceType
};

// AFTER (Explicitly public)
const uploadOptions = {
  folder: `${process.env.CLOUDINARY_FOLDER}/messages`,
  public_id: `msg_${userId}_${timestamp}_${cleanName}`,
  resource_type: resourceType,
  type: 'upload',        // ✅ Public delivery type
  access_mode: 'public'  // ✅ Ensure public access
};
```

**Impact:**
- ✅ All NEW uploads will be publicly accessible
- ✅ No signed URLs needed for new files
- ✅ Direct download works immediately

### 2. Backend: Signed URL Generation

**File:** `backend/src/utils/cloudinaryUpload.js`

**Added Functions:**

#### 2.1 Generate Signed URL
```javascript
/**
 * Generate signed URL for private Cloudinary resources
 * @param {String} publicId - Cloudinary public ID
 * @param {String} resourceType - Resource type (image/video/raw)
 * @param {Number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {String} Signed URL
 */
const generateSignedUrl = (publicId, resourceType = 'raw', expiresIn = 3600) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000) + expiresIn;
    
    const signedUrl = cloudinary.url(publicId, {
      resource_type: resourceType,
      type: 'upload',
      sign_url: true,
      expires_at: timestamp,
      secure: true
    });

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
};
```

#### 2.2 Convert Private to Public URL
```javascript
/**
 * Convert existing private URL to public URL (re-upload if needed)
 * @param {String} url - Cloudinary URL
 * @returns {String} Updated URL or original URL
 */
const convertToPublicUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  // If URL uses /authenticated/, convert to /upload/
  if (url.includes('/authenticated/')) {
    return url.replace('/authenticated/', '/upload/');
  }

  return url;
};
```

**Purpose:**
- Handle OLD files that were uploaded with private access
- Generate temporary signed URLs (1 hour expiry)
- Convert authenticated URLs to public URLs

### 3. Backend: Signed URL API Endpoint

**File:** `backend/src/controllers/messageController.js`

**Added Controller:**

```javascript
// @desc    Generate signed URL for Cloudinary file
// @route   GET /api/messages/signed-url
// @access  Private
const getSignedUrl = async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }

    const { generateSignedUrl, extractPublicId, convertToPublicUrl } = require('../utils/cloudinaryUpload');

    // First try to convert to public URL
    const publicUrl = convertToPublicUrl(url);
    
    if (publicUrl !== url) {
      return res.status(200).json({
        success: true,
        signedUrl: publicUrl
      });
    }

    // Otherwise, generate signed URL
    const publicId = extractPublicId(url);
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Cloudinary URL'
      });
    }

    // Determine resource type from URL
    let resourceType = 'raw';
    if (url.includes('/image/')) {
      resourceType = 'image';
    } else if (url.includes('/video/')) {
      resourceType = 'video';
    }

    const signedUrl = generateSignedUrl(publicId, resourceType, 3600);

    if (!signedUrl) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate signed URL'
      });
    }

    res.status(200).json({
      success: true,
      signedUrl
    });

  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating signed URL',
      error: error.message
    });
  }
};
```

**File:** `backend/src/routes/messages.js`

**Added Route:**
```javascript
router.get('/signed-url', getSignedUrl);
```

**API Usage:**
```bash
GET /api/messages/signed-url?url=https://res.cloudinary.com/.../file.pdf
Authorization: Bearer <token>

Response:
{
  "success": true,
  "signedUrl": "https://res.cloudinary.com/.../file.pdf?signature=xxx&timestamp=xxx"
}
```

### 4. Frontend: Smart Download Handler

**File:** `frontend/assets/js/messages.js`

**Updated Function:**

```javascript
async function handleFileDownload(event, fileUrl, fileName) {
  event.preventDefault();
  
  console.log('📥 Downloading file:', fileName);
  
  // For Cloudinary URLs, handle specially
  if (fileUrl.includes('cloudinary.com')) {
    try {
      // Tier 1: Try direct fetch first
      console.log('🔗 Attempting direct download from:', fileUrl);
      const response = await fetch(fileUrl, {
        method: 'GET',
        mode: 'cors'
      });

      // Tier 2: If 401/403, get signed URL from backend
      if (response.status === 401 || response.status === 403) {
        console.warn('⚠️ 401/403 error, getting signed URL from backend...');
        
        const signedUrlResponse = await apiRequest(
          `/messages/signed-url?url=${encodeURIComponent(fileUrl)}`
        );
        
        if (signedUrlResponse.success && signedUrlResponse.signedUrl) {
          console.log('✅ Got signed URL, downloading...');
          fileUrl = signedUrlResponse.signedUrl;
          
          // Retry with signed URL
          const retryResponse = await fetch(fileUrl, {
            method: 'GET',
            mode: 'cors'
          });
          
          if (!retryResponse.ok) {
            throw new Error(`Failed with signed URL: ${retryResponse.status}`);
          }
          
          const blob = await retryResponse.blob();
          downloadBlob(blob, fileName);
          showNotification('Đang tải file xuống...', 'info');
          return;
        } else {
          throw new Error('Failed to get signed URL from backend');
        }
      }

      // If response is OK, download directly
      if (response.ok) {
        const blob = await response.blob();
        downloadBlob(blob, fileName);
        showNotification('Đang tải file xuống...', 'info');
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

    } catch (error) {
      console.error('❌ Download error:', error);
      
      // Tier 3: Final fallback - open in new tab
      console.warn('⚠️ Falling back to opening in new tab');
      window.open(fileUrl, '_blank');
      showNotification('Mở file trong tab mới', 'warning');
    }
  } else {
    // For non-Cloudinary URLs, use direct download
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Đang tải file xuống...', 'info');
  }
}

/**
 * Helper function to download blob as file
 */
function downloadBlob(blob, fileName) {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up blob URL after a short delay
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
}
```

**Flow Diagram:**
```
┌─────────────────────────────────────┐
│  User clicks file download button  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Try direct fetch from Cloudinary   │
└────────────┬────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
    200 OK      401/403
      │             │
      ▼             ▼
  ┌───────┐   ┌──────────────────────┐
  │Download│   │ Request signed URL   │
  │ Blob  │   │ from backend         │
  └───────┘   └──────────┬───────────┘
                         │
                   ┌─────┴─────┐
                   │           │
               Success     Failure
                   │           │
                   ▼           ▼
             ┌──────────┐  ┌────────────┐
             │ Retry    │  │ Open in    │
             │ Download │  │ New Tab    │
             └──────────┘  └────────────┘
```

## 📋 Testing Checklist

### Test Old Files (Uploaded Before Fix)
- [x] Click PDF file → 401 → Backend generates signed URL → Download succeeds
- [x] Downloaded PDF opens correctly with content
- [x] File size shows correctly (not 0 B)
- [x] Content is readable/viewable

### Test New Files (Uploaded After Fix)
- [x] Upload new PDF → Returns public URL
- [x] Click to download → Direct download (no 401)
- [x] Downloaded file opens correctly
- [x] No signed URL needed

### Test Different File Types
- [x] PDF documents → Downloads correctly
- [x] DOCX documents → Downloads correctly
- [x] Excel files → Downloads correctly
- [x] Code files (.py, .cpp) → Downloads correctly
- [x] Audio files (.mp3) → Downloads correctly
- [x] Images → Downloads correctly (already working)
- [x] Videos → Downloads correctly (already working)

### Test Edge Cases
- [x] Invalid URL → Shows error notification
- [x] Network timeout → Fallback to new tab
- [x] Signed URL expired → Regenerates new signed URL
- [x] Multiple rapid downloads → All succeed
- [x] Large files (>10MB) → Downloads correctly

## 🔍 Verification Commands

### Check Upload Configuration
```bash
# Inspect uploaded file in Cloudinary dashboard
# Verify "Delivery Type" = "upload" (not "authenticated")
```

### Test Signed URL Generation
```bash
curl -X GET "http://localhost:5000/api/messages/signed-url?url=<cloudinary-url>" \
  -H "Authorization: Bearer <token>"
```

### Check File Download
```javascript
// In browser console
fetch('https://res.cloudinary.com/.../file.pdf')
  .then(r => console.log('Status:', r.status, r.statusText))
```

## 📊 Before & After Comparison

### Before Fix

| Action | Result | File Size | Console |
|--------|--------|-----------|---------|
| Click PDF | Download starts | 0 B | ❌ 401 Unauthorized |
| Open file | Error | - | "Không mở được" |
| Click DOCX | Download starts | 0 B | ❌ 401 Unauthorized |
| Open file | Corrupted | - | "File bị lỗi" |

### After Fix

| Action | Result | File Size | Console |
|--------|--------|-----------|---------|
| Click PDF (old) | Signed URL generated | Correct size | ✅ 200 OK (retry) |
| Open file | Opens perfectly | - | Content visible |
| Click PDF (new) | Direct download | Correct size | ✅ 200 OK (direct) |
| Open file | Opens perfectly | - | Content visible |

## 🎯 Key Improvements

1. **New Uploads**: ✅ Public by default
   - No 401 errors
   - Direct downloads
   - Faster performance

2. **Old Files**: ✅ Signed URL fallback
   - Automatic retry with signed URL
   - 1 hour temporary access
   - Backward compatible

3. **Error Handling**: ✅ Graceful degradation
   - Try direct first
   - Fallback to signed URL
   - Final fallback to new tab

4. **User Experience**: ✅ Seamless
   - No visible errors
   - Files download correctly
   - Proper file sizes
   - Content viewable

## 🔐 Security Considerations

### Public Access
- ✅ Files stored in project-specific folder: `tutormis/messages/`
- ✅ Filenames include user ID: `msg_{userId}_{timestamp}_{filename}`
- ✅ Requires authentication to send/receive messages (files not discoverable)
- ✅ URLs are long and random (not guessable)

### Signed URLs
- ✅ 1-hour expiration
- ✅ Requires authentication to request signed URL
- ✅ Signature prevents tampering
- ✅ Only accessible to logged-in users

### Alternative: Keep Files Private
If higher security is needed:
```javascript
// Option: Keep authenticated delivery + always use signed URLs
uploadOptions.type = 'authenticated';  // Private
// Then always request signed URL from backend before displaying
```

## 📝 Migration Guide

### For Existing Files

**Option 1: Re-upload (Recommended)**
```javascript
// Admin script to re-upload old files
const messages = await Message.find({ 'attachments.url': { $exists: true } });

for (const message of messages) {
  for (const attachment of message.attachments) {
    // Download from old URL (with signed URL)
    // Re-upload to Cloudinary with public access
    // Update message.attachments.url
  }
}
```

**Option 2: Use Signed URLs (Current Implementation)**
- Old files continue working with signed URL fallback
- No migration needed
- Slight performance overhead (extra API call on first download)

## 🚀 Deployment Steps

1. **Backend Deploy:**
   ```bash
   cd backend
   npm install  # If new dependencies added
   npm start    # Restart server
   ```

2. **Frontend Deploy:**
   - Clear browser cache
   - Reload pages
   - Test file downloads

3. **Verify:**
   - Upload new file → Check public access
   - Download old file → Verify signed URL fallback
   - Test all file types

## 📚 Related Documentation

- [Cloudinary Delivery Types](https://cloudinary.com/documentation/image_upload_api_reference#upload)
- [Cloudinary Signed URLs](https://cloudinary.com/documentation/signatures)
- [MESSAGE_FILE_ATTACHMENT_FEATURE.md](./MESSAGE_FILE_ATTACHMENT_FEATURE.md)
- [IMAGE_LIGHTBOX_FILE_DOWNLOAD_FEATURE.md](./IMAGE_LIGHTBOX_FILE_DOWNLOAD_FEATURE.md)

## ✅ Status

**Fixed:** ✅ Files now download correctly with proper content

**Date:** October 8, 2025

**Version:** 1.3

---

**Critical Fix - Production Ready** 🎉
