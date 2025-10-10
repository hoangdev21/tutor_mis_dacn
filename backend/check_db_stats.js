const mongoose = require('mongoose');
const dotenv = require('dotenv');
const TutorProfile = require('./src/models/TutorProfile');
const StudentProfile = require('./src/models/StudentProfile');
const Course = require('./src/models/Course');
const User = require('./src/models/User');

// Load environment variables
dotenv.config();

async function checkDatabaseStats() {
  try {
    console.log('🔍 Checking database statistics...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB\n');

    // Get collection stats
    const db = mongoose.connection.db;

    // Count tutors - Updated logic using User.approvalStatus
    const totalTutors = await TutorProfile.countDocuments();
    
    // Count approved tutors using aggregation with User model
    const approvedTutorsResult = await User.aggregate([
        {
            $match: {
                role: 'tutor',
                approvalStatus: 'approved',
                isActive: true
            }
        },
        {
            $lookup: {
                from: 'tutorprofiles',
                localField: '_id',
                foreignField: 'userId',
                as: 'profile'
            }
        },
        {
            $match: {
                'profile.0': { $exists: true } // Ensure tutor has a profile
            }
        },
        {
            $count: 'total'
        }
    ]);
    
    const approvedTutors = approvedTutorsResult.length > 0 ? approvedTutorsResult[0].total : 0;
    const pendingTutors = await User.countDocuments({ role: 'tutor', approvalStatus: 'pending' });

    console.log('👨‍🏫 TUTOR STATISTICS:');
    console.log(`   Total tutors: ${totalTutors}`);
    console.log(`   Approved tutors: ${approvedTutors}`);
    console.log(`   Pending tutors: ${pendingTutors}\n`);

    // Count students
    const totalStudents = await StudentProfile.countDocuments();
    console.log('👨‍🎓 STUDENT STATISTICS:');
    console.log(`   Total students: ${totalStudents}\n`);

    // Count courses
    const totalCourses = await Course.countDocuments();
    console.log('📚 COURSE STATISTICS:');
    console.log(`   Total courses: ${totalCourses}\n`);

    // Count users by role
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const tutorUsers = await User.countDocuments({ role: 'tutor' });
    const studentUsers = await User.countDocuments({ role: 'student' });

    console.log('👥 USER STATISTICS:');
    console.log(`   Total users: ${totalUsers}`);
    console.log(`   Admin users: ${adminUsers}`);
    console.log(`   Tutor users: ${tutorUsers}`);
    console.log(`   Student users: ${studentUsers}\n`);

    // Sample data check
    console.log('📋 SAMPLE DATA CHECK:');

    // Check tutor profiles
    const sampleTutors = await TutorProfile.find().limit(3).select('fullName isApproved subjects address hourlyRate');
    console.log('Sample Tutors:');
    sampleTutors.forEach((tutor, idx) => {
      console.log(`   ${idx + 1}. ${tutor.fullName || 'No name'} - Approved: ${tutor.isApproved} - Subjects: ${tutor.subjects?.map(s => s.subject).join(', ') || 'None'}`);
    });

    // Check student profiles
    const sampleStudents = await StudentProfile.find().limit(3).select('fullName grade subjects');
    console.log('\nSample Students:');
    sampleStudents.forEach((student, idx) => {
      console.log(`   ${idx + 1}. ${student.fullName || 'No name'} - Grade: ${student.grade || 'Unknown'}`);
    });

    // Check courses
    const sampleCourses = await Course.find().limit(3).select('title subject tutor price');
    console.log('\nSample Courses:');
    sampleCourses.forEach((course, idx) => {
      console.log(`   ${idx + 1}. ${course.title || 'No title'} - Subject: ${course.subject || 'Unknown'} - Price: ${course.price || 0}`);
    });

    console.log('\n🎯 FINAL SUMMARY:');
    console.log(`   Gia sư: ${approvedTutors} (đã duyệt)`);
    console.log(`   Học sinh: ${totalStudents}`);
    console.log(`   Khóa học: ${totalCourses}`);

    // Check if data matches the displayed stats
    console.log('\n⚠️  COMPARISON WITH DISPLAYED STATS:');
    console.log(`   Displayed: Gia sư: 0, Học sinh: 11, Khóa học: 0`);
    console.log(`   Database:  Gia sư: ${approvedTutors}, Học sinh: ${totalStudents}, Khóa học: ${totalCourses}`);

    if (approvedTutors === 0 && totalStudents === 11 && totalCourses === 0) {
      console.log('✅ Stats match displayed values');
    } else {
      console.log('❌ Stats do NOT match - Database has different values!');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the check
checkDatabaseStats();