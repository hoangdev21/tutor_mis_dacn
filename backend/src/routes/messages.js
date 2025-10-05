const express = require('express');
const {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  searchUsers,
  createConversation,
  getUserStatus,
  getUsersStatus
} = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// @route   GET /api/messages/search/users
// @desc    Search users to start conversation
// @access  Private
// NOTE: Must be before /:conversationId to avoid route conflict
router.get('/search/users', searchUsers);

// @route   GET /api/messages/user-status/:userId
// @desc    Get user online status and lastSeen
// @access  Private
router.get('/user-status/:userId', getUserStatus);

// @route   POST /api/messages/users-status
// @desc    Get multiple users status (batch request)
// @access  Private
router.post('/users-status', getUsersStatus);

// @route   GET /api/messages/conversations
// @desc    Get all conversations for logged in user
// @access  Private
router.get('/conversations', getConversations);

// @route   POST /api/messages/conversations
// @desc    Create or get conversation with a user
// @access  Private
router.post('/conversations', createConversation);

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', sendMessage);

// @route   GET /api/messages/:conversationId
// @desc    Get messages for a conversation
// @access  Private
router.get('/:conversationId', getMessages);

// @route   PUT /api/messages/:messageId/read
// @desc    Mark message as read
// @access  Private
router.put('/:messageId/read', markAsRead);

module.exports = router;
