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
  channels: Set<string>;
  joinedAt: Date;
}

const connectedUsers = new Map<string, ConnectedUser>();
const channelRooms = new Map<string, Set<string>>(); // channelId -> Set of socketIds
const typingUsers = new Map<string, { userId: string; channelId: string; timeout: NodeJS.Timeout }>();

console.log('💬 SecureTeam Chat Service starting on port 3004...');

/**
 * Simple JWT verification (same logic as backend)
 * In production, this would import from shared lib
 */
function verifyToken(token: string): { userId: string; email: string; roleName: string } | null {
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
    };
  } catch {
    return null;
  }
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
      channels: new Set(),
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
}, 60000);

console.log('✅ SecureTeam Chat Service is ready on port 3004');
