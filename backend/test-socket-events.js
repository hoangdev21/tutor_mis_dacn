/**
 * Test script to verify socket events are received
 * Run this while backend is running to test call_user event
 */

const io = require('socket.io-client');

// Configuration
const SOCKET_URL = 'http://localhost:3000';
const TEST_TOKEN = process.argv[2]; // Pass token as argument

if (!TEST_TOKEN) {
  console.error('❌ Please provide a valid JWT token as argument');
  console.log('Usage: node test-socket-events.js <YOUR_JWT_TOKEN>');
  process.exit(1);
}

console.log('🔌 Connecting to Socket.IO server...');
console.log('URL:', SOCKET_URL);

// Create socket connection
const socket = io(SOCKET_URL, {
  auth: {
    token: TEST_TOKEN
  },
  transports: ['websocket', 'polling']
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to server');
  console.log('Socket ID:', socket.id);
  console.log('Socket connected:', socket.connected);
  
  // Wait a bit then test emitting call_user event
  setTimeout(() => {
    console.log('\n📞 Testing call_user event emission...');
    
    const testData = {
      recipientId: '507f1f77bcf86cd799439011', // Fake recipient ID
      offer: {
        type: 'offer',
        sdp: 'fake sdp for testing'
      },
      callType: 'video'
    };
    
    console.log('Emitting with data:', testData);
    
    socket.emit('call_user', testData, (acknowledgment) => {
      if (acknowledgment) {
        console.log('✅ Server acknowledged:', acknowledgment);
      }
    });
    
    console.log('✅ Emit completed');
    
    // Wait for response
    setTimeout(() => {
      console.log('\n⏱️ Waiting for server response...');
      setTimeout(() => {
        console.log('\n🔚 Test completed. Disconnecting...');
        socket.disconnect();
        process.exit(0);
      }, 5000);
    }, 2000);
    
  }, 2000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('⚠️ Disconnected:', reason);
});

// Listen for call-related events
socket.on('call_failed', (data) => {
  console.log('📞 Received call_failed event:', data);
});

socket.on('incoming_call', (data) => {
  console.log('📞 Received incoming_call event:', data);
});

console.log('\n💡 Tip: Check backend console for logs starting with 🔔 or 📞');
console.log('Expected backend log: "🔔 ===== RECEIVED CALL_USER EVENT ====="\n');
