# Backend Socket Memory Leak Fixes

यह file backend के socket handler में memory leak को fix करने के लिए changes दिखाती है।

## Main Issues Fixed:
1. Message limit को 10000 से 200 तक reduce किया
2. Socket cleanup properly add किया
3. Memory management improvements

## Changes to apply in your backend socket handler:

### 1. Reduce Message Limit in `get_ticket_messages` handler:

**OLD CODE:**
```javascript
socket.on('get_ticket_messages', async (data) => {
  let limit = 5000; // Default limit (high limit to get all messages)
  // ...
  if (typeof data === 'object' && data.ticketId) {
    ticketId = data.ticketId;
    limit = data.limit || 5000; // Use provided limit or default to 5000
  }
```

**NEW CODE:**
```javascript
socket.on('get_ticket_messages', async (data) => {
  let limit = 200; // Default limit (reduced to prevent memory issues)
  // ...
  if (typeof data === 'object' && data.ticketId) {
    ticketId = data.ticketId;
    limit = data.limit || 200; // Use provided limit or default to 200 (max 200)
    // Enforce maximum limit to prevent memory issues
    if (limit > 200) {
      limit = 200;
    }
  }
```

### 2. Add Socket Cleanup on Disconnect:

**ADD THIS in `handleSocketConnection` function, in the disconnect handler:**

```javascript
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
```

### 3. Add Memory Limit Check in Message Handler:

**In `send_message` handler, add this check at the beginning:**

```javascript
socket.on('send_message', async (data) => {
  try {
    // Memory check: limit message size
    if (data.content && data.content.length > 10000) {
      socket.emit('error', { message: 'Message too long (max 10000 characters)' });
      return;
    }

    const { chatId, ticketId, content, messageType = 'text' } = data;
    // ... rest of the code
```

### 4. Optimize Message Fetching:

**In `get_ticket_messages` handler, ensure we're using lean() and limiting properly:**

```javascript
socket.on('get_ticket_messages', async (data) => {
  try {
    let ticketId;
    let limit = 200; // Reduced default limit
 
    if (typeof data === 'string') {
      ticketId = data;
    } else if (typeof data === 'object' && data.ticketId) {
      ticketId = data.ticketId;
      limit = data.limit || 200;
      // Enforce maximum to prevent memory issues
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
 
    // Get total count
    const totalMessages = await Message.countDocuments({ chatId: chat._id });
 
    let messages;
    if (totalMessages > limit) {
      // Fetch LATEST messages only
      messages = await Message.find({ chatId: chat._id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .select('_id chatId ticketId sender content messageType createdAt isRead readBy attachments');
      // Reverse to get oldest first for display
      messages.reverse();
      console.log(`📊 [SOCKET] Total messages: ${totalMessages}, sending latest ${messages.length} messages for ticket: ${ticketId}`);
    } else {
      // Fetch all messages (oldest first)
      messages = await Message.find({ chatId: chat._id })
        .sort({ createdAt: 1 })
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
```

### 5. Add Periodic Cleanup (Optional but Recommended):

**Add this at the end of your socket handler file or in a separate cleanup function:**

```javascript
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
```

## Summary of Changes:
1. ✅ Message limit: 10000 → 200
2. ✅ Added socket cleanup on disconnect
3. ✅ Added memory limit checks
4. ✅ Used `.lean()` for MongoDB queries to reduce memory
5. ✅ Added periodic cleanup of disconnected sockets
6. ✅ Enforced maximum limits to prevent abuse

ये changes apply करने के बाद memory usage significantly कम हो जाएगा।

