const { Message, User, StudentProfile, TutorProfile } = require('../models');
const mongoose = require('mongoose');
const { uploadMessageAttachment } = require('../utils/cloudinaryUpload');

// @desc    Get all conversations for logged in user
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all messages where user is sender or recipient
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: new mongoose.Types.ObjectId(userId) },
            { receiverId: new mongoose.Types.ObjectId(userId) }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', new mongoose.Types.ObjectId(userId)] },
              '$receiverId',
              '$senderId'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', new mongoose.Types.ObjectId(userId)] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'otherUser'
        }
      },
      {
        $unwind: '$otherUser'
      },
      {
        $lookup: {
          from: 'studentprofiles',
          localField: 'otherUser._id',
          foreignField: 'userId',
          as: 'studentProfile'
        }
      },
      {
        $lookup: {
          from: 'tutorprofiles',
          localField: 'otherUser._id',
          foreignField: 'userId',
          as: 'tutorProfile'
        }
      },
      {
        $addFields: {
          profile: {
            $cond: [
              { $eq: ['$otherUser.role', 'student'] },
              { $arrayElemAt: ['$studentProfile', 0] },
              { $arrayElemAt: ['$tutorProfile', 0] }
            ]
          }
        }
      },
      {
        $project: {
          _id: '$lastMessage._id',
          otherUser: {
            _id: '$otherUser._id',
            email: '$otherUser.email',
            role: '$otherUser.role',
            fullName: '$profile.fullName',
            avatar: '$profile.avatar'
          },
          lastMessage: {
            content: '$lastMessage.content',
            createdAt: '$lastMessage.createdAt',
            isRead: '$lastMessage.isRead',
            senderId: '$lastMessage.senderId'
          },
          unreadCount: 1
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load conversations',
      error: error.message
    });
  }
};

// @desc    Create or get conversation with a user
// @route   POST /api/messages/conversations
// @access  Private
const createConversation = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const userId = req.user._id;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required'
      });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId).select('name email avatar role');
    
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if conversation already exists
    const existingMessage = await Message.findOne({
      $or: [
        { sender: userId, recipient: recipientId },
        { sender: recipientId, recipient: userId }
      ]
    }).sort({ createdAt: -1 });

    if (existingMessage) {
      return res.json({
        success: true,
        data: {
          conversationId: existingMessage._id,
          recipient
        }
      });
    }

    // Return recipient info for new conversation
    res.json({
      success: true,
      data: {
        conversationId: null,
        recipient
      }
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create conversation',
      error: error.message
    });
  }
};

// @desc    Get messages for a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const { recipientId, limit = 50, skip = 0 } = req.query;

    let query = {};

    if (recipientId) {
      // Get messages between two users
      query = {
        $or: [
          { senderId: userId, receiverId: recipientId },
          { senderId: recipientId, receiverId: userId }
        ]
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required'
      });
    }

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    // Note: populate handled by pre-find hook in model

    // Mark unread messages as read
    await Message.updateMany(
      {
        receiverId: userId,
        senderId: recipientId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    // Notify sender via socket if online
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${recipientId}`).emit('messages_read', {
        readBy: userId,
        recipientId
      });
    }

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load messages',
      error: error.message
    });
  }
};

// @desc    Upload message attachment
// @route   POST /api/messages/upload
// @access  Private
const uploadAttachment = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { buffer, originalname, mimetype, size } = req.file;

    // Upload to Cloudinary
    const uploadResult = await uploadMessageAttachment(
      buffer,
      userId.toString(),
      originalname,
      mimetype
    );

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file'
      });
    }

    // Determine message type based on MIME type
    let messageType = 'file';
    if (mimetype.startsWith('image/')) {
      messageType = 'image';
    } else if (mimetype.startsWith('video/')) {
      messageType = 'video';
    } else if (mimetype.startsWith('audio/')) {
      messageType = 'audio';
    }

    // Return file information
    res.json({
      success: true,
      data: {
        url: uploadResult.url,
        fileName: originalname,
        fileType: mimetype,
        fileSize: size,
        messageType: messageType
      }
    });
  } catch (error) {
    console.error('Upload attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload attachment',
      error: error.message
    });
  }
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { recipientId, content, messageType, attachments } = req.body;
    const userId = req.user._id;

    console.log('📨 Received message data:', {
      recipientId,
      content: content ? `"${content}"` : 'EMPTY',
      contentLength: content?.length || 0,
      messageType,
      hasAttachments: !!attachments,
      attachmentsCount: attachments?.length || 0,
      attachments: attachments
    });

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required'
      });
    }

    // Content is required unless there are attachments
    if (!content && (!attachments || attachments.length === 0)) {
      console.log('❌ Validation failed: No content and no attachments');
      return res.status(400).json({
        success: false,
        message: 'Message content or attachment is required'
      });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Prepare message data
    const messageData = {
      senderId: userId,
      receiverId: recipientId,
      content: content ? content.trim() : '',
      messageType: messageType || 'text',
      isRead: false
    };

    // Add attachments if provided
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      messageData.attachments = attachments.map(att => ({
        filename: att.fileName,
        originalName: att.fileName,
        mimeType: att.fileType,
        size: att.fileSize,
        url: att.url
      }));
      
      console.log('📎 Attachments mapped:', messageData.attachments);
    }

    console.log('💾 Creating message with data:', {
      senderId: messageData.senderId,
      receiverId: messageData.receiverId,
      content: messageData.content ? `"${messageData.content}"` : 'EMPTY',
      messageType: messageData.messageType,
      hasAttachments: !!messageData.attachments,
      attachmentsCount: messageData.attachments?.length || 0
    });

    // Create message
    const message = await Message.create(messageData);
    
    console.log('✅ Message created successfully:', message._id);

    // Message will be auto-populated by pre-find hook
    // Reload to get populated data
    const populatedMessage = await Message.findById(message._id);

    // Send via Socket.IO (handled by socket handler)
    const io = req.app.get('io');
    if (io && populatedMessage) {
      const senderProfile = populatedMessage.senderId.profile;
      io.to(`user:${recipientId}`).emit('new_message', {
        _id: populatedMessage._id,
        sender: {
          _id: populatedMessage.senderId._id,
          name: senderProfile?.fullName || populatedMessage.senderId.email,
          avatar: senderProfile?.avatar || null,
          role: populatedMessage.senderId.role
        },
        recipient: recipientId,
        content: populatedMessage.content,
        messageType: populatedMessage.messageType,
        attachments: populatedMessage.attachments,
        isRead: populatedMessage.isRead,
        createdAt: populatedMessage.createdAt
      });
    }

    res.status(201).json({
      success: true,
      data: populatedMessage || message
    });
  } catch (error) {
    console.error('Send message error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Mark message as read
// @route   PUT /api/messages/:messageId/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findOneAndUpdate(
      {
        _id: messageId,
        receiverId: userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or already read'
      });
    }

    // Notify sender via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${message.senderId}`).emit('message_read', {
        messageId: message._id,
        readBy: userId,
        readAt: message.readAt
      });
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read',
      error: error.message
    });
  }
};

// @desc    Search users to start conversation
// @route   GET /api/messages/search/users
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user._id;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const users = await User.find({
      _id: { $ne: userId },
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
      .select('name email avatar role')
      .limit(10);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: error.message
    });
  }
};

// @desc    Get user online status and lastSeen
// @route   GET /api/messages/user-status/:userId
// @access  Private
const getUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Get user's lastSeen from database
    const user = await User.findById(userId).select('lastSeen name avatar');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Import isUserOnline from socketHandler
    const { isUserOnline } = require('../socket/socketHandler');
    const isOnline = isUserOnline(userId);

    res.json({
      success: true,
      data: {
        userId: user._id,
        name: user.name,
        avatar: user.avatar,
        isOnline,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    console.error('Get user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user status',
      error: error.message
    });
  }
};

// @desc    Get multiple users status (batch request)
// @route   POST /api/messages/users-status
// @access  Private
const getUsersStatus = async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user IDs array'
      });
    }

    // Validate all userIds
    const validUserIds = userIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    
    if (validUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid user IDs provided'
      });
    }

    // Get users' lastSeen from database
    const users = await User.find({ _id: { $in: validUserIds } })
      .select('lastSeen name avatar');

    // Import isUserOnline from socketHandler
    const { isUserOnline } = require('../socket/socketHandler');

    // Map users with their online status
    const usersStatus = users.map(user => ({
      userId: user._id,
      name: user.name,
      avatar: user.avatar,
      isOnline: isUserOnline(user._id.toString()),
      lastSeen: user.lastSeen
    }));

    res.json({
      success: true,
      data: usersStatus
    });
  } catch (error) {
    console.error('Get users status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users status',
      error: error.message
    });
  }
};

// @desc    Proxy download file from Cloudinary (handles private files)
// @route   GET /api/messages/download-proxy
// @access  Private
const downloadFileProxy = async (req, res) => {
  try {
    const { url, filename } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }

    console.log('📥 Proxying download for:', filename || 'file');

    // Import cloudinary
    const { cloudinary } = require('../config/cloudinary');
    const { extractPublicId } = require('../utils/cloudinaryUpload');

    // Determine resource type from URL
    let resourceType = 'raw';
    let keepExtension = true; // Keep extension for raw files
    
    if (url.includes('/image/')) {
      resourceType = 'image';
      keepExtension = false; // Images don't need extension in public_id
    } else if (url.includes('/video/')) {
      resourceType = 'video';
      keepExtension = false; // Videos don't need extension in public_id
    }

    // Extract public ID from URL (keep extension for raw files)
    const publicId = extractPublicId(url, keepExtension);
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Cloudinary URL'
      });
    }

    console.log('📦 Fetching from Cloudinary:', { publicId, resourceType, keepExtension });

    // Generate authenticated URL using Cloudinary SDK
    const cloudinaryUrl = cloudinary.url(publicId, {
      resource_type: resourceType,
      type: 'upload',
      secure: true,
      sign_url: true
    });

    // Fetch file from Cloudinary
    const https = require('https');
    const http = require('http');
    const urlModule = require('url');
    
    const parsedUrl = urlModule.parse(cloudinaryUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    protocol.get(cloudinaryUrl, (cloudinaryRes) => {
      if (cloudinaryRes.statusCode !== 200) {
        console.error('❌ Cloudinary returned status:', cloudinaryRes.statusCode);
        return res.status(cloudinaryRes.statusCode).json({
          success: false,
          message: 'Failed to fetch file from Cloudinary'
        });
      }

      // Set headers for download
      const contentType = cloudinaryRes.headers['content-type'] || 'application/octet-stream';
      const contentLength = cloudinaryRes.headers['content-length'];
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename || 'file')}"`);
      
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      // Stream file to client
      cloudinaryRes.pipe(res);

      console.log('✅ Streaming file to client:', filename);

    }).on('error', (error) => {
      console.error('❌ Error fetching from Cloudinary:', error);
      res.status(500).json({
        success: false,
        message: 'Error downloading file from Cloudinary',
        error: error.message
      });
    });

  } catch (error) {
    console.error('❌ Error in download proxy:', error);
    res.status(500).json({
      success: false,
      message: 'Server error downloading file',
      error: error.message
    });
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  uploadAttachment,
  markAsRead,
  searchUsers,
  createConversation,
  getUserStatus,
  getUsersStatus,
  downloadFileProxy
};

