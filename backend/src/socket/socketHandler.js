// Socket.IO Handler for Real-time Messaging
const jwt = require('jsonwebtoken');
const { Message, User } = require('../models');

// Store online users: userId -> socketId
const onlineUsers = new Map();

// Socket.IO authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Authentication error: Invalid token'));
  }
};

// Initialize Socket.IO
const initializeSocket = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`✅ User connected: ${userId} (Socket: ${socket.id})`);

    // Add user to online users
    onlineUsers.set(userId, socket.id);

    // Broadcast user online status to all clients
    io.emit('user_online', { userId });

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Handle joining a conversation room
    socket.on('join_conversation', async ({ conversationId, recipientId }) => {
      try {
        console.log(`📥 User ${userId} joining conversation: ${conversationId}`);
        
        // Leave previous conversation rooms
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room.startsWith('conversation:')) {
            socket.leave(room);
          }
        });

        // Join new conversation room
        if (conversationId) {
          socket.join(`conversation:${conversationId}`);
          console.log(`✅ User ${userId} joined conversation: ${conversationId}`);
        }

        // Mark messages as read
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

          // Notify sender that messages were read
          if (recipientId && onlineUsers.has(recipientId)) {
            io.to(`user:${recipientId}`).emit('messages_read', {
              conversationId,
              readBy: userId
            });
          }
        }

        socket.emit('join_conversation_success', { conversationId });
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Handle sending a message
    socket.on('send_message', async (data) => {
      try {
        const { recipientId, content, conversationId } = data;

        console.log(`📤 User ${userId} sending message to ${recipientId}`);

        // Validate input
        if (!recipientId || !content) {
          return socket.emit('error', { message: 'Missing required fields' });
        }

        // Check if recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
          return socket.emit('error', { message: 'Recipient not found' });
        }

        // Create message in database
        const message = await Message.create({
          sender: userId,
          recipient: recipientId,
          content: content.trim(),
          read: false
        });

        // Populate sender info
        await message.populate('sender', 'name avatar email role');

        // Prepare message object
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

        // Send to sender (confirmation)
        socket.emit('message_sent', messageData);

        // Send to recipient if online
        if (onlineUsers.has(recipientId)) {
          io.to(`user:${recipientId}`).emit('new_message', messageData);
          
          // If recipient is in the conversation, mark as read immediately
          const recipientSocketId = onlineUsers.get(recipientId);
          const recipientSocket = io.sockets.sockets.get(recipientSocketId);
          const recipientRooms = recipientSocket ? Array.from(recipientSocket.rooms) : [];
          
          if (recipientRooms.includes(`conversation:${conversationId}`)) {
            message.read = true;
            message.readAt = new Date();
            await message.save();
            
            // Notify sender that message was read
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

    // Handle typing indicator
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

    // Handle mark message as read
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

        // Notify sender
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

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${userId} (Socket: ${socket.id})`);
      
      // Remove from online users
      onlineUsers.delete(userId);

      // Broadcast user offline status
      io.emit('user_offline', { userId });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('🔌 Socket.IO initialized successfully');
};

// Get online users (for API endpoint)
const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};

// Check if user is online
const isUserOnline = (userId) => {
  return onlineUsers.has(userId);
};

module.exports = {
  initializeSocket,
  getOnlineUsers,
  isUserOnline
};
