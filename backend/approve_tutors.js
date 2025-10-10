const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

// Load environment variables
dotenv.config();

async function approveAllTutors() {
  try {
    console.log('🔄 Approving all tutors...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB\n');

    // Update all tutor users to approved status
    const result = await User.updateMany(
      { role: 'tutor', approvalStatus: { $ne: 'approved' } },
      {
        $set: {
          approvalStatus: 'approved',
          approvedAt: new Date(),
          approvedBy: null // System approval
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} tutor accounts to approved status\n`);

    // Verify the changes
    const approvedTutors = await User.countDocuments({ role: 'tutor', approvalStatus: 'approved' });
    const totalTutors = await User.countDocuments({ role: 'tutor' });

    console.log('📊 VERIFICATION:');
    console.log(`   Total tutors: ${totalTutors}`);
    console.log(`   Approved tutors: ${approvedTutors}`);

    if (approvedTutors === totalTutors) {
      console.log('✅ All tutors are now approved!');
    } else {
      console.log('⚠️  Some tutors may still be pending');
    }

  } catch (error) {
    console.error('❌ Error approving tutors:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the approval
approveAllTutors();