// Create test users for automated testing
const mongoose = require('mongoose');
const { User, StudentProfile, TutorProfile } = require('./src/models');
require('dotenv').config();

async function createTestUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        // Test data
        const testUsers = [
            {
                email: 'student@test.com',
                password: '123456',
                role: 'student',
                fullName: 'Test Student',
                phone: '0123456789'
            },
            {
                email: 'tutor@test.com',
                password: '123456',
                role: 'tutor',
                fullName: 'Test Tutor',
                phone: '0987654321'
            }
        ];
        
        for (const userData of testUsers) {
            console.log(`\n📝 Processing ${userData.email}...`);
            
            // Check if user exists
            let user = await User.findOne({ email: userData.email });
            
            if (user) {
                console.log(`⚠️  User already exists. Updating...`);
                
                // Update password and verify email
                user.password = userData.password;
                user.isEmailVerified = true;
                user.isActive = true;
                
                if (userData.role === 'tutor') {
                    user.approvalStatus = 'approved';
                }
                
                await user.save();
                console.log(`✅ User updated successfully`);
                
                // Check and create profile if missing
                const profileData = {
                    userId: user._id,
                    fullName: userData.fullName,
                    phone: userData.phone
                };
                
                if (userData.role === 'student') {
                    const existingProfile = await StudentProfile.findOne({ userId: user._id });
                    if (!existingProfile) {
                        await StudentProfile.create(profileData);
                        console.log(`✅ Student profile created`);
                    }
                } else if (userData.role === 'tutor') {
                    const existingProfile = await TutorProfile.findOne({ userId: user._id });
                    if (!existingProfile) {
                        await TutorProfile.create({
                            ...profileData,
                            bio: 'Test tutor for automated testing',
                            subjects: [{ subject: 'Toán', level: 'high_school' }],
                            hourlyRate: 100000,
                            yearsOfExperience: 2
                        });
                        console.log(`✅ Tutor profile created`);
                    }
                }
            } else {
                console.log(`➕ Creating new user...`);
                
                // Create user
                user = await User.create({
                    email: userData.email,
                    password: userData.password,
                    role: userData.role,
                    isEmailVerified: true,
                    isActive: true,
                    approvalStatus: userData.role === 'tutor' ? 'approved' : 'approved'
                });
                
                // Create profile
                const profileData = {
                    userId: user._id,
                    fullName: userData.fullName,
                    phone: userData.phone
                };
                
                if (userData.role === 'student') {
                    await StudentProfile.create(profileData);
                } else if (userData.role === 'tutor') {
                    await TutorProfile.create({
                        ...profileData,
                        bio: 'Test tutor for automated testing',
                        subjects: [{ subject: 'Toán', level: 'high_school' }],
                        hourlyRate: 100000,
                        yearsOfExperience: 2
                    });
                }
                
                console.log(`✅ User and profile created successfully`);
            }
            
            console.log(`   Email: ${userData.email}`);
            console.log(`   Password: ${userData.password}`);
            console.log(`   Role: ${userData.role}`);
            console.log(`   Email Verified: ✅`);
            console.log(`   Active: ✅`);
            if (userData.role === 'tutor') {
                console.log(`   Approval Status: approved`);
            }
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ Test users ready for automated testing!');
        console.log('='.repeat(80));
        console.log('\nYou can now run: node test-messaging-api.js\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

createTestUsers();
