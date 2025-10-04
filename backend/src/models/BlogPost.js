const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    maxlength: 300
  },
  featuredImage: {
    type: String
  },
  category: {
    type: String,
    enum: ['education', 'teaching_tips', 'student_guide', 'exam_prep', 'career_advice', 'technology', 'other'],
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  // Trạng thái
  status: {
    type: String,
    enum: ['draft', 'pending', 'published', 'rejected'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  // Moderation
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  // SEO
  metaTitle: {
    type: String,
    maxlength: 60
  },
  metaDescription: {
    type: String,
    maxlength: 160
  },
  // Thống kê
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  // Engagement
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Reading time estimation
  readingTime: {
    type: Number, // minutes
    default: 1
  }
}, {
  timestamps: true
});

// Index
blogPostSchema.index({ slug: 1 }, { unique: true });
blogPostSchema.index({ authorId: 1, status: 1 });
blogPostSchema.index({ category: 1, status: 1 });
blogPostSchema.index({ tags: 1 });
blogPostSchema.index({ publishedAt: -1 });
blogPostSchema.index({ views: -1 });

// Populate author info
blogPostSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'authorId',
    select: 'email role',
    populate: {
      path: 'profile',
      select: 'fullName avatar'
    }
  });
  next();
});

// Generate slug from title
blogPostSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-') + '-' + Date.now();
  }
  
  // Calculate reading time (average 200 words per minute)
  if (this.isModified('content')) {
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.ceil(wordCount / 200);
  }
  
  // Generate excerpt if not provided
  if (this.isModified('content') && !this.excerpt) {
    const plainText = this.content.replace(/<[^>]*>/g, ''); // Remove HTML tags
    this.excerpt = plainText.substring(0, 250) + '...';
  }
  
  next();
});

// Increment views
blogPostSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Toggle like
blogPostSchema.methods.toggleLike = function(userId) {
  const index = this.likedBy.indexOf(userId);
  
  if (index > -1) {
    // Unlike
    this.likedBy.splice(index, 1);
    this.likes -= 1;
  } else {
    // Like
    this.likedBy.push(userId);
    this.likes += 1;
  }
  
  return this.save();
};

// Publish post
blogPostSchema.methods.publish = function() {
  this.status = 'published';
  this.publishedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('BlogPost', blogPostSchema);