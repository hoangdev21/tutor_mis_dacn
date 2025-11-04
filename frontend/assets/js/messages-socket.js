// ===== SOCKET.IO CLIENT FOR MESSAGES =====

class MessageSocket {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.currentRecipientId = null;
    
    // Callbacks
    this.onNewMessage = null;
    this.onMessageSent = null;
    this.onMessageRead = null;
    this.onUserTyping = null;
    this.onUserOnline = null;
    this.onUserOffline = null;
    this.onConnect = null;
    this.onDisconnect = null;
    this.onError = null;
  }

  // Initialize Socket.IO connection
  async connect() {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      
      if (!token) {
        console.error('❌ No auth token found');
        if (this.onError) this.onError('No authentication token');
        return false;
      }

      // Get Socket.IO URL from API base URL
      const socketUrl = this.apiBaseUrl.replace('/api', '');
      
      console.log('🔌 Connecting to Socket.IO:', socketUrl);

      // Load Socket.IO client from CDN if not already loaded
      if (typeof io === 'undefined') {
        await this.loadSocketIOClient();
      }

      // Initialize socket connection
      this.socket = io(socketUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts
      });

      this.setupEventHandlers();
      
      return true;
    } catch (error) {
      console.error('❌ Socket connection error:', error);
      if (this.onError) this.onError(error.message);
      return false;
    }
  }

  // Load Socket.IO client from CDN
  loadSocketIOClient() {
    return new Promise((resolve, reject) => {
      if (typeof io !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Setup socket event handlers
  setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      if (this.onConnect) this.onConnect();
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
      this.connected = false;
      if (this.onDisconnect) this.onDisconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached');
        if (this.onError) this.onError('Failed to connect after multiple attempts');
      }
    });

    // Message events
    this.socket.on('new_message', (data) => {
      console.log('📨 New message received:', data);
      if (this.onNewMessage) this.onNewMessage(data);
    });

    this.socket.on('message_sent', (data) => {
      console.log('✅ Message sent confirmation:', data);
      if (this.onMessageSent) this.onMessageSent(data);
    });

    this.socket.on('message_read', (data) => {
      console.log('👁️ Message read:', data);
      if (this.onMessageRead) this.onMessageRead(data);
    });

    this.socket.on('messages_read', (data) => {
      console.log('👁️ Messages read:', data);
      if (this.onMessageRead) this.onMessageRead(data);
    });

    // Typing events
    this.socket.on('user_typing', (data) => {
      console.log('⌨️ User typing:', data);
      if (this.onUserTyping) this.onUserTyping(data);
    });

    // Online status events
    this.socket.on('user_online', (data) => {
      console.log('🟢 User online:', data);
      if (this.onUserOnline) this.onUserOnline(data);
    });

    this.socket.on('user_offline', (data) => {
      console.log('⚫ User offline:', data);
      if (this.onUserOffline) this.onUserOffline(data);
    });

    // Error events
    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      if (this.onError) this.onError(error.message || error);
    });
  }

  // Join a conversation room
  joinConversation(conversationId, recipientId) {
    if (!this.socket || !this.connected) {
      console.error('❌ Socket not connected');
      return;
    }

    console.log('📥 Joining conversation:', { conversationId, recipientId });
    this.currentRecipientId = recipientId;
    
    this.socket.emit('join_conversation', {
      conversationId,
      recipientId
    });
  }

  // Send a message via socket
  sendMessage(recipientId, content, conversationId = null) {
    if (!this.socket || !this.connected) {
      console.error('❌ Socket not connected');
      return false;
    }

    console.log('📤 Sending message via socket:', { recipientId, content });

    this.socket.emit('send_message', {
      recipientId,
      content,
      conversationId
    });

    return true;
  }

  // Emit typing start
  startTyping(recipientId, conversationId) {
    if (!this.socket || !this.connected) return;

    this.socket.emit('typing_start', {
      recipientId,
      conversationId
    });
  }

  // Emit typing stop
  stopTyping(recipientId, conversationId) {
    if (!this.socket || !this.connected) return;

    this.socket.emit('typing_stop', {
      recipientId,
      conversationId
    });
  }

  // Mark messages as read
  markAsRead(messageIds, senderId) {
    if (!this.socket || !this.connected) return;

    this.socket.emit('mark_read', {
      messageIds,
      senderId
    });
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      console.log('👋 Disconnecting socket');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Check if connected
  isConnected() {
    return this.connected && this.socket && this.socket.connected;
  }
}

// Make it globally accessible
window.MessageSocket = MessageSocket;

console.log('✅ MessageSocket class loaded');