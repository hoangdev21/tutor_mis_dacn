const mongoose = require('mongoose');
const dotenv = require('dotenv');
const BookingRequest = require('./src/models/BookingRequest');

// Load environment variables
dotenv.config();

async function checkBookings() {
  try {
    console.log('🔍 Checking bookings with daysOfWeek...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB\n');

    // Find accepted bookings
    const bookings = await BookingRequest.find({ status: 'accepted' })
      .populate('tutor', 'email profile')
      .populate('student', 'email profile')
      .limit(5);

    console.log(`Found ${bookings.length} accepted bookings:`);

    bookings.forEach((booking, idx) => {
      console.log(`\n--- Booking ${idx + 1} ---`);
      console.log(`ID: ${booking._id}`);
      console.log(`Subject: ${booking.subject.name}`);
      console.log(`Status: ${booking.status}`);
      console.log(`Schedule:`, JSON.stringify(booking.schedule, null, 2));
      console.log(`Tutor: ${booking.tutor?.profile?.fullName || booking.tutor?.email}`);
      console.log(`Student: ${booking.student?.profile?.fullName || booking.student?.email}`);
    });

  } catch (error) {
    console.error('❌ Error checking bookings:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the check
checkBookings();