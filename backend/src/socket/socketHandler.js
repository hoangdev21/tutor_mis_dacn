// Socket.IO Handler for Real-time Messaging
const jwt = require('jsonwebtoken');
const { Message, User } = require('../models');
const onlineUsers = new Map();

// Socket.IO authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // JWT token structure: { userId, role }
    socket.userId = decoded.userId || decoded.id; // Support both for backward compatibility
    socket.userRole = decoded.role;
    
    console.log(`🔐 Socket authenticated: userId=${socket.userId}, role=${socket.userRole}`);
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Authentication error: Invalid token'));
  }
};

// Initialize Socket.IO
const initializeSocket = (io) => {
  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`✅ User connected: ${userId} (Socket: ${socket.id})`);

    // Add user to online users
    onlineUsers.set(userId, socket.id);
    console.log(`📊 Online users now: ${onlineUsers.size}`);
    
    socket.onAny((eventName, ...args) => {
      console.log(`🎯 [Socket ${socket.id}] Event received: "${eventName}"`, 
        args.length > 0 ? `with ${args.length} arg(s)` : '');
    });

    try {
      await User.findByIdAndUpdate(userId, { 
        lastSeen: new Date(),
        lastLogin: new Date()
      });
    } catch (error) {
      console.error('Error updating user lastSeen on connect:', error);
    }

    io.emit('user_online', { 
      userId,
      lastSeen: new Date()
    });

    // Join user's personal room
    socket.join(`user:${userId}`);
    console.log(`✅ User ${userId} joined personal room: user:${userId}`);

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

        const recipient = await User.findById(recipientId);
        if (!recipient) {
          return socket.emit('error', { message: 'Recipient not found' });
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
    socket.on('disconnect', async () => {
      // Check if userId exists (socket might disconnect before authentication completes)
      if (!userId) {
        console.log(`❌ Socket disconnected before authentication: ${socket.id}`);
        return;
      }
      
      console.log(`❌ User disconnected: ${userId} (Socket: ${socket.id})`);
      
      // Remove from online users
      onlineUsers.delete(userId);

      // Update lastSeen in database to current time (user just went offline)
      const lastSeenTime = new Date();
      try {
        await User.findByIdAndUpdate(userId, { 
          lastSeen: lastSeenTime
        });
      } catch (error) {
        console.error('Error updating user lastSeen on disconnect:', error);
      }

      // Broadcast user offline status with lastSeen time
      io.emit('user_offline', { 
        userId,
        lastSeen: lastSeenTime
      });
    });

    // ========== WEBRTC SIGNALING EVENTS ==========
    
    // Handle call initiation
    socket.on('call_user', async ({ recipientId, offer, callType }) => {
      try {
        console.log(`📞 ===== CALL_USER EVENT =====`);
        console.log(`📞 Caller userId: ${userId}`);
        console.log(`📞 Recipient ID: ${recipientId}`);
        console.log(`📞 Call Type: ${callType}`);
        console.log(`🔍 Online users count: ${onlineUsers.size}`);
        console.log(`🔍 Is recipient online? ${onlineUsers.has(recipientId)}`);
        console.log(`🔍 Online user IDs:`, Array.from(onlineUsers.keys()));
        
        // Verify userId is valid
        if (!userId) {
          console.error('❌ userId is undefined!');
          return socket.emit('call_failed', { message: 'Authentication error' });
        }
        
        // Get caller info from User AND Profile
        console.log(`🔍 Fetching caller info for: ${userId}`);
        const caller = await User.findById(userId).select('role').populate('profile');
        
        if (!caller) {
          console.error(`❌ Caller not found: ${userId}`);
          return socket.emit('call_failed', { message: 'Caller not found' });
        }
        
        // Extract name and avatar from profile
        const callerName = caller.profile?.name || caller.profile?.fullName || 'Unknown User';
        const callerAvatar = caller.profile?.avatar || caller.profile?.profilePicture || null;
        
        console.log(`✅ Caller found:`, {
          id: caller._id,
          role: caller.role,
          name: callerName,
          avatar: callerAvatar,
          profileExists: !!caller.profile
        });
        
        // CRITICAL: Validate data
        if (!callerName || callerName === 'Unknown User') {
          console.error(`⚠️ WARNING: Caller name not found in profile for user ${userId}`);
        }
        if (!callerAvatar) {
          console.warn(`⚠️ WARNING: Caller avatar not found in profile for user ${userId}`);
        }
        
        // Check if recipient exists and get their info
        console.log(`🔍 Fetching recipient info for: ${recipientId}`);
        const recipient = await User.findById(recipientId).select('name');
        if (!recipient) {
          console.error(`❌ Recipient not found: ${recipientId}`);
          return socket.emit('call_failed', { 
            message: 'User not found',
            recipientId 
          });
        }
        console.log(`✅ Recipient found: ${recipient.name}`);
        
        // Prepare call data with fallbacks
        const callData = {
          callerId: userId,
          callerName: callerName,
          callerAvatar: callerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(callerName)}`,
          callerRole: caller.role,
          offer,
          callType, // 'video' or 'audio'
          timestamp: new Date()
        };
        
        console.log(`📤 Sending incoming_call event with data:`, {
          callerId: callData.callerId,
          callerName: callData.callerName,
          callerAvatar: callData.callerAvatar,
          callerRole: callData.callerRole,
          callType: callData.callType
        });
        
        // Send call request to recipient
        io.to(`user:${recipientId}`).emit('incoming_call', callData);

        console.log(`✅ Call notification sent to user:${recipientId}`);
        
        // Set a timeout - if no response in 30 seconds, consider failed
        setTimeout(() => {
          // This will be handled by frontend timeout as well
          console.log(`⏰ Call timeout for ${recipientId}`);
        }, 30000);
        
      } catch (error) {
        console.error('❌ Error initiating call:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error details:', {
          name: error.name,
          message: error.message,
          userId,
          recipientId
        });
        socket.emit('call_failed', { 
          message: 'Failed to initiate call',
          error: error.message 
        });
      }
    });

    // Handle call acceptance
    socket.on('call_accepted', ({ callerId, answer }) => {
      try {
        console.log(`✅ User ${userId} accepted call from ${callerId}`);
        
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

    // Handle call rejection
    socket.on('call_rejected', ({ callerId, reason }) => {
      try {
        console.log(`❌ User ${userId} rejected call from ${callerId}`);
        
        if (onlineUsers.has(callerId)) {
          io.to(`user:${callerId}`).emit('call_rejected', {
            recipientId: userId,
            reason: reason || 'Call declined'
          });
        }
      } catch (error) {
        console.error('Error rejecting call:', error);
      }
    });

    // Handle ICE candidate exchange
    socket.on('ice_candidate', ({ recipientId, candidate }) => {
      try {
        if (onlineUsers.has(recipientId)) {
          io.to(`user:${recipientId}`).emit('ice_candidate', {
            senderId: userId,
            candidate
          });
        }
      } catch (error) {
        console.error('Error sending ICE candidate:', error);
      }
    });

    // Handle call end
    socket.on('end_call', ({ recipientId }) => {
      try {
        console.log(`📴 User ${userId} ending call with ${recipientId}`);
        
        if (recipientId && onlineUsers.has(recipientId)) {
          io.to(`user:${recipientId}`).emit('call_ended', {
            userId,
            reason: 'Call ended by peer'
          });
        }
      } catch (error) {
        console.error('Error ending call:', error);
      }
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
