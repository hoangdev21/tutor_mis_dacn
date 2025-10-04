const mongoose = require('mongoose');
const User = require('./src/models/User');
const StudentProfile = require('./src/models/StudentProfile');
const TutorProfile = require('./src/models/TutorProfile');

async function checkProfiles() {
    try {
        await mongoose.connect('mongodb://localhost:27017/tutornis');
        console.log('✅ Connected to MongoDB\n');
        
        // Find test users
        const student = await User.findOne({ email: 'student@test.com' });
        const tutor = await User.findOne({ email: 'tutor@test.com' });
        
        console.log('='.repeat(80));
        console.log('STUDENT@TEST.COM');
        console.log('='.repeat(80));
        if (student) {
            console.log('User ID:', student._id);
            const studentProfile = await StudentProfile.findOne({ userId: student._id });
            console.log('Profile:', studentProfile ? '✅ EXISTS' : '❌ MISSING');
            if (studentProfile) {
                console.log('Full Name:', studentProfile.fullName);
                console.log('Profile ID:', studentProfile._id);
            }
        } else {
            console.log('❌ User not found');
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('TUTOR@TEST.COM');
        console.log('='.repeat(80));
        if (tutor) {
            console.log('User ID:', tutor._id);
            const tutorProfile = await TutorProfile.findOne({ userId: tutor._id });
            console.log('Profile:', tutorProfile ? '✅ EXISTS' : '❌ MISSING');
            if (tutorProfile) {
                console.log('Full Name:', tutorProfile.fullName);
                console.log('Profile ID:', tutorProfile._id);
                console.log('Bio:', tutorProfile.bio);
                console.log('Subjects:', tutorProfile.subjects);
            }
        } else {
            console.log('❌ User not found');
        }
        
        console.log('\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkProfiles();
