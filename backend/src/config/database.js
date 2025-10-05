const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Tạo indexes
    await createIndexes();
    
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    // User indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ approvalStatus: 1 });
    
    // TutorProfile indexes
    await db.collection('tutorprofiles').createIndex({ 'subjects.subject': 1 });
    await db.collection('tutorprofiles').createIndex({ 'subjects.level': 1 });
    await db.collection('tutorprofiles').createIndex({ 'address.city': 1 });
    
    // TutorRequest indexes
    await db.collection('tutorrequests').createIndex({ subject: 1, level: 1 });
    await db.collection('tutorrequests').createIndex({ status: 1 });
    
    // Course indexes
    await db.collection('courses').createIndex({ tutorId: 1, studentId: 1 });
    await db.collection('courses').createIndex({ status: 1 });
    
    // Message indexes
    await db.collection('messages').createIndex({ senderId: 1, receiverId: 1 });
    await db.collection('messages').createIndex({ courseId: 1 });
    
    // BlogPost indexes
    // Note: slug index removed - not used in current schema
    await db.collection('blogposts').createIndex({ category: 1 });
    
    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Index creation error:', error.message);
  }
};

module.exports = connectDB;