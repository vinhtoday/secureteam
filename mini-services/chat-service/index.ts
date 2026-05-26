// SecureTeam - Chat Service (Socket.io Mini Service)
// Port: 3004
// Connect via: io('/?XTransformPort=3004')

import { Server } from 'socket.io';

const io = new Server(3004, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// In-memory store for connected users and channel subscriptions
interface ConnectedUser {
  id: string;
  socketId: string;
  email: string;
  channels: Set<string>;
  calls: Set<string>; // callIds this user is in
  joinedAt: Date;
}

const connectedUsers = new Map<string, ConnectedUser>();
const channelRooms = new Map<string, Set<string>>(); // channelId -> Set of socketIds
const callRooms = new Map<string, Set<string>>(); // callId -> Set of socketIds
const typingUsers = new Map<string, { userId: string; channelId: string; timeout: NodeJS.Timeout }>();

console.log('💬 SecureTeam Chat Service starting on port 3004...');

/**
 * Simple JWT verification (same logic as backend)
 * In production, this would import from shared lib
 */
function verifyToken(token: string): { userId: string; email: string; roleName: string; name?: string } | null {
  try {
    // Split token parts
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode payload (base64)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    if (!payload.userId || !payload.email) return null;

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) return null;

    return {
      userId: payload.userId,
      email: payload.email,
      roleName: payload.roleName,
      name: payload.name || payload.email,
    };
  } catch {
    return null;
  }
}

/**
 * Get authenticated user from socket, or null if not authenticated
 */
function getUser(socketId: string): ConnectedUser | null {
  return connectedUsers.get(socketId) || null;
}

/**
 * Join a user to a call room (for broadcasting call events)
 */
function joinCallRoom(socket: any, callId: string, user: ConnectedUser) {
  socket.join(`call:${callId}`);
  user.calls.add(callId);
  if (!callRooms.has(callId)) {
    callRooms.set(callId, new Set());
  }
  callRooms.get(callId)!.add(socket.id);
  console.log(`📞 User ${user.id} joined call room ${callId}`);
}

/**
 * Leave a user from a call room
 */
function leaveCallRoom(socket: any, callId: string, user: ConnectedUser) {
  socket.leave(`call:${callId}`);
  user.calls.delete(callId);
  if (callRooms.has(callId)) {
    callRooms.get(callId)!.delete(socket.id);
    if (callRooms.get(callId)!.size === 0) {
      callRooms.delete(callId);
    }
  }
}

/**
 * Clean up all call rooms for a disconnected user
 */
function cleanupCallRooms(socket: any, user: ConnectedUser) {
  for (const callId of user.calls) {
    socket.leave(`call:${callId}`);
    if (callRooms.has(callId)) {
      callRooms.get(callId)!.delete(socket.id);
      if (callRooms.get(callId)!.size === 0) {
        callRooms.delete(callId);
        // Notify remaining participants that the call room is empty
      } else {
        // Notify other participants that this user left the call
        io.to(`call:${callId}`).emit('call:leave', {
          callId,
          userId: user.id,
        });
      }
    }
  }
  user.calls.clear();
}

// ============================================
// CONNECTION & AUTHENTICATION
// ============================================

io.on('connection', (socket) => {
  console.log(`🔗 New connection: ${socket.id}`);

  // Authenticate via JWT token
  socket.on('authenticate', (token: string, callback: (success: boolean, data?: object) => void) => {
    const payload = verifyToken(token);

    if (!payload) {
      console.log(`❌ Authentication failed for socket ${socket.id}`);
      callback(false, { error: 'Invalid token' });
      socket.disconnect();
      return;
    }

    // Store connected user
    connectedUsers.set(socket.id, {
      id: payload.userId,
      socketId: socket.id,
      email: payload.email,
      channels: new Set(),
      calls: new Set(),
      joinedAt: new Date(),
    });

    console.log(`✅ User ${payload.email} authenticated (${socket.id})`);
    callback(true, { userId: payload.userId });

    // Join user's personal room for DMs and notifications
    socket.join(`user:${payload.userId}`);

    // Broadcast online status
    io.emit('user:status', {
      userId: payload.userId,
      status: 'online',
    });

    // Send current online users list
    const onlineUsers = Array.from(connectedUsers.values()).map((u) => ({
      userId: u.id,
      socketId: u.socketId,
    }));
    socket.emit('online-users', onlineUsers);
  });

  // ============================================
  // CHANNEL MANAGEMENT
  // ============================================

  /**
   * Join a channel room
   * Client emits: 'join-channel' { channelId: string }
   */
  socket.on('join-channel', (channelId: string) => {
    const user = connectedUsers.get(socket.id);
    if (!user) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Join the socket.io room
    socket.join(`channel:${channelId}`);

    // Track subscription
    user.channels.add(channelId);

    // Add to channel room tracking
    if (!channelRooms.has(channelId)) {
      channelRooms.set(channelId, new Set());
    }
    channelRooms.get(channelId)!.add(socket.id);

    console.log(`📡 User ${user.id} joined channel ${channelId}`);

    // Notify channel members
    socket.to(`channel:${channelId}`).emit('member:joined', {
      channelId,
      userId: user.id,
    });
  });

  /**
   * Leave a channel room
   * Client emits: 'leave-channel' { channelId: string }
   */
  socket.on('leave-channel', (channelId: string) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    socket.leave(`channel:${channelId}`);
    user.channels.delete(channelId);

    if (channelRooms.has(channelId)) {
      channelRooms.get(channelId)!.delete(socket.id);
    }

    console.log(`📤 User ${user.id} left channel ${channelId}`);

    socket.to(`channel:${channelId}`).emit('member:left', {
      channelId,
      userId: user.id,
    });
  });

  // ============================================
  // MESSAGING
  // ============================================

  /**
   * Send a message to a channel
   * Client emits: 'send-message' { channelId, message }
   * Server broadcasts: 'new-message' to channel room
   */
  socket.on('send-message', (data: { channelId: string; message: { id: string; content: string; contentType: string; senderId: string; senderName: string; createdAt: string; replyToId?: string } }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const { channelId, message } = data;

    // Verify user is in the channel
    if (!user.channels.has(channelId)) {
      socket.emit('error', { message: 'Not a member of this channel' });
      return;
    }

    // Broadcast message to all channel members (including sender)
    io.to(`channel:${channelId}`).emit('new-message', {
      ...message,
      channelId,
    });

    console.log(`💬 Message in ${channelId} from ${user.id}`);
  });

  // ============================================
  // TYPING INDICATORS
  // ============================================

  /**
   * User is typing
   * Client emits: 'typing' { channelId: string }
   * Server broadcasts: 'user:typing' to channel room
   */
  socket.on('typing', (data: { channelId: string }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    // Clear existing typing timeout
    const existingTyping = typingUsers.get(socket.id);
    if (existingTyping?.timeout) {
      clearTimeout(existingTyping.timeout);
    }

    // Broadcast typing indicator
    socket.to(`channel:${data.channelId}`).emit('user:typing', {
      userId: user.id,
      channelId: data.channelId,
    });

    // Auto-stop typing after 3 seconds
    const timeout = setTimeout(() => {
      socket.to(`channel:${data.channelId}`).emit('user:stop-typing', {
        userId: user.id,
        channelId: data.channelId,
      });
      typingUsers.delete(socket.id);
    }, 3000);

    typingUsers.set(socket.id, { userId: user.id, channelId: data.channelId, timeout });
  });

  /**
   * User stopped typing
   * Client emits: 'stop-typing' { channelId: string }
   */
  socket.on('stop-typing', (data: { channelId: string }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const existingTyping = typingUsers.get(socket.id);
    if (existingTyping?.timeout) {
      clearTimeout(existingTyping.timeout);
      typingUsers.delete(socket.id);
    }

    socket.to(`channel:${data.channelId}`).emit('user:stop-typing', {
      userId: user.id,
      channelId: data.channelId,
    });
  });

  // ============================================
  // MESSAGE READ RECEIPTS
  // ============================================

  /**
   * Mark messages as read
   * Client emits: 'message:read' { channelId: string, messageId: string }
   * Server broadcasts: 'messages:read' to sender's personal room
   */
  socket.on('message:read', (data: { channelId: string; messageId: string; userId: string }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    // Broadcast read receipt to the message sender
    socket.to(`user:${data.userId}`).emit('messages:read', {
      channelId: data.channelId,
      messageId: data.messageId,
      readBy: user.id,
      readAt: new Date().toISOString(),
    });
  });

  // ============================================
  // USER STATUS
  // ============================================

  /**
   * Update user online status
   * Client emits: 'user:status-update' { status: 'online' | 'away' | 'busy' }
   */
  socket.on('user:status-update', (data: { status: string }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    io.emit('user:status', {
      userId: user.id,
      status: data.status,
    });
  });

  // ============================================
  // CALL EVENTS — WebRTC Signaling & Call Management
  // ============================================

  /**
   * Caller invites a user to a call
   * Client emits: 'call:invite' { callId, targetUserId, callType, callerName, callerAvatar }
   * Server: adds caller to call room, forwards invite to target user
   */
  socket.on('call:invite', (data: {
    callId: string;
    targetUserId: string;
    callType: string;
    callerName: string;
    callerAvatar?: string | null;
  }) => {
    const user = getUser(socket.id);
    if (!user) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Add caller to call room
    joinCallRoom(socket, data.callId, user);

    // Forward invite to target user
    socket.to(`user:${data.targetUserId}`).emit('call:invite', {
      callId: data.callId,
      callerId: user.id,
      callerName: data.callerName,
      callerAvatar: data.callerAvatar,
      callType: data.callType,
    });

    console.log(`📞 Call invite: ${user.id} -> ${data.targetUserId} (call: ${data.callId})`);
  });

  /**
   * Callee accepts a call
   * Client emits: 'call:accept' { callId }
   * Server: adds callee to call room, forwards accept to caller/others in call
   */
  socket.on('call:accept', (data: { callId: string }) => {
    const user = getUser(socket.id);
    if (!user) return;

    // Add callee to call room
    joinCallRoom(socket, data.callId, user);

    // Forward accept to all other participants in the call room
    socket.to(`call:${data.callId}`).emit('call:accept', {
      callId: data.callId,
      userId: user.id,
      userName: user.email,
    });

    console.log(`📞 Call accepted: ${user.id} joined call ${data.callId}`);
  });

  /**
   * Callee rejects a call
   * Client emits: 'call:reject' { callId }
   * Server: forwards reject to caller
   */
  socket.on('call:reject', (data: { callId: string }) => {
    const user = getUser(socket.id);
    if (!user) return;

    // Forward reject to others in call room (mainly the caller)
    socket.to(`call:${data.callId}`).emit('call:reject', {
      callId: data.callId,
      userId: user.id,
    });

    // Clean up call room for this user
    leaveCallRoom(socket, data.callId, user);

    console.log(`📞 Call rejected: ${user.id} rejected call ${data.callId}`);
  });

  /**
   * Caller cancels an outgoing call
   * Client emits: 'call:cancel' { callId, targetUserId }
   * Server: forwards cancel to target user
   */
  socket.on('call:cancel', (data: { callId: string; targetUserId: string }) => {
    const user = getUser(socket.id);
    if (!user) return;

    // Forward cancel to target user
    socket.to(`user:${data.targetUserId}`).emit('call:cancel', {
      callId: data.callId,
      callerId: user.id,
    });

    console.log(`📞 Call cancelled: ${user.id} cancelled call ${data.callId}`);
  });

  /**
   * User joins an active call (already accepted/started)
   * Client emits: 'call:join' { callId }
   * Server: adds to call room, broadcasts to others
   */
  socket.on('call:join', (data: { callId: string }) => {
    const user = getUser(socket.id);
    if (!user) return;

    // Add to call room
    joinCallRoom(socket, data.callId, user);

    // Broadcast to others in the call room
    socket.to(`call:${data.callId}`).emit('call:join', {
      callId: data.callId,
      userId: user.id,
      userName: user.email,
    });

    console.log(`📞 User joined call: ${user.id} joined call ${data.callId}`);
  });

  /**
   * User leaves a call
   * Client emits: 'call:leave' { callId }
   * Server: removes from call room, notifies others
   */
  socket.on('call:leave', (data: { callId: string }) => {
    const user = getUser(socket.id);
    if (!user) return;

    // Notify others before leaving
    socket.to(`call:${data.callId}`).emit('call:leave', {
      callId: data.callId,
      userId: user.id,
    });

    // Remove from call room
    leaveCallRoom(socket, data.callId, user);

    console.log(`📞 User left call: ${user.id} left call ${data.callId}`);
  });

  /**
   * Call ended (by host or last participant)
   * Client emits: 'call:end' { callId }
   * Server: broadcasts to all in call room, then cleans up
   */
  socket.on('call:end', (data: { callId: string }) => {
    const user = getUser(socket.id);
    if (!user) return;

    // Broadcast to all in call room
    io.to(`call:${data.callId}`).emit('call:end', {
      callId: data.callId,
    });

    // Clean up call room
    if (callRooms.has(data.callId)) {
      for (const sId of callRooms.get(data.callId)!) {
        const u = connectedUsers.get(sId);
        if (u) u.calls.delete(data.callId);
      }
      callRooms.delete(data.callId);
    }

    console.log(`📞 Call ended: ${data.callId} by ${user.id}`);
  });

  /**
   * WebRTC signaling — CRITICAL for media exchange
   * Client emits: 'call:signal' { callId, targetUserId, signal }
   * Server: forwards signal to target user (1:1, not broadcast)
   */
  socket.on('call:signal', (data: {
    callId: string;
    targetUserId: string;
    signal: { type: string; sdp?: string; candidate?: any };
  }) => {
    const user = getUser(socket.id);
    if (!user) return;

    // Forward signal directly to target user
    socket.to(`user:${data.targetUserId}`).emit('call:signal', {
      callId: data.callId,
      fromUserId: user.id,
      signal: data.signal,
    });
  });

  /**
   * Mute/unmute state change
   * Client emits: 'call:mute' { callId, userId, isMuted }
   * Server: broadcasts to call room
   */
  socket.on('call:mute', (data: { callId: string; userId: string; isMuted: boolean }) => {
    const user = getUser(socket.id);
    if (!user) return;

    socket.to(`call:${data.callId}`).emit('call:mute', {
      callId: data.callId,
      userId: user.id,
      isMuted: data.isMuted,
    });

    console.log(`🎤 Mute: ${user.id} isMuted=${data.isMuted} in call ${data.callId}`);
  });

  /**
   * Screen share state change
   * Client emits: 'call:screen-share' { callId, sharing }
   * Server: broadcasts to call room with userId
   */
  socket.on('call:screen-share', (data: { callId: string; sharing: boolean }) => {
    const user = getUser(socket.id);
    if (!user) return;

    socket.to(`call:${data.callId}`).emit('call:screen-share', {
      callId: data.callId,
      userId: user.id,
      sharing: data.sharing,
    });

    console.log(`🖥️ Screen share: ${user.id} sharing=${data.sharing} in call ${data.callId}`);
  });

  /**
   * Hand raise state change
   * Client emits: 'call:raise-hand' { callId, raised }
   * Server: broadcasts to call room with userId
   */
  socket.on('call:raise-hand', (data: { callId: string; raised: boolean }) => {
    const user = getUser(socket.id);
    if (!user) return;

    socket.to(`call:${data.callId}`).emit('call:raise-hand', {
      callId: data.callId,
      userId: user.id,
      raised: data.raised,
    });
  });

  /**
   * Camera on/off state change
   * Client emits: 'call:camera' { callId, isCameraOff }
   * Server: broadcasts to call room with userId
   */
  socket.on('call:camera', (data: { callId: string; isCameraOff: boolean }) => {
    const user = getUser(socket.id);
    if (!user) return;

    socket.to(`call:${data.callId}`).emit('call:camera', {
      callId: data.callId,
      userId: user.id,
      isCameraOff: data.isCameraOff,
    });

    console.log(`📷 Camera: ${user.id} isCameraOff=${data.isCameraOff} in call ${data.callId}`);
  });

  // ============================================
  // DISCONNECT
  // ============================================

  socket.on('disconnect', (reason) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    console.log(`👋 User ${user.id} disconnected (${reason})`);

    // Clean up channel subscriptions
    for (const channelId of user.channels) {
      socket.leave(`channel:${channelId}`);
      if (channelRooms.has(channelId)) {
        channelRooms.get(channelId)!.delete(socket.id);
      }

      // Notify channel members
      io.to(`channel:${channelId}`).emit('member:left', {
        channelId,
        userId: user.id,
      });
    }

    // Clean up call rooms — notify other participants
    cleanupCallRooms(socket, user);

    // Clean up typing
    const typing = typingUsers.get(socket.id);
    if (typing?.timeout) {
      clearTimeout(typing.timeout);
      typingUsers.delete(socket.id);
    }

    // Broadcast offline status
    io.emit('user:status', {
      userId: user.id,
      status: 'offline',
    });

    // Remove user
    connectedUsers.delete(socket.id);
  });
});

// Health check
setInterval(() => {
  // Clean up stale typing indicators
  for (const [socketId, typing] of typingUsers) {
    if (!connectedUsers.has(socketId)) {
      if (typing.timeout) clearTimeout(typing.timeout);
      typingUsers.delete(socketId);
    }
  }

  // Clean up empty call rooms
  for (const [callId, sockets] of callRooms) {
    if (sockets.size === 0) {
      callRooms.delete(callId);
    }
  }
}, 60000);

console.log('✅ SecureTeam Chat Service is ready on port 3004');
