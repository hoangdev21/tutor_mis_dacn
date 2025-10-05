const { BlogPost, User, StudentProfile, TutorProfile } = require('../models');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');

// @desc    Create new blog post
// @route   POST /api/blog/posts
// @access  Private
const createPost = async (req, res) => {
  try {
    const { title, content, type, category, tags, status } = req.body;

    // Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung bài viết không được để trống'
      });
    }

    // Process uploaded images
    let images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadToCloudinary(file.buffer, {
            folder: `${process.env.CLOUDINARY_FOLDER || 'tutormis'}/blog`,
            transformation: [
              { width: 1200, height: 800, crop: 'limit' },
              { quality: 'auto:good' }
            ]
          });

          images.push({
            url: result.secure_url,
            publicId: result.public_id,
            caption: file.originalname
          });
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
        }
      }
    }

    // Create post
    const post = await BlogPost.create({
      author: req.user._id,
      authorRole: req.user.role,
      title: title || '',
      content,
      images,
      type: type || 'status',
      category: category || 'general',
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      status: status === 'draft' ? 'draft' : 'pending', // Auto submit for moderation unless draft
      isPublic: true
    });

    // Populate author info
    await post.populate([
      { path: 'author', select: 'email role' }
    ]);

    res.status(201).json({
      success: true,
      message: status === 'draft' ? 'Lưu bản nháp thành công' : 'Bài viết đã được gửi để duyệt',
      data: post
    });

  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo bài viết',
      error: error.message
    });
  }
};

// @desc    Update blog post
// @route   PUT /api/blog/posts/:id
// @access  Private (Author only)
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, category, tags, status, removeImageIds } = req.body;

    const post = await BlogPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    // Check ownership
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa bài viết này'
      });
    }

    // Cannot edit approved/rejected posts
    if (post.status === 'approved' || post.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Không thể chỉnh sửa bài viết đã được duyệt hoặc từ chối'
      });
    }

    // Remove specified images
    if (removeImageIds && Array.isArray(removeImageIds)) {
      for (const publicId of removeImageIds) {
        const imageIndex = post.images.findIndex(img => img.publicId === publicId);
        if (imageIndex > -1) {
          try {
            await deleteFromCloudinary(publicId);
            post.images.splice(imageIndex, 1);
          } catch (error) {
            console.error('Error deleting image:', error);
          }
        }
      }
    }

    // Add new images
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadToCloudinary(file.buffer, {
            folder: `${process.env.CLOUDINARY_FOLDER || 'tutormis'}/blog`,
            transformation: [
              { width: 1200, height: 800, crop: 'limit' },
              { quality: 'auto:good' }
            ]
          });

          post.images.push({
            url: result.secure_url,
            publicId: result.public_id,
            caption: file.originalname
          });
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
        }
      }
    }

    // Update fields
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (type !== undefined) post.type = type;
    if (category !== undefined) post.category = category;
    if (tags !== undefined) {
      post.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    }
    
    // Update status - resubmit for moderation if was draft
    if (status !== undefined) {
      post.status = status === 'draft' ? 'draft' : 'pending';
      if (post.status === 'pending') {
        post.moderationNote = undefined;
        post.moderatedBy = undefined;
        post.moderatedAt = undefined;
      }
    }

    await post.save();
    await post.populate([
      { path: 'author', select: 'email role' }
    ]);

    res.json({
      success: true,
      message: 'Cập nhật bài viết thành công',
      data: post
    });

  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật bài viết',
      error: error.message
    });
  }
};

// @desc    Delete blog post
// @route   DELETE /api/blog/posts/:id
// @access  Private (Author only)
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await BlogPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    // Check ownership or admin
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa bài viết này'
      });
    }

    // Delete images from Cloudinary
    if (post.images && post.images.length > 0) {
      for (const image of post.images) {
        try {
          await deleteFromCloudinary(image.publicId);
        } catch (error) {
          console.error('Error deleting image:', error);
        }
      }
    }

    await post.deleteOne();

    res.json({
      success: true,
      message: 'Xóa bài viết thành công'
    });

  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa bài viết',
      error: error.message
    });
  }
};

// @desc    Get single blog post
// @route   GET /api/blog/posts/:id
// @access  Public
const getPost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await BlogPost.findById(id)
      .populate([
        { path: 'author', select: 'email role' },
        { path: 'likes.user', select: 'email' },
        { path: 'comments.user', select: 'email' },
        { path: 'shares.user', select: 'email' }
      ]);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    // Check if user can view post
    if (post.status !== 'approved') {
      // Only author and admin can view non-approved posts
      if (!req.user || 
          (post.author._id.toString() !== req.user._id.toString() && req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          message: 'Bài viết này chưa được duyệt'
        });
      }
    }

    // Increment view count
    if (post.status === 'approved') {
      post.views += 1;
      await post.save();
    }

    // Get author profile
    let authorProfile = null;
    if (post.authorRole === 'student') {
      authorProfile = await StudentProfile.findOne({ userId: post.author._id })
        .select('fullName avatar bio');
    } else if (post.authorRole === 'tutor') {
      authorProfile = await TutorProfile.findOne({ userId: post.author._id })
        .select('fullName avatar bio expertise');
    }

    res.json({
      success: true,
      data: {
        ...post.toObject(),
        authorProfile
      }
    });

  } catch (error) {
    console.error('Error getting post:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy bài viết',
      error: error.message
    });
  }
};

// @desc    Get all blog posts (with filters)
// @route   GET /api/blog/posts
// @access  Public
const getAllPosts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      type,
      author,
      status,
      search,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const query = {};

    // Public users only see approved posts
    if (!req.user || req.user.role !== 'admin') {
      query.status = 'approved';
      query.isPublic = true;
    } else if (status) {
      query.status = status;
    }

    // Filter by author (for user's own posts)
    if (author) {
      query.author = author;
    }

    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }

    // Filter by type
    if (type && type !== 'all') {
      query.type = type;
    }

    // Search in title and content
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = {};
    
    // Pinned posts always first
    sortOptions.isPinned = -1;
    sortOptions[sortBy] = sortOrder;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await BlogPost.find(query)
      .populate([
        { path: 'author', select: 'email role' },
        { path: 'comments.user', select: 'email role' },
        { path: 'comments.replies.user', select: 'email role' }
      ])
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get author profiles and commenter profiles
    for (const post of posts) {
      // Get post author profile
      if (post.authorRole === 'student') {
        post.authorProfile = await StudentProfile.findOne({ userId: post.author._id })
          .select('fullName avatar bio')
          .lean();
      } else if (post.authorRole === 'tutor') {
        post.authorProfile = await TutorProfile.findOne({ userId: post.author._id })
          .select('fullName avatar bio expertise')
          .lean();
      }

      // Get commenter profiles
      if (post.comments && post.comments.length > 0) {
        for (const comment of post.comments) {
          if (comment.user) {
            const userRole = comment.user.role;
            if (userRole === 'student') {
              comment.userProfile = await StudentProfile.findOne({ userId: comment.user._id })
                .select('fullName avatar')
                .lean();
            } else if (userRole === 'tutor') {
              comment.userProfile = await TutorProfile.findOne({ userId: comment.user._id })
                .select('fullName avatar')
                .lean();
            }
          }
          
          // Get reply user profiles
          if (comment.replies && comment.replies.length > 0) {
            for (const reply of comment.replies) {
              if (reply.user) {
                const replyUserRole = reply.user.role;
                if (replyUserRole === 'student') {
                  reply.userProfile = await StudentProfile.findOne({ userId: reply.user._id })
                    .select('fullName avatar')
                    .lean();
                } else if (replyUserRole === 'tutor') {
                  reply.userProfile = await TutorProfile.findOne({ userId: reply.user._id })
                    .select('fullName avatar')
                    .lean();
                }
              }
            }
          }
        }
      }

      // Add isLiked flag for current user
      if (req.user) {
        post.isLiked = post.likes.some(like => 
          like.user.toString() === req.user._id.toString()
        );
      }
    }

    const total = await BlogPost.countDocuments(query);

    res.json({
      success: true,
      data: posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error getting posts:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách bài viết',
      error: error.message
    });
  }
};

// @desc    Like/Unlike a post
// @route   POST /api/blog/posts/:id/like
// @access  Private
const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await BlogPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    // Check if already liked
    const likeIndex = post.likes.findIndex(
      like => like.user.toString() === req.user._id.toString()
    );

    let message;
    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
      message = 'Đã bỏ thích';
    } else {
      // Like
      post.likes.push({
        user: req.user._id,
        createdAt: new Date()
      });
      message = 'Đã thích bài viết';
    }

    await post.save();

    res.json({
      success: true,
      message,
      data: {
        likeCount: post.likes.length,
        isLiked: likeIndex === -1
      }
    });

  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi thích bài viết',
      error: error.message
    });
  }
};

// @desc    Add comment to post
// @route   POST /api/blog/posts/:id/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung bình luận không được để trống'
      });
    }

    const post = await BlogPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    const comment = {
      user: req.user._id,
      content: content.trim(),
      createdAt: new Date()
    };

    post.comments.push(comment);
    await post.save();

    // Populate the new comment
    await post.populate([
      { path: 'comments.user', select: 'email role' }
    ]);

    const newComment = post.comments[post.comments.length - 1];

    // Get commenter profile
    let commenterProfile = null;
    if (req.user.role === 'student') {
      commenterProfile = await StudentProfile.findOne({ userId: req.user._id })
        .select('fullName avatar')
        .lean();
    } else if (req.user.role === 'tutor') {
      commenterProfile = await TutorProfile.findOne({ userId: req.user._id })
        .select('fullName avatar')
        .lean();
    }

    res.status(201).json({
      success: true,
      message: 'Đã thêm bình luận',
      data: {
        comment: newComment,
        commenterProfile,
        commentCount: post.comments.length
      }
    });

  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi thêm bình luận',
      error: error.message
    });
  }
};

// @desc    Delete comment
// @route   DELETE /api/blog/posts/:id/comments/:commentId
// @access  Private (Comment author or post author or admin)
const deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const post = await BlogPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    const commentIndex = post.comments.findIndex(
      c => c._id.toString() === commentId
    );

    if (commentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bình luận'
      });
    }

    const comment = post.comments[commentIndex];

    // Check permission
    if (comment.user.toString() !== req.user._id.toString() &&
        post.author.toString() !== req.user._id.toString() &&
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa bình luận này'
      });
    }

    post.comments.splice(commentIndex, 1);
    await post.save();

    res.json({
      success: true,
      message: 'Đã xóa bình luận',
      data: {
        commentCount: post.comments.length
      }
    });

  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa bình luận',
      error: error.message
    });
  }
};

// @desc    Like/Unlike a comment
// @route   POST /api/blog/posts/:id/comments/:commentId/like
// @access  Private
const likeComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const post = await BlogPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bình luận'
      });
    }

    // Check if user already liked this comment
    const likeIndex = comment.likes.findIndex(
      like => like.user.toString() === req.user._id.toString()
    );

    if (likeIndex > -1) {
      // Unlike
      comment.likes.splice(likeIndex, 1);
    } else {
      // Like
      comment.likes.push({
        user: req.user._id,
        createdAt: new Date()
      });
    }

    await post.save();

    res.json({
      success: true,
      message: likeIndex > -1 ? 'Đã bỏ thích bình luận' : 'Đã thích bình luận',
      data: {
        likeCount: comment.likes.length,
        isLiked: likeIndex === -1
      }
    });

  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi thích bình luận',
      error: error.message
    });
  }
};

// @desc    Reply to a comment
// @route   POST /api/blog/posts/:id/comments/:commentId/reply
// @access  Private
const replyToComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung phản hồi không được để trống'
      });
    }

    const post = await BlogPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bình luận'
      });
    }

    const reply = {
      user: req.user._id,
      content: content.trim(),
      createdAt: new Date()
    };

    comment.replies.push(reply);
    await post.save();

    // Populate the new reply
    await post.populate([
      { path: 'comments.replies.user', select: 'email role' }
    ]);

    const newReply = comment.replies[comment.replies.length - 1];

    // Get replier profile
    let replierProfile = null;
    if (req.user.role === 'student') {
      replierProfile = await StudentProfile.findOne({ userId: req.user._id })
        .select('fullName avatar')
        .lean();
    } else if (req.user.role === 'tutor') {
      replierProfile = await TutorProfile.findOne({ userId: req.user._id })
        .select('fullName avatar')
        .lean();
    }

    res.status(201).json({
      success: true,
      message: 'Đã thêm phản hồi',
      data: {
        reply: newReply,
        replierProfile,
        replyCount: comment.replies.length
      }
    });

  } catch (error) {
    console.error('Error replying to comment:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi phản hồi bình luận',
      error: error.message
    });
  }
};

// @desc    Share a post
// @route   POST /api/blog/posts/:id/share
// @access  Private
const sharePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { caption } = req.body;

    const post = await BlogPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    if (post.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể chia sẻ bài viết đã được duyệt'
      });
    }

    // Check if already shared
    const alreadyShared = post.shares.some(
      share => share.user.toString() === req.user._id.toString()
    );

    if (!alreadyShared) {
      post.shares.push({
        user: req.user._id,
        sharedAt: new Date(),
        caption: caption || ''
      });

      await post.save();
    }

    res.json({
      success: true,
      message: 'Đã chia sẻ bài viết',
      data: {
        shareCount: post.shares.length
      }
    });

  } catch (error) {
    console.error('Error sharing post:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi chia sẻ bài viết',
      error: error.message
    });
  }
};

// @desc    Get user's own posts
// @route   GET /api/blog/my-posts
// @access  Private
const getMyPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { author: req.user._id };
    
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await BlogPost.find(query)
      .populate([
        { path: 'author', select: 'email role' },
        { path: 'comments.user', select: 'email role' },
        { path: 'comments.replies.user', select: 'email role' }
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get author profiles and commenter profiles for each post
    for (const post of posts) {
      // Get post author profile
      if (post.author && post.author.role) {
        if (post.author.role === 'student') {
          post.authorProfile = await StudentProfile.findOne({ userId: post.author._id })
            .select('fullName avatar bio')
            .lean();
        } else if (post.author.role === 'tutor') {
          post.authorProfile = await TutorProfile.findOne({ userId: post.author._id })
            .select('fullName avatar bio expertise')
            .lean();
        }
      }

      // Get commenter profiles
      if (post.comments && post.comments.length > 0) {
        for (const comment of post.comments) {
          if (comment.user) {
            const userRole = comment.user.role;
            if (userRole === 'student') {
              comment.userProfile = await StudentProfile.findOne({ userId: comment.user._id })
                .select('fullName avatar')
                .lean();
            } else if (userRole === 'tutor') {
              comment.userProfile = await TutorProfile.findOne({ userId: comment.user._id })
                .select('fullName avatar')
                .lean();
            }
          }
          
          // Get reply user profiles
          if (comment.replies && comment.replies.length > 0) {
            for (const reply of comment.replies) {
              if (reply.user) {
                const replyUserRole = reply.user.role;
                if (replyUserRole === 'student') {
                  reply.userProfile = await StudentProfile.findOne({ userId: reply.user._id })
                    .select('fullName avatar')
                    .lean();
                } else if (replyUserRole === 'tutor') {
                  reply.userProfile = await TutorProfile.findOne({ userId: reply.user._id })
                    .select('fullName avatar')
                    .lean();
                }
              }
            }
          }
        }
      }
    }

    const total = await BlogPost.countDocuments(query);

    res.json({
      success: true,
      data: posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error getting my posts:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy bài viết của bạn',
      error: error.message
    });
  }
};

module.exports = {
  createPost,
  updatePost,
  deletePost,
  getPost,
  getAllPosts,
  toggleLike,
  addComment,
  deleteComment,
  likeComment,
  replyToComment,
  sharePost,
  getMyPosts
};
