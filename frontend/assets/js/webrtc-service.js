// ===== WEBRTC SERVICE =====
// Professional WebRTC implementation for voice and video calls
// Using STUN servers for NAT traversal

class WebRTCService {
  constructor(socket) {
    this.socket = socket;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.callType = null; // 'audio' or 'video'
    this.isInitiator = false;
    this.remoteUserId = null;
    
    // ICE servers configuration (using free Google STUN servers)
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };

    // Callbacks for UI updates
    this.onLocalStream = null;
    this.onRemoteStream = null;
    this.onCallEnded = null;
    this.onError = null;
    this.onStateChange = null;

    this.setupSocketListeners();
    this.setupSocketDebug();
  }

  // Setup socket debugging
  setupSocketDebug() {
    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });
    
    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ Socket disconnected:', reason);
    });
  }

  // Setup Socket.IO listeners for signaling
  setupSocketListeners() {
    // Handle incoming call acceptance
    this.socket.on('call_accepted', async ({ answer }) => {
      try {
        console.log('📞 Call accepted, setting remote description');
        if (this.peerConnection) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          this.updateState('connected');
        }
      } catch (error) {
        console.error('Error handling call acceptance:', error);
        this.handleError('Failed to establish connection');
      }
    });

    // Handle call rejection
    this.socket.on('call_rejected', ({ reason }) => {
      console.log('❌ Call rejected:', reason);
      this.endCall();
      if (this.onError) {
        this.onError(`Call rejected: ${reason}`);
      }
    });

    // Handle ICE candidates from peer
    this.socket.on('ice_candidate', async ({ candidate }) => {
      try {
        if (this.peerConnection && candidate) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('✅ ICE candidate added');
        }
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });

    // Handle call ended by peer
    this.socket.on('call_ended', () => {
      console.log('📴 Call ended by peer');
      this.endCall();
    });

    // Handle call failed
    this.socket.on('call_failed', ({ message }) => {
      console.error('❌ Call failed:', message);
      this.endCall();
      if (this.onError) {
        this.onError(message);
      }
    });
  }

  // Start a call (outgoing)
  async startCall(recipientId, callType = 'video') {
    try {
      this.isInitiator = true;
      this.callType = callType;
      this.remoteUserId = recipientId;

      console.log(`📞 Starting ${callType} call to ${recipientId}`);
      this.updateState('calling');

      // Get local media stream
      await this.getLocalStream(callType);

      // Create peer connection
      this.createPeerConnection();

      // Add local stream to peer connection
      console.log('🎵 Adding tracks to peer connection...');
      this.localStream.getTracks().forEach(track => {
        const sender = this.peerConnection.addTrack(track, this.localStream);
        console.log(`✅ Added ${track.kind} track:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        });
      });

      // Create and send offer
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      });

      await this.peerConnection.setLocalDescription(offer);

      // Send offer through signaling server
      console.log('🔔 About to emit call_user event:');
      console.log('  Socket connected:', this.socket.connected);
      console.log('  Socket ID:', this.socket.id);
      console.log('  recipientId:', recipientId);
      console.log('  callType:', callType);
      console.log('  offer type:', offer.type);
      
      this.socket.emit('call_user', {
        recipientId,
        offer,
        callType
      });

      console.log('✅ Call offer sent (emit completed)');
    } catch (error) {
      console.error('Error starting call:', error);
      this.handleError('Failed to start call: ' + error.message);
      this.endCall();
    }
  }

  // Answer incoming call
  async answerCall(callerId, offer, callType = 'video') {
    try {
      this.isInitiator = false;
      this.callType = callType;
      this.remoteUserId = callerId;

      console.log(`📞 Answering ${callType} call from ${callerId}`);
      this.updateState('connecting');

      // Get local media stream
      await this.getLocalStream(callType);

      // Create peer connection
      this.createPeerConnection();

      // Add local stream to peer connection
      console.log('🎵 Adding tracks to peer connection...');
      this.localStream.getTracks().forEach(track => {
        const sender = this.peerConnection.addTrack(track, this.localStream);
        console.log(`✅ Added ${track.kind} track:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        });
      });

      // Set remote description (offer)
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      // Create and send answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send answer through signaling server
      this.socket.emit('call_accepted', {
        callerId,
        answer
      });

      console.log('✅ Call answer sent');
    } catch (error) {
      console.error('Error answering call:', error);
      this.handleError('Failed to answer call: ' + error.message);
      this.endCall();
    }
  }

  // Reject incoming call
  rejectCall(callerId, reason = 'Call declined') {
    console.log('❌ Rejecting call from', callerId);
    this.socket.emit('call_rejected', {
      callerId,
      reason
    });
  }

  // Create RTCPeerConnection
  createPeerConnection() {
    try {
      this.peerConnection = new RTCPeerConnection(this.iceServers);

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.remoteUserId) {
          this.socket.emit('ice_candidate', {
            recipientId: this.remoteUserId,
            candidate: event.candidate
          });
          console.log('🧊 ICE candidate sent');
        }
      };

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('📺 Remote track received:', event.track.kind);
        console.log('   Track details:', {
          enabled: event.track.enabled,
          muted: event.track.muted,
          readyState: event.track.readyState,
          label: event.track.label
        });
        
        this.remoteStream = event.streams[0];
        
        console.log('📺 Remote stream info:');
        console.log('   Audio tracks:', this.remoteStream.getAudioTracks().length);
        console.log('   Video tracks:', this.remoteStream.getVideoTracks().length);
        
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
        this.updateState('connected');
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', this.peerConnection.connectionState);
        
        if (this.peerConnection.connectionState === 'connected') {
          this.updateState('connected');
        } else if (this.peerConnection.connectionState === 'disconnected' || 
                   this.peerConnection.connectionState === 'failed' ||
                   this.peerConnection.connectionState === 'closed') {
          this.endCall();
        }
      };

      // Handle ICE connection state changes
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', this.peerConnection.iceConnectionState);
        
        if (this.peerConnection.iceConnectionState === 'disconnected' ||
            this.peerConnection.iceConnectionState === 'failed' ||
            this.peerConnection.iceConnectionState === 'closed') {
          this.endCall();
        }
      };

      console.log('✅ Peer connection created');
    } catch (error) {
      console.error('Error creating peer connection:', error);
      throw error;
    }
  }

  // Get local media stream
  async getLocalStream(callType) {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('✅ Local stream acquired');
      console.log('   Audio tracks:', this.localStream.getAudioTracks().length);
      console.log('   Video tracks:', this.localStream.getVideoTracks().length);
      
      // Verify audio tracks are enabled
      this.localStream.getAudioTracks().forEach((track, index) => {
        console.log(`   Audio track ${index}:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        });
      });
      
      if (this.onLocalStream) {
        this.onLocalStream(this.localStream);
      }

      return this.localStream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to access camera/microphone';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Permission denied. Please allow access to camera/microphone.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera/microphone is already in use.';
      }
      
      throw new Error(errorMessage);
    }
  }

  // Toggle audio mute
  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  // Toggle video
  toggleVideo() {
    if (this.localStream && this.callType === 'video') {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  // End call
  endCall() {
    console.log('📴 Ending call');

    // Notify peer
    if (this.remoteUserId) {
      this.socket.emit('end_call', {
        recipientId: this.remoteUserId
      });
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Reset state
    this.remoteStream = null;
    this.remoteUserId = null;
    this.callType = null;
    this.isInitiator = false;

    // Notify UI
    if (this.onCallEnded) {
      this.onCallEnded();
    }

    this.updateState('idle');
  }

  // Update state
  updateState(state) {
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  // Handle error
  handleError(message) {
    console.error('WebRTC Error:', message);
    if (this.onError) {
      this.onError(message);
    }
  }

  // Check if browser supports WebRTC
  static isSupported() {
    return !!(navigator.mediaDevices && 
              navigator.mediaDevices.getUserMedia && 
              window.RTCPeerConnection);
  }

  // Cleanup
  destroy() {
    this.endCall();
    
    // Remove socket listeners
    this.socket.off('call_accepted');
    this.socket.off('call_rejected');
    this.socket.off('ice_candidate');
    this.socket.off('call_ended');
    this.socket.off('call_failed');
  }
}

// Make it globally available
if (typeof window !== 'undefined') {
  window.WebRTCService = WebRTCService;
}
