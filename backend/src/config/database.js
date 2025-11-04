const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Tải biến môi trường từ file .env
dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Tạo indexes
    await createIndexes();
    
  } catch (error) {
    console.error('MongoDB Connection Lỗi:', error.message);
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
    
    await db.collection('tutorprofiles').createIndex({ 'subjects.subject': 1 });
    await db.collection('tutorprofiles').createIndex({ 'subjects.level': 1 });
    await db.collection('tutorprofiles').createIndex({ 'address.city': 1 });
    
    await db.collection('tutorrequests').createIndex({ subject: 1, level: 1 });
    await db.collection('tutorrequests').createIndex({ status: 1 });
    
    await db.collection('courses').createIndex({ tutorId: 1, studentId: 1 });
    await db.collection('courses').createIndex({ status: 1 });
    
    await db.collection('messages').createIndex({ senderId: 1, receiverId: 1 });
    await db.collection('messages').createIndex({ courseId: 1 });
    
    await db.collection('blogposts').createIndex({ category: 1 });
    
    console.log('Chỉ mục MongoDB đã được tạo thành công');
  } catch (error) {
    console.error('Lỗi khi tạo chỉ mục:', error.message);
  }
};

module.exports = connectDB;