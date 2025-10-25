const { Message, User, StudentProfile, TutorProfile } = require('../models');
const mongoose = require('mongoose');
const { uploadMessageAttachment } = require('../utils/cloudinaryUpload');

// @desc    Get all conversations for logged in user
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // get tất cả các cuộc trò chuyện của người dùng
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
    console.error('Lỗi:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải cuộc trò chuyện',
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
        message: 'Cần thiết ID người nhận'
      });
    }

    // kiểm tra nếu người nhận tồn tại
    const recipient = await User.findById(recipientId).select('name email avatar role');
    
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    // kiểm tra nếu cuộc trò chuyện đã tồn tại
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

    // trả về thông tin người nhận nếu không có cuộc trò chuyện nào tồn tại
    res.json({
      success: true,
      data: {
        conversationId: null,
        recipient
      }
    });
  } catch (error) {
    console.error('Lỗi tạo cuộc trò chuyện:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo cuộc trò chuyện',
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
      // get tin nhắn giữa hai người dùng
      query = {
        $or: [
          { senderId: userId, receiverId: recipientId },
          { senderId: recipientId, receiverId: userId }
        ]
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Cần thiết ID người nhận'
      });
    }

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    // đánh dấu tất cả tin nhắn chưa đọc từ người gửi là đã đọc
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

    // gửi sự kiện qua Socket.IO để cập nhật trạng thái đã đọc
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
    console.error('Lỗi:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải tin nhắn',
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
        message: 'Không có file nào được tải lên'
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
        message: 'Không thể tải lên file'
      });
    }

    // xác định loại tin nhắn dựa trên mimetype
    let messageType = 'file';
    if (mimetype.startsWith('image/')) {
      messageType = 'image';
    } else if (mimetype.startsWith('video/')) {
      messageType = 'video';
    } else if (mimetype.startsWith('audio/')) {
      messageType = 'audio';
    }

    // trả về thông tin file đã tải lên
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
    console.error('Lỗi tải lên tệp đính kèm:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải lên tệp đính kèm',
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

    console.log('📨 Dữ liệu tin nhắn:', {
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
        message: 'Cần thiết ID người nhận'
      });
    }

    // Nội dung là bắt buộc trừ khi có tệp đính kèm
    if (!content && (!attachments || attachments.length === 0)) {
      console.log(' Thiếu nội dung tin nhắn và tệp đính kèm');
      return res.status(400).json({
        success: false,
        message: 'Nội dung tin nhắn hoặc tệp đính kèm là bắt buộc'
      });
    }

    // kiểm tra nếu người nhận tồn tại
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người nhận'
      });
    }

    // Tạo dữ liệu tin nhắn
    const messageData = {
      senderId: userId,
      receiverId: recipientId,
      content: content ? content.trim() : '',
      messageType: messageType || 'text',
      isRead: false
    };

    // Xử lý tệp đính kèm nếu có
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      messageData.attachments = attachments.map(att => ({
        filename: att.fileName,
        originalName: att.fileName,
        mimeType: att.fileType,
        size: att.fileSize,
        url: att.url
      }));

      console.log('Tệp đính kèm:', messageData.attachments);
    }

    console.log(' Tạo tin nhắn với dữ liệu:', {
      senderId: messageData.senderId,
      receiverId: messageData.receiverId,
      content: messageData.content ? `"${messageData.content}"` : 'EMPTY',
      messageType: messageData.messageType,
      hasAttachments: !!messageData.attachments,
      attachmentsCount: messageData.attachments?.length || 0
    });

    // Create message
    const message = await Message.create(messageData);

    console.log(' Tạo tin nhắn thành công:', message._id);

    // tải lại tin nhắn với populated sender info
    const populatedMessage = await Message.findById(message._id);

    // gửi sự kiện qua Socket.IO để thông báo người nhận
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
    console.error('Gửi tin nhắn lỗi:', error);
    console.error('Lỗi:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Gửi tin nhắn thất bại',
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
        message: 'Tin nhắn không tồn tại hoặc đã được đọc'
      });
    }

    // Thông báo cho người gửi qua Socket.IO
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
    console.error('Đánh dấu là đã đọc lỗi:', error);
    res.status(500).json({
      success: false,
      message: 'Đánh dấu là đã đọc thất bại',
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
        message: 'truy vấn tìm kiếm là bắt buộc'
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
    console.error('Tìm kiếm người dùng lỗi:', error);
    res.status(500).json({
      success: false,
      message: 'Tìm kiếm người dùng thất bại',
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
        message: 'ID người dùng không hợp lệ'
      });
    }

    // Get user's lastSeen from database
    const user = await User.findById(userId).select('lastSeen name avatar');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
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
    console.error('Lấy trạng thái người dùng lỗi:', error);
    res.status(500).json({
      success: false,
      message: 'Lấy trạng thái người dùng thất bại',
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
        message: 'ID người dùng không hợp lệ'
      });
    }

    // Validate all userIds
    const validUserIds = userIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    
    if (validUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có ID người dùng hợp lệ nào được cung cấp'
      });
    }

    // get user lastSeen from database
    const users = await User.find({ _id: { $in: validUserIds } })
      .select('lastSeen name avatar');

    // Import isUserOnline from socketHandler
    const { isUserOnline } = require('../socket/socketHandler');

    // Map users với trạng thái trực tuyến của họ
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
    console.error('Lấy trạng thái người dùng lỗi:', error);
    res.status(500).json({
      success: false,
      message: 'Lấy trạng thái người dùng thất bại',
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
        message: 'URL là bắt buộc'
      });
    }

    console.log('Tải xuống:', filename || 'file');

    // Import cloudinary
    const { cloudinary } = require('../config/cloudinary');
    const { extractPublicId } = require('../utils/cloudinaryUpload');

    // xác định loại tài nguyên từ URL
    let resourceType = 'raw';
    let keepExtension = true; 
    
    if (url.includes('/image/')) {
      resourceType = 'image';
      keepExtension = false; 
    } else if (url.includes('/video/')) {
      resourceType = 'video';
      keepExtension = false;
    }

    // trích xuất publicId từ URL
    const publicId = extractPublicId(url, keepExtension);
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Cloudinary URL không hợp lệ'
      });
    }

    console.log('Lấy từ Cloudinary:', { publicId, resourceType, keepExtension });

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
        console.error('Cloudinary trả về trạng thái:', cloudinaryRes.statusCode);
        return res.status(cloudinaryRes.statusCode).json({
          success: false,
          message: 'Không thể lấy tệp từ Cloudinary'
        });
      }

      // set tiêu đề tải về
      const contentType = cloudinaryRes.headers['content-type'] || 'application/octet-stream';
      const contentLength = cloudinaryRes.headers['content-length'];
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename || 'file')}"`);
      
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      // Stream file to client
      cloudinaryRes.pipe(res);

      console.log('Truyền tệp đến khách hàng:', filename);

    }).on('error', (error) => {
      console.error('Lỗi khi lấy từ Cloudinary:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tải tệp từ Cloudinary',
        error: error.message
      });
    });

  } catch (error) {
    console.error('Lỗi trong tải xuống proxy:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi tải tệp',
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

