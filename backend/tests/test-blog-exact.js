/**
 * Test script để simulate exact GET /api/blog/posts?status=approved&limit=50 request
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { BlogPost, User, StudentProfile, TutorProfile } = require('../src/models');

async function simulateGetAllPosts() {
  try {
    console.log('🔌 Kết nối database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Kết nối database thành công\n');

    // Simulate the exact code from getAllPosts function
    const req = {
      query: {
        page: '1',
        limit: '50',
        status: 'approved'
      },
      user: null // No user logged in for public request
    };

    console.log('📋 Simulate getAllPosts request:');
    console.log('Query params:', req.query);
    console.log('User:', req.user);

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

    // ng dùng chỉ xem bài viết đã được duyệt và công khai
    if (!req.user || req.user.role !== 'admin') {
      query.status = 'approved';
      query.isPublic = true;
    } else if (status) {
      query.status = status;
    }

    console.log('\n1️⃣  Query object:', query);

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = {};

    // Ghim bài viết lên đầu
    sortOptions.isPinned = -1;
    sortOptions[sortBy] = sortOrder;

    console.log('2️⃣  Sort options:', sortOptions);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log(`3️⃣  Pagination - page: ${page}, limit: ${limit}, skip: ${skip}`);

    console.log('\n⏳ Executing BlogPost.find()...');
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

    console.log(`✅ Found ${posts.length} posts`);

    console.log('\n⏳ Processing posts to add author profiles...');
    
    // Lấy hồ sơ tác giả và hồ sơ người bình luận cho mỗi bài viết
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      console.log(`\n  Processing post ${i + 1}/${posts.length}...`);
      console.log(`    - Post title: ${post.title}`);
      console.log(`    - Author type: ${typeof post.author}`);
      console.log(`    - Author value: ${JSON.stringify(post.author)}`);
      console.log(`    - AuthorRole: ${post.authorRole}`);
      
      try {
        // Lấy hồ sơ tác giả
        if (post.authorRole === 'student') {
          console.log(`    - Getting student profile for userId: ${post.author ? post.author._id : 'NULL'}`);
          post.authorProfile = post.author && post.author._id 
            ? await StudentProfile.findOne({ userId: post.author._id })
              .select('fullName avatar bio')
              .lean()
            : null;
          console.log(`    ✅ Student profile found: ${post.authorProfile ? 'YES' : 'NO'}`);
        } else if (post.authorRole === 'tutor') {
          console.log(`    - Getting tutor profile for userId: ${post.author ? post.author._id : 'NULL'}`);
          post.authorProfile = post.author && post.author._id
            ? await TutorProfile.findOne({ userId: post.author._id })
              .select('fullName avatar bio expertise')
              .lean()
            : null;
          console.log(`    ✅ Tutor profile found: ${post.authorProfile ? 'YES' : 'NO'}`);
        }

        // Lấy hồ sơ người bình luận
        if (post.comments && post.comments.length > 0) {
          console.log(`    - Processing ${post.comments.length} comments...`);
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

            // Lấy hồ sơ người trả lời
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

        // Kiểm tra xem người dùng đã thích bài viết chưa
        if (req.user) {
          post.isLiked = post.likes.some(like => 
            like.user.toString() === req.user._id.toString()
          );
        }
      } catch (postError) {
        console.error(`❌ Error processing post ${i + 1}:`, postError.message);
        throw postError;
      }
    }

    console.log('\n⏳ Getting total count...');
    const total = await BlogPost.countDocuments(query);
    console.log(`✅ Total documents: ${total}`);

    console.log('\n✅ getAllPosts simulation SUCCESS!');
    console.log('\n📊 Response structure:');
    console.log(JSON.stringify({
      success: true,
      data: posts.slice(0, 1),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }, null, 2));

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

simulateGetAllPosts();
