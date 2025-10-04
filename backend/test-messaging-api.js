// Test Messaging API
// Run this file with: node test-messaging-api.js

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Test data - Using test accounts
let testData = {
    student: {
        email: 'student@test.com',
        password: '123456',
        token: null,
        userId: null
    },
    tutor: {
        email: 'tutor@test.com',
        password: '123456',
        token: null,
        userId: null
    },
    conversationId: null,
    messageId: null
};

// Helper functions
function logSuccess(message) {
    console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
    console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logInfo(message) {
    console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function logWarning(message) {
    console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logSection(message) {
    console.log(`\n${colors.cyan}${'='.repeat(60)}`);
    console.log(`${message}`);
    console.log(`${'='.repeat(60)}${colors.reset}\n`);
}

// Test functions
async function testLogin(userType) {
    logSection(`TEST ${userType.toUpperCase()}: Login`);
    
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: testData[userType].email,
            password: testData[userType].password
        });

        if (response.data.success) {
            testData[userType].token = response.data.data.accessToken;
            testData[userType].userId = response.data.data.user.id;
            
            logSuccess(`${userType} logged in successfully`);
            logInfo(`User ID: ${testData[userType].userId}`);
            logInfo(`Token: ${testData[userType].token.substring(0, 50)}...`);
            return true;
        } else {
            logError(`Login failed: ${response.data.message}`);
            return false;
        }
    } catch (error) {
        logError(`Login error: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testGetMe(userType) {
    logSection(`TEST ${userType.toUpperCase()}: Get Current User`);
    
    try {
        const response = await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${testData[userType].token}`
            }
        });

        if (response.data.success) {
            logSuccess('Get current user info successfully');
            console.log(JSON.stringify(response.data.data, null, 2));
            return true;
        } else {
            logError(`Get user failed: ${response.data.message}`);
            return false;
        }
    } catch (error) {
        logError(`Get user error: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testSearchUsers() {
    logSection('TEST STUDENT: Search Users');
    
    try {
        const response = await axios.get(`${API_BASE_URL}/messages/search/users`, {
            headers: {
                'Authorization': `Bearer ${testData.student.token}`
            }
        });

        if (response.data.success) {
            logSuccess(`Found ${response.data.data.length} users`);
            response.data.data.forEach((user, index) => {
                console.log(`\n${index + 1}. ${user.fullName} (${user.role})`);
                console.log(`   ID: ${user._id}`);
                console.log(`   Email: ${user.email}`);
            });
            return true;
        } else {
            logError(`Search users failed: ${response.data.message}`);
            return false;
        }
    } catch (error) {
        logError(`Search users error: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testGetTutors() {
    logSection('TEST: Get Approved Tutors');
    
    try {
        const response = await axios.get(`${API_BASE_URL}/auth/tutors?status=approved`);

        if (response.data.success) {
            logSuccess(`Found ${response.data.count} tutors`);
            response.data.data.forEach((tutor, index) => {
                console.log(`\n${index + 1}. ${tutor.profile?.fullName || 'N/A'}`);
                console.log(`   ID: ${tutor._id}`);
                console.log(`   Email: ${tutor.email}`);
                console.log(`   Subjects: ${tutor.profile?.subjects?.map(s => s.subject || s).join(', ') || 'N/A'}`);
            });
            
            // Save first tutor ID for testing
            if (response.data.data.length > 0 && !testData.tutor.userId) {
                testData.tutor.userId = response.data.data[0]._id;
                logInfo(`Using tutor ID for testing: ${testData.tutor.userId}`);
            }
            
            return true;
        } else {
            logError(`Get tutors failed: ${response.data.message}`);
            return false;
        }
    } catch (error) {
        logError(`Get tutors error: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testCreateConversation() {
    logSection('TEST STUDENT: Create Conversation with Tutor');
    
    if (!testData.tutor.userId) {
        logError('No tutor ID available. Please run testGetTutors first.');
        return false;
    }
    
    try {
        const response = await axios.post(
            `${API_BASE_URL}/messages/conversations`,
            {
                recipientId: testData.tutor.userId
            },
            {
                headers: {
                    'Authorization': `Bearer ${testData.student.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.success) {
            testData.conversationId = response.data.data._id;
            logSuccess('Conversation created successfully');
            logInfo(`Conversation ID: ${testData.conversationId}`);
            console.log(JSON.stringify(response.data.data, null, 2));
            return true;
        } else {
            logError(`Create conversation failed: ${response.data.message}`);
            return false;
        }
    } catch (error) {
        logError(`Create conversation error: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testGetConversations(userType) {
    logSection(`TEST ${userType.toUpperCase()}: Get Conversations`);
    
    try {
        const response = await axios.get(`${API_BASE_URL}/messages/conversations`, {
            headers: {
                'Authorization': `Bearer ${testData[userType].token}`
            }
        });

        if (response.data.success) {
            logSuccess(`Found ${response.data.data.length} conversations`);
            response.data.data.forEach((conv, index) => {
                console.log(`\n${index + 1}. Conversation with ${conv.otherUser.fullName}`);
                console.log(`   ID: ${conv._id}`);
                console.log(`   Last Message: ${conv.lastMessage?.content || 'N/A'}`);
                console.log(`   Unread Count: ${conv.unreadCount}`);
            });
            
            // Save conversation ID if not set
            if (!testData.conversationId && response.data.data.length > 0) {
                testData.conversationId = response.data.data[0]._id;
                logInfo(`Using conversation ID: ${testData.conversationId}`);
            }
            
            return true;
        } else {
            logError(`Get conversations failed: ${response.data.message}`);
            return false;
        }
    } catch (error) {
        logError(`Get conversations error: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testSendMessage(userType, content) {
    logSection(`TEST ${userType.toUpperCase()}: Send Message`);
    
    // Determine recipient based on sender type
    const recipientId = userType === 'student' ? testData.tutor.userId : testData.student.userId;
    
    if (!recipientId) {
        logError('No recipient ID available.');
        return false;
    }
    
    try {
        const response = await axios.post(
            `${API_BASE_URL}/messages`,
            {
                recipientId: recipientId,
                content: content
            },
            {
                headers: {
                    'Authorization': `Bearer ${testData[userType].token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.success) {
            testData.messageId = response.data.data._id;
            logSuccess('Message sent successfully');
            logInfo(`Message ID: ${testData.messageId}`);
            console.log(`Content: ${response.data.data.content}`);
            console.log(`Recipient: ${recipientId}`);
            console.log(`Time: ${new Date(response.data.data.createdAt).toLocaleString('vi-VN')}`);
            return true;
        } else {
            logError(`Send message failed: ${response.data.message}`);
            return false;
        }
    } catch (error) {
        logError(`Send message error: ${error.response?.data?.message || error.message}`);
        if (error.response?.data?.error) {
            console.log(`   Error Details: ${error.response.data.error}`);
        }
        if (error.response?.data?.details) {
            console.log(`   Stack: ${error.response.data.details}`);
        }
        return false;
    }
}

async function testGetMessages(userType) {
    logSection(`TEST ${userType.toUpperCase()}: Get Messages`);
    
    // Determine the other user ID
    const recipientId = userType === 'student' ? testData.tutor.userId : testData.student.userId;
    
    if (!recipientId) {
        logError('No recipient ID available.');
        return false;
    }
    
    try {
        const response = await axios.get(
            `${API_BASE_URL}/messages/conversation?recipientId=${recipientId}`,
            {
                headers: {
                    'Authorization': `Bearer ${testData[userType].token}`
                }
            }
        );

        if (response.data.success) {
            logSuccess(`Found ${response.data.data.length} messages`);
            response.data.data.forEach((msg, index) => {
                const senderName = msg.senderId?.profile?.fullName || msg.senderId?.email || 'Unknown';
                console.log(`\n${index + 1}. From: ${senderName}`);
                console.log(`   Content: ${msg.content}`);
                console.log(`   Time: ${new Date(msg.createdAt).toLocaleString('vi-VN')}`);
                console.log(`   Read: ${msg.isRead ? 'Yes' : 'No'}`);
            });
            return true;
        } else {
            logError(`Get messages failed: ${response.data.message}`);
            return false;
        }
    } catch (error) {
        logError(`Get messages error: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testMarkAsRead(userType) {
    logSection(`TEST ${userType.toUpperCase()}: Mark Messages as Read`);
    
    if (!testData.messageId) {
        logError('No message ID available.');
        return false;
    }
    
    try {
        const response = await axios.put(
            `${API_BASE_URL}/messages/${testData.messageId}/read`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${testData[userType].token}`
                }
            }
        );

        if (response.data.success) {
            logSuccess('Message marked as read successfully');
            return true;
        } else {
            logError(`Mark as read failed: ${response.data.message}`);
            return false;
        }
    } catch (error) {
        logError(`Mark as read error: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('\n');
    logSection('🧪 MESSAGING SYSTEM TEST SUITE');
    logInfo('Starting comprehensive messaging tests...');
    
    let passed = 0;
    let failed = 0;
    
    const tests = [
        // Authentication tests
        { name: 'Student Login', fn: () => testLogin('student') },
        { name: 'Student Get Me', fn: () => testGetMe('student') },
        { name: 'Tutor Login', fn: () => testLogin('tutor') },
        
        // User search tests
        { name: 'Search Users', fn: () => testSearchUsers() },
        { name: 'Get Tutors', fn: () => testGetTutors() },
        
        // Conversation tests
        { name: 'Get Student Conversations (Initial)', fn: () => testGetConversations('student') },
        
        // Message tests - Student sends first
        { name: 'Student Send Message', fn: () => testSendMessage('student', 'Xin chào, tôi muốn học Toán với bạn!') },
        { name: 'Get Student Messages', fn: () => testGetMessages('student') },
        { name: 'Get Student Conversations (After Send)', fn: () => testGetConversations('student') },
        
        // Tutor responds
        { name: 'Get Tutor Conversations', fn: () => testGetConversations('tutor') },
        { name: 'Tutor Reply Message', fn: () => testSendMessage('tutor', 'Chào bạn! Tôi rất vui được dạy bạn môn Toán.') },
        { name: 'Get Tutor Messages', fn: () => testGetMessages('tutor') },
        
        // Continue conversation
        { name: 'Student Reply Again', fn: () => testSendMessage('student', 'Bạn có thể dạy tôi vào thứ 7 không?') },
        { name: 'Get Updated Messages', fn: () => testGetMessages('student') },
        
        // Mark as read test
        { name: 'Mark Message as Read', fn: () => testMarkAsRead('tutor') },
        { name: 'Verify Read Status', fn: () => testGetMessages('tutor') }
    ];
    
    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result) {
                passed++;
            } else {
                failed++;
            }
            
            // Wait a bit between tests
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            logError(`Test "${test.name}" crashed: ${error.message}`);
            failed++;
        }
    }
    
    // Summary
    logSection('📊 TEST SUMMARY');
    console.log(`Total Tests: ${tests.length}`);
    logSuccess(`Passed: ${passed}`);
    if (failed > 0) {
        logError(`Failed: ${failed}`);
    }
    console.log(`\nSuccess Rate: ${Math.round((passed / tests.length) * 100)}%\n`);
    
    // Show test data for manual verification
    logSection('📝 TEST DATA FOR MANUAL VERIFICATION');
    console.log('Student Token:', testData.student.token?.substring(0, 50) + '...');
    console.log('Student User ID:', testData.student.userId);
    console.log('Tutor Token:', testData.tutor.token?.substring(0, 50) + '...');
    console.log('Tutor User ID:', testData.tutor.userId);
    console.log('Conversation ID:', testData.conversationId);
    console.log('Last Message ID:', testData.messageId);
    console.log('\n');
}

// Run tests
runAllTests().catch(error => {
    logError(`Test suite crashed: ${error.message}`);
    console.error(error);
    process.exit(1);
});
