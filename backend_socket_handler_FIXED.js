import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import Ticket from '../models/Ticket.js';
import { logActivity } from '../utils/activityLogger.js';
import { sendPushNotification } from '../services/pushNotificationService.js';

// Function to broadcast active users in a room
export const broadcastActiveUsers = (io, ticketId) => {
  const room = io.sockets.adapter.rooms.get(`ticket_${ticketId}`);
  if (room) {
    const activeUsers = [];
    room.forEach(socketId => {
      const socket = io.sockets.sockets.get(socketId);
      if (socket && socket.userName) {
        activeUsers.push(socket.userName);
      }
    });

    io.to(`ticket_${ticketId}`).emit('active_users', activeUsers);
  }
};

// Socket.IO authentication middleware
export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Check if user exists in User table with appropriate role
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.userId = user._id;
    socket.userEmail = user.email;
    socket.userRole = decoded.role || 'customer';
    socket.userName = user.name;

    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
};

// Socket.IO connection handling
export const handleSocketConnection = (io) => {
  io.on('connection', (socket) => {
    // Clear any pending offline timeout for this user
    if (socket.offlineTimeout) {
      clearTimeout(socket.offlineTimeout);
      socket.offlineTimeout = null;
    }

    // Send welcome message
    socket.emit('welcome', {
      message: 'Connected to chat server',
      socketId: socket.id,
      userName: socket.userName
    });

    // Join ticket-specific room
    socket.on('join_ticket', (ticketId) => {
      const roomName = `ticket_${ticketId}`;
      
      // Prevent duplicate joins - check if already in room
      // socket.rooms is a Set, check if room already exists
      // Also check the adapter to be sure
      const isAlreadyInRoom = socket.rooms && socket.rooms.has(roomName);
      const room = io.sockets.adapter.rooms.get(roomName);
      const isInAdapterRoom = room && room.has(socket.id);
      
      if (isAlreadyInRoom || isInAdapterRoom) {
        console.log(`⚠️ User ${socket.userName} already in room ${roomName}, skipping duplicate join`);
        // Still send confirmation but don't re-join
        socket.emit('room_joined', {
          ticketId,
          roomName: roomName,
          userCount: room ? room.size : 0,
          alreadyJoined: true
        });
        return;
      }
      
      socket.join(roomName);
      console.log(`User ${socket.userName} (${socket.userEmail}) joined ticket room: ${roomName}`);

      // Get room info for debugging (after join)
      const updatedRoom = io.sockets.adapter.rooms.get(roomName);
      console.log(`Room ${roomName} now has ${updatedRoom ? updatedRoom.size : 0} users`);

      // Send confirmation
      socket.emit('room_joined', {
        ticketId,
        roomName: roomName,
        userCount: room ? room.size : 0
      });

      // Broadcast active users to all users in the room
      broadcastActiveUsers(io, ticketId);

      // Broadcast user online status
      const onlineStatusData = {
        userId: socket.userId,
        userName: socket.userName,
        userEmail: socket.userEmail,
        status: 'online',
        timestamp: new Date()
      };
      socket.to(`ticket_${ticketId}`).emit('user_status', onlineStatusData);
    });

    // Leave ticket room
    socket.on('leave_ticket', (ticketId) => {
      socket.leave(`ticket_${ticketId}`);
      // Broadcast active users to remaining users in the room
      broadcastActiveUsers(io, ticketId);

      // Broadcast user offline status
      const offlineStatusData = {
        userId: socket.userId,
        userName: socket.userName,
        userEmail: socket.userEmail,
        status: 'offline',
        timestamp: new Date()
      };
      socket.to(`ticket_${ticketId}`).emit('user_status', offlineStatusData);
    });

    // Handle new message
    socket.on('send_message', async (data) => {
      try {
        // Memory check: limit message size to prevent memory issues
        if (data.content && data.content.length > 10000) {
          socket.emit('error', { message: 'Message too long (max 10000 characters)' });
          return;
        }

        const { chatId, ticketId, content, messageType = 'text' } = data;
        
        // Create message object
        const messageData = {
          _id: `temp_${Date.now()}`, // Temporary ID for real-time display
          id: Date.now(), // Temporary ID for real-time display
          chatId,
          ticketId,
          sender: {
            userId: socket.userId,
            userType: socket.userRole,
            userName: socket.userName,
            userEmail: socket.userEmail
          },
          content,
          messageType,
          createdAt: new Date().toISOString(),
          isRead: false
        };

        // Emit message to all other users in the ticket room (exclude sender)
        // Frontend only listens to message_broadcast
        // Use socket.to() to exclude sender - sender already has optimistic message from frontend
        // This prevents duplicate messages for the sender
        socket.to(`ticket_${ticketId}`).emit('message_broadcast', {
          ...messageData,
          from: socket.userName
        });

        const notification = {
          type: 'chat',
          title: 'New message',
          body: content,
          ticketId,
          chatId,
          from: {
            userId: socket.userId,
            userName: socket.userName,
            userType: socket.userRole
          },
          createdAt: messageData.createdAt
        };
        io.to(`ticket_${ticketId}`).emit('chat_notification', notification);

        // Persist notifications in DB for ALL chat participants (excluding sender)
        try {
          const chat = await Chat.findById(chatId).select('participants').lean();
          if (chat && Array.isArray(chat.participants)) {
            const senderIdStr = String(socket.userId || '');
            const createOps = chat.participants
              .filter(p => String(p.userId) !== senderIdStr && p.status === 'active')
              .map(p => Notification.create({
                title: 'New Message',
                message: `${socket.userName}: ${content}`,
                type: 'info',
                category: 'ticket',
                userId: String(p.userId),
                metadata: {
                  ticketId,
                  chatId,
                  from: {
                    userId: socket.userId,
                    userName: socket.userName,
                    userType: socket.userRole
                  }
                }
              }));

            if (createOps.length > 0) {
              await Promise.allSettled(createOps);
            }
          }
        } catch (persistErr) {
          console.error('Failed to persist chat notifications:', persistErr);
        }

        // Activity log: if agent's first message in this chat
        try {
          if (socket.userRole === 'agent') {
            const count = await Message.countDocuments({ chatId, 'sender.userId': socket.userId });
            if (count === 0) {
              const ticketDoc = await Ticket.findById(ticketId).select('ticketNumber').lean();
              const ticketDisplay = ticketDoc?.ticketNumber || ticketId;
              await logActivity(null, {
                userId: socket.userId,
                message: `Ticket ${ticketDisplay} first message by ${socket.userName} and Message: ${content}`,
                status: 'updated'
              });
            }
          }
        } catch (logErr) {
          // ignore logging errors in socket path
        }

        // Send Firebase push notification to other participants
        try {
          const chat = await Chat.findById(chatId).select('participants ticketId').lean();
          if (chat && Array.isArray(chat.participants)) {
            const senderIdStr = String(socket.userId || '');
            const recipientIds = chat.participants
              .filter(p => String(p.userId) !== senderIdStr && (!p.status || p.status === 'active'))
              .map(p => p.userId);


            if (recipientIds.length > 0) {
              const ticket = await Ticket.findById(ticketId).select('ticketNumber').lean();
              const ticketNumber = ticket?.ticketNumber || 'Ticket';

              // Notification title format: "Sender name" replied to [Ticket ID]
              const notificationTitle = `"${socket.userName}" replied to ${ticketNumber}`;

              const pushResult = await sendPushNotification({
                title: notificationTitle,
                body: content.length > 100 ? content.substring(0, 100) + '...' : content,
                data: {
                  type: 'chat_message',
                  chatId: chatId,
                  ticketId: ticketId?.toString() || '',
                  senderId: socket.userId?.toString() || '',
                  senderName: socket.userName || '',
                  senderRole: socket.userRole || '',
                },
                userIds: recipientIds,
              });
            } else {
              console.log('⚠️ No recipients found for push notification');
            }
          }
        } catch (pushErr) {
          console.error('Failed to send Firebase push notification via socket:', pushErr);
          // Don't fail the message if push fails
        }

      } catch (error) {
        console.error('Error handling message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      socket.to(`ticket_${data.ticketId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.userName,
        isTyping: data.isTyping
      });
    });

    // Handle test message
    socket.on('test_message', (data) => {
      socket.emit('test_response', { message: 'Test message received successfully', from: socket.userName });
    });

    // Handle echo test for debugging
    socket.on('echo_test', (data) => {
      console.log(`Echo test from ${socket.userName}:`, data);
      socket.emit('echo_response', {
        original: data,
        timestamp: new Date(),
        from: socket.userName
      });
    });

    // Handle user online status for agent tracking
    socket.on('user_online', async (data) => {
      try {
        // Update agent status in database if user is an agent
        if (data.role === 'agent' || data.role === 'admin') {
          // Find agent by email or userId and update status
          await User.findOneAndUpdate(
            { 
              $or: [{ email: data.userEmail }, { _id: data.userId }],
              role: { $in: ['agent', 'manager'] }
            },
            { status: 'online' },
            { new: true }
          );

          // Broadcast agent online status to all connected clients
          io.emit('agent_status_update', {
            userId: data.userId,
            userEmail: data.userEmail,
            userName: data.userName,
            status: 'online',
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error updating agent online status:', error);
      }
    });

    // Handle user offline status for agent tracking
    socket.on('user_offline', async (data) => {
      try {
        // Update agent status in database if user is an agent
        if (data.role === 'agent' || data.role === 'admin') {
          // Find agent by email or userId and update status
          await User.findOneAndUpdate(
            { 
              $or: [{ email: data.userEmail }, { _id: data.userId }],
              role: { $in: ['agent', 'manager'] }
            },
            { status: 'offline' },
            { new: true }
          );

          // Broadcast agent offline status to all connected clients
          io.emit('agent_status_update', {
            userId: data.userId,
            userEmail: data.userEmail,
            userName: data.userName,
            status: 'offline',
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error updating agent offline status:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      // Clean up all rooms this socket was in
      socket.rooms.forEach(roomName => {
        if (roomName.startsWith('ticket_')) {
          const ticketId = roomName.replace('ticket_', '');
          broadcastActiveUsers(io, ticketId);
        }
      });

      // Clear socket data to free memory
      delete socket.userId;
      delete socket.userEmail;
      delete socket.userRole;
      delete socket.userName;
      
      // Clear offline timeout if exists
      if (socket.offlineTimeout) {
        clearTimeout(socket.offlineTimeout);
        socket.offlineTimeout = null;
      }

      if (socket.userRole === 'agent' || socket.userRole === 'admin') {
        const offlineTimeout = setTimeout(async () => {
          try {
            const agent = await User.findOne({ 
              $or: [{ email: socket.userEmail }, { _id: socket.userId }],
              role: { $in: ['agent', 'manager'] }
            });

            // Only set offline if still no active socket connection
            if (agent) {
              // Check if user has any other active connections
              let hasActiveConnection = false;
              io.sockets.sockets.forEach((s) => {
                if (s.userId && String(s.userId) === String(socket.userId) && s.id !== socket.id) {
                  hasActiveConnection = true;
                }
              });

              if (!hasActiveConnection) {
                await User.findOneAndUpdate(
                  { 
                    $or: [{ email: socket.userEmail }, { _id: socket.userId }],
                    role: { $in: ['agent', 'manager'] }
                  },
                  { status: 'offline' },
                  { new: true }
                );

                // Broadcast agent offline status to all connected clients
                io.emit('agent_status_update', {
                  userId: socket.userId,
                  userEmail: socket.userEmail,
                  userName: socket.userName,
                  status: 'offline',
                  timestamp: new Date()
                });
              }
            }
          } catch (error) {
            console.error('Error updating agent status on timeout:', error);
          }
        }, 30000); // 30 seconds delay

        // Store timeout reference for cleanup
        socket.offlineTimeout = offlineTimeout;
      }
    });

    // Handle request for initial ticket messages via socket (FAST LOADING)
    // Updated backend socket handler with dynamic limit and memory optimization
    socket.on('get_ticket_messages', async (data) => {
      try {
        // Handle both old format (string ticketId) and new format (object with ticketId and limit)
        let ticketId;
        let limit = 200; // Default limit (reduced to prevent memory issues)
 
        if (typeof data === 'string') {
          // Backward compatibility: if data is just a string, treat it as ticketId
          ticketId = data;
        } else if (typeof data === 'object' && data.ticketId) {
          // New format: { ticketId, limit }
          ticketId = data.ticketId;
          limit = data.limit || 200; // Use provided limit or default to 200
          // Enforce maximum limit to prevent memory issues
          if (limit > 200) {
            limit = 200;
          }
        } else {
          console.error('[SOCKET] Invalid get_ticket_messages data format:', data);
          socket.emit('ticket_messages', []);
          return;
        }
 
        console.log(`📥 [SOCKET] Received get_ticket_messages request for ticket: ${ticketId}, limit: ${limit}`);
 
        const chat = await Chat.findOne({ ticketId }).select('_id').lean();
        if (!chat) {
          console.log(`⚠️ [SOCKET] No chat found for ticket: ${ticketId}`);
          socket.emit('ticket_messages', []);
          return;
        }
 
        // First, get total count to check if we need to fetch latest messages
        const totalMessages = await Message.countDocuments({ chatId: chat._id });
 
        let messages;
        if (totalMessages > limit) {
          // If more messages than limit, fetch LATEST messages (most recent)
          // Then we'll reverse them to oldest first on frontend
          messages = await Message.find({ chatId: chat._id })
            .sort({ createdAt: -1 }) // Latest first
            .limit(limit)
            .lean()
            .select('_id chatId ticketId sender content messageType createdAt isRead readBy attachments');
          // Reverse to get oldest first for display
          messages.reverse();
          console.log(`📊 [SOCKET] Total messages: ${totalMessages}, sending latest ${messages.length} messages for ticket: ${ticketId}`);
        } else {
          // If less than limit, fetch all messages (oldest first)
          messages = await Message.find({ chatId: chat._id })
            .sort({ createdAt: 1 }) // Oldest first
            .limit(limit)
            .lean()
            .select('_id chatId ticketId sender content messageType createdAt isRead readBy attachments');
          console.log(`📊 [SOCKET] Total messages: ${totalMessages}, sending all messages for ticket: ${ticketId}`);
        }
 
        console.log(`✅ [SOCKET] Sending ${messages.length} initial messages via socket for ticket: ${ticketId}`);
        socket.emit('ticket_messages', messages);
      } catch (error) {
        console.error('[SOCKET] Error fetching ticket messages:', error);
        socket.emit('ticket_messages', []);
        socket.emit('error', { message: 'Failed to fetch ticket messages' });
      }
    });
  });

  // Periodic cleanup of disconnected sockets (run every 5 minutes)
  setInterval(() => {
    const sockets = io.sockets.sockets;
    let cleaned = 0;
    
    sockets.forEach((socket) => {
      if (!socket.connected) {
        // Clean up disconnected sockets
        socket.disconnect(true);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} disconnected sockets`);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
};

