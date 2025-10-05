// ===== BLOG SOCIAL FEED JAVASCRIPT =====

const API_BASE_URL = 'http://localhost:5000/api';
let blogCurrentUser = null;
let allPosts = [];
let currentFilter = 'all';
let selectedImages = [];
let selectedTags = [];
let currentView = 'feed'; // 'feed', 'my-posts', 'pending'

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('userData');
    
    if (!token || !userData) {
        window.location.href = '/index.html';
        return;
    }

    blogCurrentUser = JSON.parse(userData);
    
    // Load user profile to get avatar
    await loadUserProfile();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load posts
    await loadPosts();
});

// Load user profile
async function loadUserProfile() {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/${blogCurrentUser.role}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
                // Update current user with profile data
                blogCurrentUser.profile = data.data;
                
                // Get avatar URL
                const avatarUrl = getAvatarUrl(data.data);
                
                // Update all avatar images
                document.querySelectorAll('.create-post-avatar img, .comment-input-avatar img, #modalUserAvatar').forEach(img => {
                    img.src = avatarUrl;
                });
                
                // Update user name in modal
                const modalUserName = document.getElementById('modalUserName');
                if (modalUserName) {
                    modalUserName.textContent = data.data.fullName || blogCurrentUser.email;
                }
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Get avatar URL with fallback
function getAvatarUrl(profile) {
    if (profile.avatar) {
        // If avatar is a full URL, use it directly
        if (profile.avatar.startsWith('http')) {
            return profile.avatar;
        }
        // Otherwise, assume it's a path relative to the backend
        return `${API_BASE_URL.replace('/api', '')}${profile.avatar}`;
    }
    
    // Fallback to UI Avatars
    const name = profile.fullName || blogCurrentUser.email || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff&size=200`;
}

// Setup event listeners
function setupEventListeners() {
    // Create post button
    const createPostInput = document.getElementById('createPostInput');
    const createPhotoBtn = document.getElementById('createPhotoBtn');
    
    if (createPostInput) {
        createPostInput.addEventListener('click', openCreatePostModal);
    }
    
    if (createPhotoBtn) {
        createPhotoBtn.addEventListener('click', openCreatePostModal);
    }
    
    // Modal controls
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelPostBtn = document.getElementById('cancelPostBtn');
    const submitPostBtn = document.getElementById('submitPostBtn');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeCreatePostModal);
    }
    
    if (cancelPostBtn) {
        cancelPostBtn.addEventListener('click', closeCreatePostModal);
    }
    
    if (submitPostBtn) {
        submitPostBtn.addEventListener('click', handleCreatePost);
    }
    
    // Post content input
    const postContent = document.getElementById('postContent');
    if (postContent) {
        postContent.addEventListener('input', () => {
            submitPostBtn.disabled = !postContent.value.trim();
        });
    }
    
    // Add photo button in modal
    const addPhotoBtn = document.getElementById('addPhotoBtn');
    const postImagesInput = document.getElementById('postImagesInput');
    
    if (addPhotoBtn && postImagesInput) {
        addPhotoBtn.addEventListener('click', () => {
            postImagesInput.click();
        });
        
        postImagesInput.addEventListener('change', handleImageSelection);
    }
    
    // Add title button
    const addTitleBtn = document.getElementById('addTitleBtn');
    const titleGroup = document.getElementById('titleGroup');
    
    if (addTitleBtn && titleGroup) {
        addTitleBtn.addEventListener('click', () => {
            titleGroup.style.display = titleGroup.style.display === 'none' ? 'block' : 'none';
            addTitleBtn.classList.toggle('active');
        });
    }
    
    // Add tag button
    const addTagBtn = document.getElementById('addTagBtn');
    if (addTagBtn) {
        addTagBtn.addEventListener('click', openTagModal);
    }
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            filterPosts();
        });
    });
    
    // Sidebar menu items
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            document.querySelectorAll('.sidebar-menu-item').forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            this.classList.add('active');
            
            // Get the text content
            const text = this.querySelector('span').textContent;
            
            if (text === 'Bảng tin') {
                currentView = 'feed';
                loadPosts();
            } else if (text === 'Bài viết của tôi') {
                currentView = 'my-posts';
                loadMyPosts();
            } else if (text === 'Bài viết chờ duyệt') {
                currentView = 'pending';
                loadPendingPosts();
            }
        });
    });
}

// Open create post modal
function openCreatePostModal() {
    const modal = document.getElementById('createPostModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Reset form
        document.getElementById('postContent').value = '';
        document.getElementById('postTitle').value = '';
        document.getElementById('postCategory').value = 'general';
        selectedImages = [];
        selectedTags = [];
        updateImagePreview();
        updateTagsDisplay();
    }
}

// Close create post modal
function closeCreatePostModal() {
    const modal = document.getElementById('createPostModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Handle image selection
function handleImageSelection(event) {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedImages.push({
                    file: file,
                    url: e.target.result
                });
                updateImagePreview();
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Reset input
    event.target.value = '';
}

// Update image preview
function updateImagePreview() {
    const container = document.getElementById('imagePreviewContainer');
    const grid = document.getElementById('imagePreviewGrid');
    
    if (selectedImages.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    grid.innerHTML = '';
    
    selectedImages.forEach((img, index) => {
        const item = document.createElement('div');
        item.className = 'image-preview-item';
        item.innerHTML = `
            <img src="${img.url}" alt="Preview">
            <button class="image-remove-btn" onclick="removeImage(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        grid.appendChild(item);
    });
}

// Remove image
window.removeImage = function(index) {
    selectedImages.splice(index, 1);
    updateImagePreview();
};

// Open tag modal
function openTagModal() {
    const modal = document.getElementById('tagModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Setup tag input
        const tagInput = document.getElementById('tagInput');
        tagInput.focus();
        
        tagInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tag = tagInput.value.trim();
                if (tag && !selectedTags.includes(tag)) {
                    selectedTags.push(tag);
                    updateTagsList();
                    updateTagsDisplay();
                }
                tagInput.value = '';
            }
        };
        
        updateTagsList();
    }
}

// Close tag modal
window.closeTagModal = function() {
    const modal = document.getElementById('tagModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
};

// Update tags list in modal
function updateTagsList() {
    const tagsList = document.getElementById('tagsList');
    if (!tagsList) return;
    
    tagsList.innerHTML = '';
    
    selectedTags.forEach((tag, index) => {
        const tagItem = document.createElement('div');
        tagItem.className = 'tag-item';
        tagItem.innerHTML = `
            <span>#${tag}</span>
            <span class="remove-tag" onclick="removeTag(${index})">×</span>
        `;
        tagsList.appendChild(tagItem);
    });
}

// Remove tag
window.removeTag = function(index) {
    selectedTags.splice(index, 1);
    updateTagsList();
    updateTagsDisplay();
};

// Update tags display in main form
function updateTagsDisplay() {
    const display = document.getElementById('tagsDisplay');
    if (!display) return;
    
    if (selectedTags.length === 0) {
        display.style.display = 'none';
        return;
    }
    
    display.style.display = 'flex';
    display.innerHTML = '';
    
    selectedTags.forEach(tag => {
        const tagItem = document.createElement('div');
        tagItem.className = 'tag-item';
        tagItem.innerHTML = `<span>#${tag}</span>`;
        display.appendChild(tagItem);
    });
}

// Handle create post
async function handleCreatePost() {
    const content = document.getElementById('postContent').value.trim();
    const title = document.getElementById('postTitle').value.trim();
    const category = document.getElementById('postCategory').value;
    const status = document.getElementById('postStatus')?.value || 'pending';
    
    if (!content) {
        showNotification('Vui lòng nhập nội dung bài viết', 'error');
        return;
    }
    
    try {
        const submitBtn = document.getElementById('submitPostBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng...';
        
        const formData = new FormData();
        formData.append('content', content);
        if (title) formData.append('title', title);
        formData.append('category', category);
        formData.append('status', status);
        
        if (selectedTags.length > 0) {
            formData.append('tags', JSON.stringify(selectedTags));
        }
        
        // Add images
        selectedImages.forEach((img, index) => {
            formData.append('images', img.file);
        });
        
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/blog/posts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showNotification('Đăng bài thành công! Bài viết đang chờ admin duyệt.', 'success');
            closeCreatePostModal();
            await reloadCurrentView();
        } else {
            showNotification(data.message || 'Có lỗi xảy ra khi đăng bài', 'error');
        }
    } catch (error) {
        console.error('Error creating post:', error);
        showNotification('Có lỗi xảy ra khi đăng bài', 'error');
    } finally {
        const submitBtn = document.getElementById('submitPostBtn');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Đăng bài';
    }
}

// Load posts
async function loadPosts() {
    try {
        const feedContainer = document.getElementById('blogFeed');
        feedContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/blog/posts?status=approved&limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            allPosts = data.data || [];
            filterPosts();
        } else {
            feedContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Không thể tải bài viết</h3>
                    <p>${data.message || 'Có lỗi xảy ra'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        const feedContainer = document.getElementById('blogFeed');
        feedContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Không thể tải bài viết</h3>
                <p>Vui lòng thử lại sau</p>
            </div>
        `;
    }
}

// Filter posts
function filterPosts() {
    const feedContainer = document.getElementById('blogFeed');
    
    let filteredPosts = allPosts;
    
    if (currentFilter !== 'all') {
        filteredPosts = allPosts.filter(post => post.category === currentFilter);
    }
    
    if (filteredPosts.length === 0) {
        feedContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>Chưa có bài viết</h3>
                <p>Hãy là người đầu tiên đăng bài trong danh mục này!</p>
            </div>
        `;
        return;
    }
    
    feedContainer.innerHTML = '';
    filteredPosts.forEach(post => {
        const postElement = createPostElement(post);
        feedContainer.appendChild(postElement);
    });
}

// Create post element
function createPostElement(post) {
    const article = document.createElement('article');
    article.className = 'post-card';
    article.dataset.postId = post._id;
    
    // Get author info - check for populated author object or authorProfile
    const author = post.author || {};
    const authorProfile = post.authorProfile || {};
    const authorName = authorProfile.fullName || author.fullName || author.email || 'Người dùng';
    const authorRole = post.authorRole || author.role || 'student';
    
    // Get author avatar from profile or author object
    let authorAvatar;
    if (authorProfile.avatar) {
        authorAvatar = getAuthorAvatar(authorProfile);
    } else {
        authorAvatar = getAuthorAvatar(author);
    }
    
    // Format time
    const timeAgo = getTimeAgo(new Date(post.createdAt));
    
    // Images HTML - handle both array of strings and array of objects
    let imagesHTML = '';
    if (post.images && post.images.length > 0) {
        const imageClass = post.images.length === 1 ? 'single' : 
                          post.images.length === 2 ? 'double' : 
                          post.images.length === 3 ? 'triple' : 'multiple';
        
        imagesHTML = `<div class="post-images ${imageClass}">`;
        post.images.slice(0, 4).forEach((img, index) => {
            // Handle both string URLs and image objects
            const imgUrl = typeof img === 'string' ? img : img.url;
            const fullImgUrl = imgUrl.startsWith('http') ? imgUrl : `${API_BASE_URL.replace('/api', '')}${imgUrl}`;
            const moreClass = index === 3 && post.images.length > 4 ? 'more-overlay' : '';
            const moreAttr = index === 3 && post.images.length > 4 ? `data-more="${post.images.length - 4}"` : '';
            imagesHTML += `
                <div class="post-image ${moreClass}" ${moreAttr}>
                    <img src="${fullImgUrl}" alt="Post image" onclick="openImageViewer('${fullImgUrl}')">
                </div>
            `;
        });
        imagesHTML += '</div>';
    }
    
    // Tags HTML
    let tagsHTML = '';
    if (post.tags && post.tags.length > 0) {
        tagsHTML = '<div class="post-tags">';
        post.tags.forEach(tag => {
            tagsHTML += `<span class="post-tag">#${tag}</span>`;
        });
        tagsHTML += '</div>';
    }
    
    // Check if user liked the post
    const isLiked = post.likes && post.likes.some(like => 
        (typeof like === 'object' ? like.user : like) === blogCurrentUser.id
    );
    const likeCount = post.likes ? post.likes.length : 0;
    const commentCount = post.comments ? post.comments.length : 0;
    
    article.innerHTML = `
        <div class="post-header">
            <div class="post-author-info">
                <div class="post-avatar hoverable"
                     data-user-id="${post.author?._id || post.author}"
                     data-user-name="${authorName}"
                     data-user-avatar="${authorAvatar}"
                     onclick="showAvatarHoverCard(event, this)">
                    <img src="${authorAvatar}" alt="${authorName}">
                </div>
                <div class="post-author-details">
                    <div class="post-author-name">
                        ${authorName}
                        ${post.status !== 'approved' ? `
                            <span class="post-status-badge ${post.status}">
                                <i class="fas fa-clock"></i>
                                ${getStatusName(post.status)}
                            </span>
                        ` : ''}
                    </div>
                    <div class="post-meta">
                        <span class="post-time">
                            <i class="far fa-clock"></i>
                            ${timeAgo}
                        </span>
                        <span class="post-role-badge ${authorRole}">${getRoleName(authorRole)}</span>
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
                ${(post.author?._id !== blogCurrentUser.id && post.author !== blogCurrentUser.id) ? `
                    <button class="post-contact-btn" onclick="contactAuthor('${post.author?._id || post.author}', '${authorName}')" title="Liên hệ với ${authorName}">
                        <i class="fas fa-comment-dots"></i>
                        <span>Liên hệ</span>
                    </button>
                ` : ''}
                ${(post.author?._id === blogCurrentUser.id || post.author === blogCurrentUser.id) ? `
                    <button class="post-menu-btn" onclick="openPostMenu('${post._id}')">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                ` : ''}
            </div>
        </div>
        
        <div class="post-content">
            ${post.title ? `<h3 class="post-title">${escapeHtml(post.title)}</h3>` : ''}
            <div class="post-text">${escapeHtml(post.content)}</div>
            ${imagesHTML}
            ${tagsHTML}
        </div>
        
        <div class="post-stats">
            <div class="post-stats-left" onclick="showLikes('${post._id}')">
                ${likeCount > 0 ? `
                    <span class="like-icon-stack">
                        <i class="fas fa-heart"></i>
                    </span>
                    <span>${likeCount} lượt thích</span>
                ` : ''}
            </div>
            <div class="post-stats-right">
                ${commentCount > 0 ? `<span class="post-stat">${commentCount} bình luận</span>` : ''}
            </div>
        </div>
        
        <div class="post-actions">
            <button class="post-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post._id}')">
                <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                <span>Thích</span>
            </button>
            <button class="post-action-btn" onclick="openCommentsModal('${post._id}')">
                <i class="far fa-comment"></i>
                <span>Bình luận</span>
            </button>
            <button class="post-action-btn share" onclick="sharePost('${post._id}')">
                <i class="fas fa-share"></i>
                <span>Chia sẻ</span>
            </button>
        </div>
        
        <div class="post-comments" id="comments-${post._id}">
            ${renderComments(post.comments || [], post._id)}
        </div>
        
        <div class="comment-input-wrapper">
            <div class="comment-input-avatar">
                <img src="${getAvatarUrl(blogCurrentUser.profile || {})}" alt="Your avatar">
            </div>
            <div class="comment-input-container">
                <textarea class="comment-input" id="comment-input-${post._id}" placeholder="Viết bình luận..." rows="1"></textarea>
                <button class="comment-send-btn" onclick="addComment('${post._id}')">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;
    
    return article;
}

// Get author avatar
function getAuthorAvatar(author) {
    if (author.avatar) {
        if (author.avatar.startsWith('http')) {
            return author.avatar;
        }
        return `${API_BASE_URL.replace('/api', '')}${author.avatar}`;
    }
    
    const name = author.fullName || author.email || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff&size=200`;
}

// Render comments - only show 2 latest
function renderComments(comments, postId) {
    if (!comments || comments.length === 0) {
        return '';
    }
    
    // Show only 2 latest comments
    const commentsToShow = comments.slice(-2);
    const hasMore = comments.length > 2;
    
    let html = commentsToShow.map(comment => {
        // Get commenter info from userProfile first, fallback to user
        const commenter = comment.user || {};
        const commenterProfile = comment.userProfile || {};
        const commenterName = commenterProfile.fullName || commenter.fullName || commenter.email || 'Người dùng';
        
        // Get avatar from profile or user
        let commenterAvatar;
        if (commenterProfile.avatar) {
            commenterAvatar = getAuthorAvatar(commenterProfile);
        } else {
            commenterAvatar = getAuthorAvatar(commenter);
        }
        
        const timeAgo = getTimeAgo(new Date(comment.createdAt));
        
        return `
            <div class="comment-item">
                <div class="comment-avatar hoverable"
                     data-user-id="${comment.user?._id || comment.user}"
                     data-user-name="${commenterName}"
                     data-user-avatar="${commenterAvatar}"
                     onclick="showAvatarHoverCard(event, this)">
                    <img src="${commenterAvatar}" alt="${commenterName}">
                </div>
                <div class="comment-content">
                    <div class="comment-bubble">
                        <div class="comment-author">${commenterName}</div>
                        <div class="comment-text">${escapeHtml(comment.content || comment.text)}</div>
                    </div>
                    <div class="comment-actions">
                        <span class="comment-time">${timeAgo}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add "View all comments" button if there are more than 2 comments
    if (hasMore) {
        html += `
            <button class="view-all-comments-btn" onclick="openCommentsModal('${postId}', event)">
                Xem tất cả ${comments.length} bình luận
            </button>
        `;
    }
    
    return html;
}

// Render all comments for modal
function renderAllComments(comments, postId) {
    if (!comments || comments.length === 0) {
        return '<p style="text-align: center; color: #6b7280; padding: 20px;">Chưa có bình luận nào</p>';
    }
    
    return comments.map(comment => {
        // Get commenter info from userProfile first, fallback to user
        const commenter = comment.user || {};
        const commenterProfile = comment.userProfile || {};
        const commenterName = commenterProfile.fullName || commenter.fullName || commenter.email || 'Người dùng';
        const commenterId = comment.user?._id || comment.user;
        
        // Get avatar from profile or user
        let commenterAvatar;
        if (commenterProfile.avatar) {
            commenterAvatar = getAuthorAvatar(commenterProfile);
        } else {
            commenterAvatar = getAuthorAvatar(commenter);
        }
        
        const timeAgo = getTimeAgo(new Date(comment.createdAt));
        
        // Check if current user liked this comment
        const isLiked = comment.likes && comment.likes.some(like => 
            (typeof like === 'object' ? like.user : like) === blogCurrentUser.id
        );
        const likeCount = comment.likes ? comment.likes.length : 0;
        const replyCount = comment.replies ? comment.replies.length : 0;
        
        // Render replies
        let repliesHTML = '';
        if (comment.replies && comment.replies.length > 0) {
            repliesHTML = `
                <div class="comment-replies" id="replies-${comment._id}">
                    ${comment.replies.map(reply => {
                        const replier = reply.user || {};
                        const replierProfile = reply.userProfile || {};
                        const replierName = replierProfile.fullName || replier.fullName || replier.email || 'Người dùng';
                        const replierAvatar = replierProfile.avatar ? getAuthorAvatar(replierProfile) : getAuthorAvatar(replier);
                        const replyTimeAgo = getTimeAgo(new Date(reply.createdAt));
                        
                        return `
                            <div class="reply-item">
                                <div class="comment-avatar hoverable" 
                                     data-user-id="${reply.user?._id || reply.user}"
                                     data-user-name="${replierName}"
                                     data-user-avatar="${replierAvatar}"
                                     onclick="showAvatarHoverCard(event, this)">
                                    <img src="${replierAvatar}" alt="${replierName}">
                                </div>
                                <div class="comment-content">
                                    <div class="comment-bubble">
                                        <div class="comment-author">${replierName}</div>
                                        <div class="comment-text">${escapeHtml(reply.content)}</div>
                                    </div>
                                    <div class="comment-actions">
                                        <span class="comment-time">${replyTimeAgo}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        return `
            <div class="modal-comment-item" id="comment-${comment._id}">
                <div class="comment-avatar hoverable" 
                     data-user-id="${commenterId}"
                     data-user-name="${commenterName}"
                     data-user-avatar="${commenterAvatar}"
                     onclick="showAvatarHoverCard(event, this)">
                    <img src="${commenterAvatar}" alt="${commenterName}">
                </div>
                <div class="comment-content">
                    <div class="comment-bubble">
                        <div class="comment-author">${commenterName}</div>
                        <div class="comment-text">${escapeHtml(comment.content || comment.text)}</div>
                    </div>
                    <div class="comment-actions">
                        <span class="comment-time">${timeAgo}</span>
                    </div>
                    <div class="comment-interactions">
                        <button class="comment-action-btn ${isLiked ? 'liked' : ''}" 
                                onclick="likeComment('${postId}', '${comment._id}')">
                            <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                            <span>${likeCount > 0 ? likeCount : 'Thích'}</span>
                        </button>
                        <button class="comment-action-btn" 
                                onclick="toggleReplyInput('${comment._id}')">
                            <i class="fas fa-reply"></i>
                            <span>Phản hồi</span>
                        </button>
                        <button class="comment-action-btn share" 
                                onclick="shareComment('${postId}', '${comment._id}')">
                            <i class="fas fa-share"></i>
                            <span>Chia sẻ</span>
                        </button>
                    </div>
                    ${replyCount > 0 && !repliesHTML ? `
                        <button class="show-replies-btn" onclick="toggleReplies('${comment._id}')">
                            <i class="fas fa-chevron-down"></i>
                            <span>Xem ${replyCount} phản hồi</span>
                        </button>
                    ` : ''}
                    ${repliesHTML}
                    <div class="reply-input-wrapper" id="reply-input-${comment._id}">
                        <div class="reply-input-container">
                            <textarea class="reply-input" 
                                      id="reply-text-${comment._id}" 
                                      placeholder="Viết phản hồi..." 
                                      rows="1"></textarea>
                            <button class="reply-send-btn" 
                                    onclick="sendReply('${postId}', '${comment._id}')">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Open comments modal
window.openCommentsModal = async function(postId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    // Find the post
    const post = allPosts.find(p => p._id === postId);
    if (!post) return;
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('commentsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'commentsModal';
        modal.className = 'comments-modal';
        document.body.appendChild(modal);
    }
    
    // Get author info
    const author = post.author || {};
    const authorProfile = post.authorProfile || {};
    const authorName = authorProfile.fullName || author.fullName || author.email || 'Người dùng';
    const authorAvatar = authorProfile.avatar ? getAuthorAvatar(authorProfile) : getAuthorAvatar(author);
    
    // Render modal content
    modal.innerHTML = `
        <div class="comments-modal-content">
            <div class="comments-modal-header">
                <h3>Bình luận</h3>
                <button class="modal-close-btn" onclick="closeCommentsModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="comments-modal-body">
                <div class="modal-post-preview">
                    <div class="post-author-info">
                        <div class="post-avatar">
                            <img src="${authorAvatar}" alt="${authorName}">
                        </div>
                        <div class="post-author-details">
                            <div class="post-author-name">${authorName}</div>
                            <div class="post-time">${getTimeAgo(new Date(post.createdAt))}</div>
                        </div>
                    </div>
                    ${post.title ? `<h4 style="margin: 8px 0; font-size: 16px; padding: 20px;">${escapeHtml(post.title)}</h4>` : ''}
                    <div class="post-text">${escapeHtml(post.content)}</div>
                </div>
                
                <div class="modal-comments-list">
                    ${renderAllComments(post.comments || [], postId)}
                </div>
            </div>
            
            <div class="comments-modal-footer">
                <div class="modal-comment-input-wrapper">
                    <div class="comment-input-avatar">
                        <img src="${getAvatarUrl(blogCurrentUser.profile || {})}" alt="Your avatar">
                    </div>
                    <div class="modal-comment-input-container">
                        <textarea class="comment-input" id="modal-comment-input-${postId}" placeholder="Viết bình luận..." rows="1"></textarea>
                        <button class="comment-send-btn" onclick="addCommentFromModal('${postId}')">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Focus input
    setTimeout(() => {
        const input = document.getElementById(`modal-comment-input-${postId}`);
        if (input) input.focus();
    }, 100);
};

// Close comments modal
window.closeCommentsModal = function() {
    const modal = document.getElementById('commentsModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
};

// Add comment from modal
window.addCommentFromModal = async function(postId) {
    const input = document.getElementById(`modal-comment-input-${postId}`);
    const text = input.value.trim();
    
    if (!text) return;
    
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/blog/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: text })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            input.value = '';
            
            // Reload posts based on current view
            await reloadCurrentView();
            
            // Reopen modal with updated comments
            await openCommentsModal(postId);
        } else {
            showNotification(data.message || 'Có lỗi xảy ra', 'error');
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        showNotification('Có lỗi xảy ra', 'error');
    }
};

// Load my posts
async function loadMyPosts() {
    try {
        const feedContainer = document.getElementById('blogFeed');
        feedContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/blog/my-posts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            allPosts = data.data || [];
            currentFilter = 'all'; // Reset filter
            filterPosts();
        } else {
            feedContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <h3>Bạn chưa có bài viết nào</h3>
                    <p>Hãy tạo bài viết đầu tiên của bạn!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading my posts:', error);
        const feedContainer = document.getElementById('blogFeed');
        feedContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Không thể tải bài viết</h3>
                <p>Vui lòng thử lại sau</p>
            </div>
        `;
    }
}

// Load pending posts
async function loadPendingPosts() {
    try {
        const feedContainer = document.getElementById('blogFeed');
        feedContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/blog/my-posts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Filter only pending and draft posts
            allPosts = (data.data || []).filter(post => 
                post.status === 'pending' || post.status === 'draft'
            );
            currentFilter = 'all'; // Reset filter
            
            if (allPosts.length === 0) {
                feedContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-clock"></i>
                        <h3>Không có bài viết chờ duyệt</h3>
                        <p>Tất cả bài viết của bạn đã được duyệt hoặc bạn chưa có bài viết nào đang chờ duyệt</p>
                    </div>
                `;
            } else {
                filterPosts();
            }
        } else {
            feedContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <h3>Không có bài viết chờ duyệt</h3>
                    <p>Tất cả bài viết của bạn đã được duyệt</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading pending posts:', error);
        const feedContainer = document.getElementById('blogFeed');
        feedContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Không thể tải bài viết</h3>
                <p>Vui lòng thử lại sau</p>
            </div>
        `;
    }
}

// Toggle like
window.toggleLike = async function(postId) {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/blog/posts/${postId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Reload posts based on current view
            await reloadCurrentView();
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        showNotification('Có lỗi xảy ra', 'error');
    }
};

// Add comment
window.addComment = async function(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const text = input.value.trim();
    
    if (!text) return;
    
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/blog/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: text })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            input.value = '';
            
            // Reload posts based on current view
            await reloadCurrentView();
        } else {
            showNotification(data.message || 'Có lỗi xảy ra', 'error');
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        showNotification('Có lỗi xảy ra', 'error');
    }
};

// Reload current view
async function reloadCurrentView() {
    if (currentView === 'my-posts') {
        await loadMyPosts();
    } else if (currentView === 'pending') {
        await loadPendingPosts();
    } else {
        await loadPosts();
    }
}

// Focus comment input
window.focusComment = function(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    if (input) {
        input.focus();
    }
};

// Share post
window.sharePost = function(postId) {
    const url = `${window.location.origin}/frontend/pages/blog-detail.html?id=${postId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Chia sẻ bài viết',
            url: url
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            showNotification('Đã sao chép link bài viết', 'success');
        });
    }
};

// Show likes
window.showLikes = function(postId) {
    // TODO: Implement modal to show list of users who liked the post
    console.log('Show likes for post:', postId);
};

// Open post menu
window.openPostMenu = function(postId) {
    // TODO: Implement post menu (edit, delete)
    console.log('Open menu for post:', postId);
};

// Open image viewer
window.openImageViewer = function(imageUrl) {
    // TODO: Implement image viewer modal
    window.open(imageUrl, '_blank');
};

// Utility functions
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
}

function getRoleName(role) {
    const roles = {
        'student': 'Học sinh',
        'tutor': 'Gia sư',
        'admin': 'Quản trị viên'
    };
    return roles[role] || role;
}

function getStatusName(status) {
    const statuses = {
        'pending': 'Chờ duyệt',
        'draft': 'Nháp',
        'approved': 'Đã duyệt',
        'rejected': 'Bị từ chối'
    };
    return statuses[status] || status;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        font-weight: 500;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Contact author - redirect to messages page
window.contactAuthor = function(authorId, authorName) {
    if (!authorId) {
        showNotification('Không thể liên hệ với người dùng này', 'error');
        return;
    }
    
    // Find the post to get author details
    const post = allPosts.find(p => (p.author?._id || p.author) === authorId);
    let authorAvatar = '';
    let authorRole = 'student';
    let authorEmail = '';
    
    if (post) {
        const author = post.author || {};
        const authorProfile = post.authorProfile || {};
        
        if (authorProfile.avatar) {
            authorAvatar = getAuthorAvatar(authorProfile);
        } else {
            authorAvatar = getAuthorAvatar(author);
        }
        
        authorRole = post.authorRole || author.role || 'student';
        authorEmail = author.email || '';
    }
    
    // Save recipient info to localStorage for messages page
    const recipientInfo = {
        id: authorId,
        name: authorName,
        avatar: authorAvatar,
        role: authorRole,
        email: authorEmail
    };
    
    localStorage.setItem('chatRecipient', JSON.stringify(recipientInfo));
    
    // Redirect to messages page based on current role
    // Use 'recipientId' parameter to match what messages.js expects
    const userRole = blogCurrentUser.role || 'student';
    window.location.href = `../${userRole}/messages.html?recipientId=${authorId}`;
};

// Logout function
window.logout = function() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userData');
    window.location.href = '/index.html';
};

// ===== COMMENT INTERACTION FUNCTIONS =====

// Like/Unlike a comment
window.likeComment = async function(postId, commentId) {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/blog/posts/${postId}/comments/${commentId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Reload current view to refresh data
            await reloadCurrentView();
            
            // Reopen modal with updated data
            await openCommentsModal(postId);
        } else {
            showNotification(data.message || 'Có lỗi xảy ra', 'error');
        }
    } catch (error) {
        console.error('Error liking comment:', error);
        showNotification('Có lỗi xảy ra', 'error');
    }
};

// Toggle reply input visibility
window.toggleReplyInput = function(commentId) {
    const replyWrapper = document.getElementById(`reply-input-${commentId}`);
    if (replyWrapper) {
        replyWrapper.classList.toggle('active');
        if (replyWrapper.classList.contains('active')) {
            const textarea = document.getElementById(`reply-text-${commentId}`);
            if (textarea) textarea.focus();
        }
    }
};

// Send reply to a comment
window.sendReply = async function(postId, commentId) {
    const textarea = document.getElementById(`reply-text-${commentId}`);
    const content = textarea.value.trim();
    
    if (!content) return;
    
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/blog/posts/${postId}/comments/${commentId}/reply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            textarea.value = '';
            
            // Reload current view to refresh data
            await reloadCurrentView();
            
            // Reopen modal with updated data
            await openCommentsModal(postId);
            
            showNotification('Đã thêm phản hồi', 'success');
        } else {
            showNotification(data.message || 'Có lỗi xảy ra', 'error');
        }
    } catch (error) {
        console.error('Error replying to comment:', error);
        showNotification('Có lỗi xảy ra', 'error');
    }
};

// Toggle replies visibility
window.toggleReplies = function(commentId) {
    const repliesDiv = document.getElementById(`replies-${commentId}`);
    const btn = event.target.closest('.show-replies-btn');
    
    if (repliesDiv) {
        const isVisible = repliesDiv.style.display !== 'none';
        repliesDiv.style.display = isVisible ? 'none' : 'block';
        
        if (btn) {
            const icon = btn.querySelector('i');
            const span = btn.querySelector('span');
            if (isVisible) {
                icon.className = 'fas fa-chevron-down';
                const replyCount = repliesDiv.querySelectorAll('.reply-item').length;
                span.textContent = `Xem ${replyCount} phản hồi`;
            } else {
                icon.className = 'fas fa-chevron-up';
                span.textContent = 'Ẩn phản hồi';
            }
        }
    }
};

// Share comment
window.shareComment = function(postId, commentId) {
    const url = `${window.location.origin}/frontend/pages/blog-detail.html?id=${postId}&comment=${commentId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Chia sẻ bình luận',
            url: url
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            showNotification('Đã sao chép link bình luận', 'success');
        });
    }
};

// ===== AVATAR HOVER CARD FUNCTIONS =====

let avatarHoverTimeout = null;
let currentHoverCard = null;

// Show avatar hover card
window.showAvatarHoverCard = function(event, element) {
    event.stopPropagation();
    
    const userId = element.dataset.userId;
    const userName = element.dataset.userName;
    const userAvatar = element.dataset.userAvatar;
    
    // Debug logs
    console.log('Avatar clicked:', { userId, userName, currentUserId: blogCurrentUser.id });
    
    // Don't show card for current user (compare as strings)
    if (userId && blogCurrentUser.id && userId.toString() === blogCurrentUser.id.toString()) {
        console.log('Same user, not showing card');
        return;
    }
    
    // Don't show card if userId is undefined or null
    if (!userId || userId === 'undefined' || userId === 'null') {
        console.log('Invalid userId, not showing card');
        return;
    }
    
    // Remove existing hover card
    if (currentHoverCard) {
        currentHoverCard.remove();
        currentHoverCard = null;
    }
    
    // Create hover card
    const card = document.createElement('div');
    card.className = 'avatar-hover-card';
    card.innerHTML = `
        <div class="hover-card-header">
            <img class="hover-card-avatar" src="${userAvatar}" alt="${userName}">
            <div class="hover-card-info">
                <h4>${userName}</h4>
                <p>Nhấn để liên hệ</p>
            </div>
        </div>
        <button class="hover-card-contact-btn" onclick="contactUser('${userId}', '${userName}', '${userAvatar}')">
            <i class="fas fa-comment-dots"></i>
            <span>Liên hệ ngay</span>
        </button>
    `;
    
    // Position card
    const rect = element.getBoundingClientRect();
    card.style.position = 'fixed';
    card.style.left = `${rect.left}px`;
    card.style.top = `${rect.bottom + 5}px`;
    
    // Adjust if card goes off-screen
    document.body.appendChild(card);
    const cardRect = card.getBoundingClientRect();
    
    if (cardRect.right > window.innerWidth) {
        card.style.left = `${rect.right - cardRect.width}px`;
    }
    
    if (cardRect.bottom > window.innerHeight) {
        card.style.top = `${rect.top - cardRect.height - 5}px`;
    }
    
    // Show card
    setTimeout(() => card.classList.add('active'), 10);
    currentHoverCard = card;
    
    // Remove card when clicking outside
    const removeCard = (e) => {
        if (!card.contains(e.target) && e.target !== element) {
            card.classList.remove('active');
            setTimeout(() => {
                card.remove();
                currentHoverCard = null;
            }, 200);
            document.removeEventListener('click', removeCard);
        }
    };
    
    setTimeout(() => document.addEventListener('click', removeCard), 100);
};

// Contact user from hover card
window.contactUser = function(userId, userName, userAvatar) {
    if (!userId) {
        showNotification('Không thể liên hệ với người dùng này', 'error');
        return;
    }
    
    // Save recipient info to localStorage for messages page
    const recipientInfo = {
        id: userId,
        name: userName,
        avatar: userAvatar,
        role: 'student', // Default, will be updated on messages page
        email: ''
    };
    
    localStorage.setItem('chatRecipient', JSON.stringify(recipientInfo));
    
    // Redirect to messages page based on current role
    const userRole = blogCurrentUser.role || 'student';
    window.location.href = `../${userRole}/messages.html?recipientId=${userId}`;
};
