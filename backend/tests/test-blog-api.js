/**
 * Test script để debug lỗi GET /api/blog/posts?status=approved&limit=50
 * Chạy: npm test hoặc node tests/test-blog-api.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { BlogPost, User, StudentProfile, TutorProfile } = require('../src/models');

async function testBlogAPI() {
  try {
    console.log('🔌 Kết nối database...');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('❌ MONGODB_URI chưa được định nghĩa');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Kết nối database thành công');

    // Test 1: Kiểm tra BlogPost schema
    console.log('\n📋 Test 1: Kiểm tra BlogPost collection...');
    const totalPosts = await BlogPost.countDocuments();
    console.log(`Total posts in DB: ${totalPosts}`);

    // Test 2: Kiểm tra approved posts
    console.log('\n📋 Test 2: Lấy approved posts...');
    const approvedPosts = await BlogPost.find({ status: 'approved' }).lean();
    console.log(`Approved posts: ${approvedPosts.length}`);
    if (approvedPosts.length > 0) {
      console.log('Sample approved post:', JSON.stringify(approvedPosts[0], null, 2));
    }

    // Test 3: Simulate getAllPosts query
    console.log('\n📋 Test 3: Simulate getAllPosts với populated author...');
    const page = 1;
    const limit = 50;
    const skip = (page - 1) * limit;

    try {
      const query = { status: 'approved', isPublic: true };
      
      const posts = await BlogPost.find(query)
        .populate([
          { path: 'author', select: 'email role' },
          { path: 'comments.user', select: 'email role' },
          { path: 'comments.replies.user', select: 'email role' }
        ])
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      console.log(`✅ Query thành công! Posts returned: ${posts.length}`);
      
      if (posts.length > 0) {
        console.log('First post structure:');
        const firstPost = posts[0];
        console.log(`  - _id: ${firstPost._id}`);
        console.log(`  - title: ${firstPost.title}`);
        console.log(`  - author type: ${typeof firstPost.author}`);
        console.log(`  - author value: ${JSON.stringify(firstPost.author)}`);
        console.log(`  - authorRole: ${firstPost.authorRole}`);
        
        // Test 4: Simulasi lấy author profile
        console.log('\n📋 Test 4: Lấy author profile...');
        if (firstPost.author && firstPost.author._id) {
          const authorId = firstPost.author._id;
          console.log(`  Looking for author profile with userId: ${authorId}`);
          
          if (firstPost.authorRole === 'student') {
            const profile = await StudentProfile.findOne({ userId: authorId }).lean();
            console.log(`  ✅ Student profile found: ${profile ? 'YES' : 'NO'}`);
          } else if (firstPost.authorRole === 'tutor') {
            const profile = await TutorProfile.findOne({ userId: authorId }).lean();
            console.log(`  ✅ Tutor profile found: ${profile ? 'YES' : 'NO'}`);
          }
        }
      }

      // Test 5: Check total count
      console.log('\n📋 Test 5: Total approved posts count...');
      const total = await BlogPost.countDocuments(query);
      console.log(`Total: ${total}`);

    } catch (queryError) {
      console.error('❌ Query Error:', queryError.message);
      console.error('Stack:', queryError.stack);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

testBlogAPI();
