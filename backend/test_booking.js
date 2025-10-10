const mongoose = require('mongoose');
const dotenv = require('dotenv');
const BookingRequest = require('./src/models/BookingRequest');
const User = require('./src/models/User');

// Load environment variables
dotenv.config();

async function createAndAcceptTestBooking() {
  try {
    console.log('🔍 Creating and accepting test booking with daysOfWeek...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB\n');

    // Find a student and tutor
    const student = await User.findOne({ role: 'student' });
    const tutor = await User.findOne({ role: 'tutor', approvalStatus: 'approved' });

    if (!student || !tutor) {
      console.log('❌ No student or approved tutor found');
      return;
    }

    console.log(`Student: ${student.email}`);
    console.log(`Tutor: ${tutor.email}`);

    // Create test booking
    const booking = new BookingRequest({
      student: student._id,
      tutor: tutor._id,
      subject: {
        name: 'Toán học',
        level: 'THCS'
      },
      schedule: {
        startDate: new Date('2025-10-15'),
        preferredTime: '19:00-21:00',
        daysOfWeek: ['monday', 'wednesday', 'friday'],
        daysPerWeek: 3,
        hoursPerSession: 2,
        duration: 4
      },
      location: {
        type: 'online',
        address: '',
        district: '',
        city: 'Hà Nội'
      },
      pricing: {
        hourlyRate: 50000
      },
      description: 'Test booking for timetable',
      studentNote: 'Test note'
    });

    await booking.save();
    console.log('✅ Test booking created successfully!');
    console.log('Booking ID:', booking._id);

    // Accept the booking
    await booking.accept('Gia sư đã chấp nhận yêu cầu test');
    console.log('✅ Test booking accepted!');

    console.log('Final Schedule:', JSON.stringify(booking.schedule, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
createAndAcceptTestBooking();