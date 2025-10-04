// Check existing users in database
const mongoose = require('mongoose');
const { User } = require('./src/models');
require('dotenv').config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        const users = await User.find({}).select('email role isEmailVerified approvalStatus isActive');
        
        console.log(`📊 Total users: ${users.length}\n`);
        console.log('Users in database:');
        console.log('='.repeat(80));
        
        users.forEach((u, index) => {
            console.log(`${index + 1}. Email: ${u.email}`);
            console.log(`   Role: ${u.role}`);
            console.log(`   Email Verified: ${u.isEmailVerified ? '✅' : '❌'}`);
            console.log(`   Active: ${u.isActive ? '✅' : '❌'}`);
            console.log(`   Approval Status: ${u.approvalStatus || 'N/A'}`);
            console.log('-'.repeat(80));
        });
        
        // Check for test accounts
        console.log('\n🔍 Checking for test accounts:');
        const studentTest = await User.findOne({ email: 'student@test.com' });
        const tutorTest = await User.findOne({ email: 'tutor@test.com' });
        
        console.log(`student@test.com: ${studentTest ? '✅ Exists' : '❌ Not found'}`);
        console.log(`tutor@test.com: ${tutorTest ? '✅ Exists' : '❌ Not found'}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkUsers();
