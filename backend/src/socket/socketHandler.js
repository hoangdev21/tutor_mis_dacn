// socket/socketHandler.js
const jwt = require('jsonwebtoken');
const { Message, User } = require('../models');
const onlineUsers = new Map();

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // JWT token structure: { userId, role }
    socket.userId = decoded.userId || decoded.id; // hỗ trợ cả hai kiểu key
    socket.userRole = decoded.role;

    console.log(`🔐 Socket đã được xác thực: userId=${socket.userId}, role=${socket.userRole}`);

    next();
  } catch (error) {
    console.error('Socket xác thực lỗi:', error.message);
    next(new Error('Xác thực socket lỗi'));
  }
};

// Initialize Socket.IO
const initializeSocket = (io) => {
  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`Người dùng kết nối: ${userId} (Socket: ${socket.id})`);

    // thêm người dùng vào danh sách trực tuyến
    onlineUsers.set(userId, socket.id);
    console.log(`Người dùng trực tuyến hiện tại: ${onlineUsers.size}`);

    socket.onAny((eventName, ...args) => {
      console.log(`[Socket ${socket.id}] Sự kiện nhận được: "${eventName}"`, 
        args.length > 0 ? `với ${args.length} tham số` : '');
    });

    try {
      await User.findByIdAndUpdate(userId, { 
        lastSeen: new Date(),
        lastLogin: new Date()
      });
    } catch (error) {
      console.error('Lỗi cập nhật lastSeen của người dùng khi kết nối:', error);
    }

    io.emit('user_online', { 
      userId,
      lastSeen: new Date()
    });

    // join phòng cá nhân
    socket.join(`user:${userId}`);
    console.log(`Người dùng ${userId} đã tham gia phòng cá nhân: user:${userId}`);

    // xử lý tham gia cuộc trò chuyện
    socket.on('join_conversation', async ({ conversationId, recipientId }) => {
      try {
        console.log(`Người dùng ${userId} tham gia cuộc trò chuyện: ${conversationId}`);
        
        // rời khỏi tất cả các phòng cuộc trò chuyện hiện tại
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room.startsWith('conversation:')) {
            socket.leave(room);
          }
        });

        // join phòng cuộc trò chuyện mới
        if (conversationId) {
          socket.join(`conversation:${conversationId}`);
          console.log(`Người dùng ${userId} đã tham gia cuộc trò chuyện: ${conversationId}`);
        }

        // Đánh dấu tin nhắn là đã đọc
        if (conversationId) {
          await Message.updateMany(
            {
              _id: { $in: conversationId },
              recipient: userId,
              read: false
            },
            { 
              read: true,
              readAt: new Date()
            }
          );

          // Thông báo cho người gửi nếu họ đang trực tuyến
          if (recipientId && onlineUsers.has(recipientId)) {
            io.to(`user:${recipientId}`).emit('messages_read', {
              conversationId,
              readBy: userId
            });
          }
        }

        socket.emit('join_conversation_success', { conversationId });
      } catch (error) {
        console.error('Lỗi tham gia cuộc trò chuyện:', error);
        socket.emit('error', { message: 'Không thể tham gia cuộc trò chuyện' });
      }
    });

    // xử lý gửi tin nhắn
    socket.on('send_message', async (data) => {
      try {
        const { recipientId, content, conversationId } = data;

        console.log(`Người dùng ${userId} đang gửi tin nhắn đến ${recipientId}`);

        // validate dữ liệu
        if (!recipientId || !content) {
          return socket.emit('error', { message: 'Thiếu trường bắt buộc' });
        }

        const recipient = await User.findById(recipientId);
        if (!recipient) {
          return socket.emit('error', { message: 'Người nhận không tồn tại' });
        }
        const message = await Message.create({
          sender: userId,
          recipient: recipientId,
          content: content.trim(),
          read: false
        });

        await message.populate('sender', 'name avatar email role');

        const messageData = {
          _id: message._id,
          sender: {
            _id: message.sender._id,
            name: message.sender.name,
            avatar: message.sender.avatar,
            role: message.sender.role
          },
          recipient: recipientId,
          content: message.content,
          read: message.read,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        };

        // gửi xác nhận về tin nhắn đã gửi cho người gửi
        socket.emit('message_sent', messageData);

        // gửi tin nhắn đến người nhận nếu họ đang trực tuyến
        if (onlineUsers.has(recipientId)) {
          io.to(`user:${recipientId}`).emit('new_message', messageData);
          
          // nếu người nhận đang ở trong cuộc trò chuyện, đánh dấu tin nhắn là đã đọc
          const recipientSocketId = onlineUsers.get(recipientId);
          const recipientSocket = io.sockets.sockets.get(recipientSocketId);
          const recipientRooms = recipientSocket ? Array.from(recipientSocket.rooms) : [];
          
          if (recipientRooms.includes(`conversation:${conversationId}`)) {
            message.read = true;
            message.readAt = new Date();
            await message.save();
          
            socket.emit('message_read', {
              messageId: message._id,
              readAt: message.readAt
            });
          }
        }

        console.log(`✅ Message sent from ${userId} to ${recipientId}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // xử lý trạng thái gõ tin nhắn
    socket.on('typing_start', ({ recipientId, conversationId }) => {
      if (onlineUsers.has(recipientId)) {
        io.to(`user:${recipientId}`).emit('user_typing', {
          userId,
          conversationId,
          isTyping: true
        });
      }
    });

    socket.on('typing_stop', ({ recipientId, conversationId }) => {
      if (onlineUsers.has(recipientId)) {
        io.to(`user:${recipientId}`).emit('user_typing', {
          userId,
          conversationId,
          isTyping: false
        });
      }
    });

    // xử lý đánh dấu tin nhắn là đã đọc
    socket.on('mark_read', async ({ messageIds, senderId }) => {
      try {
        await Message.updateMany(
          {
            _id: { $in: messageIds },
            recipient: userId,
            read: false
          },
          { 
            read: true,
            readAt: new Date()
          }
        );

        // thông báo cho người gửi nếu họ đang trực tuyến
        if (senderId && onlineUsers.has(senderId)) {
          io.to(`user:${senderId}`).emit('messages_read', {
            messageIds,
            readBy: userId
          });
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // xử lý ngắt kết nối
    socket.on('disconnect', async () => {
      // Kiểm tra xem userId có tồn tại không
      if (!userId) {
        console.log(`socket ngắt kết nối  ${socket.id}`);
        return;
      }

      console.log(`Người dùng ngắt kết nối: ${userId} (Socket: ${socket.id})`);

      // xóa người dùng khỏi danh sách trực tuyến
      onlineUsers.delete(userId);

      // Cập nhật lastSeen trong cơ sở dữ liệu thành thời gian hiện tại (người dùng vừa ngắt kết nối)
      const lastSeenTime = new Date();
      try {
        await User.findByIdAndUpdate(userId, { 
          lastSeen: lastSeenTime
        });
      } catch (error) {
        console.error('Lỗi cập nhật lastSeen:', error);
      }

      // phát sự kiện người dùng offline
      io.emit('user_offline', { 
        userId,
        lastSeen: lastSeenTime
      });
    });

    // ========== WEBRTC SIGNALING EVENTS ==========
    
    // xử lý cuộc gọi đến
    socket.on('call_user', async ({ recipientId, offer, callType }) => {
      try {
        console.log(` ===== CALL_USER EVENT =====`);
        console.log(`Người gọi UserID: ${userId}`);
        console.log(`Người nhận ID: ${recipientId}`);
        console.log(`Kiểu cuộc gọi: ${callType}`);
        console.log(`Số lượng người dùng trực tuyến: ${onlineUsers.size}`);
        console.log(`Người nhận có trực tuyến không? ${onlineUsers.has(recipientId)}`);
        console.log(`Danh sách ID người dùng trực tuyến:`, Array.from(onlineUsers.keys()));

        // xác thực userId
        if (!userId) {
          console.error('Người gọi không hợp lệ!');
          return socket.emit('call_failed', { message: 'Authentication lỗi' });
        }
        
        // lấy thông tin người gọi
        console.log(`Người gọi ID: ${userId}`);
        const caller = await User.findById(userId).select('role').populate('profile');
        
        if (!caller) {
          console.error(`Người gọi không tìm thấy: ${userId}`);
          return socket.emit('call_failed', { message: 'Người gọi không tìm thấy' });
        }
        
          // Lấy tên và avatar với các fallback
        const callerName = caller.profile?.name || caller.profile?.fullName || 'Unknown User';
        const callerAvatar = caller.profile?.avatar || caller.profile?.profilePicture || null;

        console.log(`Thông tin người gọi:`, {
          id: caller._id,
          role: caller.role,
          name: callerName,
          avatar: callerAvatar,
          profileExists: !!caller.profile
        });
        
        // CRITICAL: Validate data
        if (!callerName || callerName === 'Unknown User') {
          console.error(`Người gọi không hợp lệ: ${userId}`);
        }
        if (!callerAvatar) {
          console.warn(`⚠️ WARNING: Avatar người gọi không tìm thấy trong hồ sơ của người dùng ${userId}`);
        }

        // Kiểm tra xem người nhận có tồn tại không và lấy thông tin của họ
        console.log(`🔍 Fetching recipient info for: ${recipientId}`);
        const recipient = await User.findById(recipientId).select('name');
        if (!recipient) {
          console.error(`Người nhận không tìm thấy: ${recipientId}`);
          return socket.emit('call_failed', { 
            message: 'Người nhận không tìm thấy',
            recipientId 
          });
        }
        console.log(`Người nhận tìm thấy: ${recipient.name}`);

        // Chuẩn bị dữ liệu cuộc gọi với các phương án dự phòng
        const callData = {
          callerId: userId,
          callerName: callerName,
          callerAvatar: callerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(callerName)}`,
          callerRole: caller.role,
          offer,
          callType, // 'video' or 'audio'
          timestamp: new Date()
        };

        console.log(`Thông tin cuộc gọi:`, {
          callerId: callData.callerId,
          callerName: callData.callerName,
          callerAvatar: callData.callerAvatar,
          callerRole: callData.callerRole,
          callType: callData.callType
        });
        
        // Gửi sự kiện cuộc gọi đến người nhận
        io.to(`user:${recipientId}`).emit('incoming_call', callData);

        console.log(`Thông tin cuộc gọi đã được gửi đến: ${recipientId}`);
        
        // Thiết lập bộ hẹn giờ chờ cuộc gọi (30 giây)
        setTimeout(() => {
          // Nếu cuộc gọi vẫn chưa được trả lời, gửi sự kiện hết thời gian chờ
          console.log(`Gọi đến ${recipientId} đã hết thời gian chờ. Không có phản hồi.`);
        }, 30000);
        
      } catch (error) {
        console.error('Lỗi khởi tạo cuộc gọi:', error);
        console.error('Lỗi chi tiết:', error.stack);
        console.error('Thông tin lỗi:', {
          name: error.name,
          message: error.message,
          userId,
          recipientId
        });
        socket.emit('call_failed', { 
          message: 'Không thể khởi tạo cuộc gọi',
          error: error.message 
        });
      }
    });

    // Xử lý chấp nhận cuộc gọi
    socket.on('call_accepted', ({ callerId, answer }) => {
      try {
        console.log(`Người dùng ${userId} đã chấp nhận cuộc gọi từ ${callerId}`);

        if (onlineUsers.has(callerId)) {
          io.to(`user:${callerId}`).emit('call_accepted', {
            recipientId: userId,
            answer
          });
        }
      } catch (error) {
        console.error('Error accepting call:', error);
      }
    });

    // Xử lý từ chối cuộc gọi
    socket.on('call_rejected', ({ callerId, reason }) => {
      try {
        console.log(`Người dùng ${userId} đã từ chối cuộc gọi từ ${callerId}`);

        if (onlineUsers.has(callerId)) {
          io.to(`user:${callerId}`).emit('call_rejected', {
            recipientId: userId,
            reason: reason || 'Cuộc gọi bị từ chối'
          });
        }
      } catch (error) {
        console.error('Lỗi từ chối cuộc gọi:', error);
      }
    });

    // Xử lý ICE candidate
    socket.on('ice_candidate', ({ recipientId, candidate }) => {
      try {
        if (onlineUsers.has(recipientId)) {
          io.to(`user:${recipientId}`).emit('ice_candidate', {
            senderId: userId,
            candidate
          });
        }
      } catch (error) {
        console.error('Lỗi gửi ICE candidate:', error);
      }
    });

    // Xử lý kết thúc cuộc gọi
    socket.on('end_call', ({ recipientId }) => {
      try {
        console.log(`Người dùng ${userId} kết thúc cuộc gọi với ${recipientId}`);

        if (recipientId && onlineUsers.has(recipientId)) {
          io.to(`user:${recipientId}`).emit('call_ended', {
            userId,
            reason: 'Cuộc gọi đã kết thúc'
          });
        }
      } catch (error) {
        console.error('Lỗi kết thúc cuộc gọi:', error);
      }
    });

    // Xử lý lỗi
    socket.on('error', (error) => {
      console.error('Lỗi socket:', error);
    });
  });

  console.log('🔌 Socket.IO initialized successfully');
};

// Lấy danh sách người dùng trực tuyến 
const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};

// Kiểm tra xem người dùng có đang trực tuyến không
const isUserOnline = (userId) => {
  return onlineUsers.has(userId);
};

module.exports = {
  initializeSocket,
  getOnlineUsers,
  isUserOnline
};
