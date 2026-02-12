import { io, Socket } from 'socket.io-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

export interface ChatMessage {
  _id?: string;
  id?: string;
  chatId: string;
  ticketId: string;
  sender: {
    userId: string;
    userType: 'customer' | 'agent' | 'manager';
    userName: string;
    userEmail: string;
  };
  content: string;
  messageType: 'text' | 'image' | 'file' | 'infoSystem';
  attachments?: Array<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
  }>;
  isRead: boolean;
  readBy?: Array<{
    userId: string;
    readAt: string;
  }>;
  createdAt: string;
}

export interface Chat {
  _id: string;
  ticketId: string;
  participants: Array<{
    userId: string;
    userType: 'customer' | 'agent' | 'manager';
    userName: string;
    userEmail: string;
  }>;
  isActive: boolean;
  lastMessage: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

class ChatService {
  private socket: Socket | null = null;
  private isConnected = false;
  private messageCallback: ((message: ChatMessage) => void) | null = null;
  private bulkMessagesCallback: ((messages: ChatMessage[]) => void) | null = null;
  private currentJoinedTicketId: string | null = null; // Track currently joined ticket
  private bulkMessagesListenerSetup = false; // Track if listener is already set up
  private messageListenerSetup = false; // Track if message listener is already set up

  // Get auth token
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  }

  // Get headers for API calls
  private getHeaders(): HeadersInit {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Initialize Socket.IO connection
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // If socket is already connected, resolve immediately
      if (this.socket && this.isConnected && this.socket.connected) {
        console.log('Socket already connected, reusing existing connection');
        resolve();
        return;
      }

      const token = this.getAuthToken();
      if (!token) {
        console.warn('No authentication token found, skipping socket connection');
        reject(new Error('No authentication token found'));
        return;
      }

      // Check if SOCKET_URL is available
      if (!SOCKET_URL) {
        console.warn('SOCKET_URL not configured, skipping socket connection');
        reject(new Error('Socket URL not configured'));
        return;
      }

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        console.error('Connection timeout after 10 seconds');
        if (this.socket && !this.socket.connected) {
          this.socket.disconnect();
          this.socket = null;
        }
        this.isConnected = false;
        reject(new Error('Connection timeout'));
      }, 10000);

      try {
        if (!this.socket) {
          // Create new socket only if one doesn't exist
          console.log('Creating new socket connection...');
          this.socket = io(SOCKET_URL, {
            auth: {
              token: token
            },
            transports: ['websocket', 'polling'],
            timeout: 10000,
            forceNew: false, // Reuse existing connection if possible
            reconnection: true,
            reconnectionAttempts: 3,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
          });
          
          // Set up socket event listeners only once when socket is first created
          this.setupSocketListeners(connectionTimeout, resolve, reject);
        } else if (!this.socket.connected) {
          // Socket exists but disconnected - reconnect it
          console.log('Socket exists but disconnected, reconnecting...');
          // Set up listeners again (they might have been removed)
          this.setupSocketListeners(connectionTimeout, resolve, reject);
          this.socket.connect();
        } else {
          // Socket is already connected
          clearTimeout(connectionTimeout);
          resolve();
        }
      } catch (error) {
        console.error('Failed to initialize socket:', error);
        clearTimeout(connectionTimeout);
        reject(error);
        return;
      }
    });
  }

  // Disconnect from Socket.IO
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Check if socket is connected
  isSocketConnected(): boolean {
    return this.socket !== null && this.isConnected && this.socket.connected;
  }

  // Setup socket event listeners (called only once when socket is created)
  private setupSocketListeners(
    connectionTimeout: NodeJS.Timeout,
    resolve: () => void,
    _reject: (error: Error) => void
  ): void {
    if (!this.socket) return;

    // Remove any existing listeners to avoid duplicates
    this.socket.off('connect');
    this.socket.off('connect_error');
    this.socket.off('disconnect');
    this.socket.off('welcome');
    this.socket.off('room_joined');

    this.socket.on('connect', () => {
      console.log('Connected to chat server with socket ID:', this.socket?.id);
      this.isConnected = true;
      clearTimeout(connectionTimeout);
      
      // Re-setup message listeners if callback was registered before connection
      // This ensures real-time messages are received properly
      if (this.messageCallback) {
        console.log('Setting up message listeners after socket connection...');
        this.setupMessageListeners();
      }

      // Reset listener setup flag on reconnect to allow fresh setup
      this.bulkMessagesListenerSetup = false;
      
      // Setup bulk messages listener if callback was registered before connection
      // MUST setup BEFORE any events are emitted (like joinTicket)
      if (this.bulkMessagesCallback) {
        console.log('🔧 [SOCKET] Setting up bulk messages listener after socket connection...');
        this.setupBulkMessagesListener();
      } else {
        console.warn('⚠️ [SOCKET] No bulk messages callback found when socket connected');
      }
      
      resolve();
    });

    // Listen for welcome message
    this.socket.on('welcome', (data) => {
      console.log('Welcome message received:', data);
    });

    // Listen for room joined confirmation
    this.socket.on('room_joined', (data) => {
      console.log('Room joined confirmation:', data);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
      clearTimeout(connectionTimeout);
      // Don't reject immediately, let it try fallback
      console.warn('Socket connection failed, will use API fallback');
      resolve(); // Resolve instead of reject to allow fallback
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      this.isConnected = false;
    });
  }

  // Get socket connection status
  getConnectionStatus(): { connected: boolean; socketId?: string; isConnected: boolean } {
    return {
      connected: this.socket?.connected || false,
      socketId: this.socket?.id,
      isConnected: this.isConnected
    };
  }

  // Join ticket room and request initial messages
  joinTicket(ticketId: string, requestMessages = true): void {
    if (this.socket && this.isConnected) {
      // Prevent duplicate joins for same ticket
      if (this.currentJoinedTicketId === ticketId) {
        console.log('⚠️ [SOCKET] Already joined ticket room:', ticketId, '- skipping duplicate join');
        // Still request messages if needed (in case messages weren't received before)
        if (requestMessages) {
          setTimeout(() => {
            if (this.socket && this.isConnected && this.currentJoinedTicketId === ticketId) {
              console.log('📤 [SOCKET] Re-requesting messages for already joined ticket:', ticketId);
              this.socket.emit('get_ticket_messages', { ticketId, limit: 200 });
            }
          }, 100);
        }
        return;
      }
      
      // Reset listener if switching tickets
      if (this.currentJoinedTicketId && this.currentJoinedTicketId !== ticketId) {
        console.log('🔄 [SOCKET] Switching tickets, resetting bulk messages listener');
        this.resetBulkMessagesListener();
        // Leave previous ticket room
        this.socket.emit('leave_ticket', this.currentJoinedTicketId);
      }
      
      // Ensure bulk messages listener is set up BEFORE requesting messages (only if not already set up)
      if (requestMessages && this.bulkMessagesCallback && !this.bulkMessagesListenerSetup) {
        console.log('🔧 [SOCKET] Ensuring bulk messages listener is set up before requesting messages');
        this.setupBulkMessagesListener();
      }
      
      console.log('Joining ticket room via socket:', ticketId);
      this.socket.emit('join_ticket', ticketId);
      this.currentJoinedTicketId = ticketId;
      
      // Request initial messages via socket if requested (faster than API)
      // Small delay to ensure listener is fully set up
      if (requestMessages) {
        setTimeout(() => {
          if (this.socket && this.isConnected && this.currentJoinedTicketId === ticketId) {
            console.log('📤 [SOCKET] Requesting initial messages via socket for ticket:', ticketId);
            // Send ticketId and limit (200 messages max to prevent memory issues)
            this.socket.emit('get_ticket_messages', { ticketId, limit: 200 });
            console.log('📤 [SOCKET] Event "get_ticket_messages" emitted with ticketId:', ticketId, 'limit: 200 (latest messages)');
          }
        }, 100); // Small delay to ensure listener is ready
      }
    } else {
      console.warn('Cannot join ticket room - socket not connected');
    }
  }

  // Leave ticket room
  leaveTicket(ticketId: string): void {
    if (this.socket && this.isConnected) {
      console.log('Leaving ticket room via socket:', ticketId);
      this.socket.emit('leave_ticket', ticketId);
      
      // Reset joined ticket tracking if leaving current ticket
      if (this.currentJoinedTicketId === ticketId) {
        this.currentJoinedTicketId = null;
        this.resetBulkMessagesListener();
      }
    }
  }

  // Send message via Socket.IO
  sendMessage(data: {
    chatId: string;
    ticketId: string;
    content: string;
    messageType?: 'text' | 'image' | 'file';
  }): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('send_message', data);
    } else {
      this.connect().then(() => {
        if (this.socket && this.isConnected) {
          this.socket.emit('send_message', data);
        }
      }).catch((error) => {
        console.error('Failed to reconnect socket:', error);
      });
    }
  }

  // Send typing indicator
  sendTyping(ticketId: string, isTyping: boolean): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing', { ticketId, isTyping });
    }
  }


  // Listen for bulk messages (initial load via socket)
  onBulkMessages(callback: (messages: ChatMessage[]) => void): void {
    // Store callback (can be updated - existing listener will use the latest callback)
    this.bulkMessagesCallback = callback;

    // Only setup listener if not already set up
    if (this.socket && this.isConnected) {
      // Only set up if listener is not already set up
      if (!this.bulkMessagesListenerSetup) {
        this.setupBulkMessagesListener();
      } else {
        console.log('👂 [SOCKET] Bulk messages callback updated, listener already exists - will use new callback');
      }
    } else {
      console.log('👂 [SOCKET] Bulk messages callback stored, will setup listener when socket connects');
    }
  }

  // Setup bulk messages listener (called when socket connects)
  private setupBulkMessagesListener(): void {
    if (!this.socket) {
      console.warn('⚠️ [SOCKET] Cannot setup bulk messages listener - socket is null');
      return;
    }
    
    if (!this.bulkMessagesCallback) {
      console.warn('⚠️ [SOCKET] Cannot setup bulk messages listener - callback is null');
      return;
    }

    // Prevent multiple setups - if already set up, just return
    if (this.bulkMessagesListenerSetup) {
      console.log('⚠️ [SOCKET] Bulk messages listener already set up, skipping duplicate setup');
      return;
    }

    console.log('🔧 [SOCKET] Setting up bulk messages listener...');
    console.log('🔧 [SOCKET] Socket connected:', this.socket.connected);
    console.log('🔧 [SOCKET] Callback exists:', !!this.bulkMessagesCallback);

    // Remove existing listener to avoid duplicates
    this.socket.off('ticket_messages');
    
    // Listen for bulk messages response from socket
    this.socket.on('ticket_messages', (data: { messages: ChatMessage[] } | ChatMessage[]) => {
      console.log('📥 [SOCKET] Received bulk messages via socket:', data);
      // Handle both formats: { messages: [] } or []
      const messages = Array.isArray(data) ? data : (data.messages || []);
      console.log(`📥 [SOCKET] Parsed ${messages.length} messages from socket`);
      if (this.bulkMessagesCallback) {
        console.log('✅ [SOCKET] Calling bulk messages callback with', messages.length, 'messages');
        this.bulkMessagesCallback(messages);
      } else {
        console.warn('⚠️ [SOCKET] Bulk messages callback is null!');
      }
    });
    
    this.bulkMessagesListenerSetup = true;
    console.log('👂 [SOCKET] Listening for "ticket_messages" event - LISTENER SETUP COMPLETE');
  }

  // Reset bulk messages listener setup flag (call when changing tickets)
  private resetBulkMessagesListener(): void {
    this.bulkMessagesListenerSetup = false;
    if (this.socket) {
      this.socket.off('ticket_messages');
    }
  }

  // Listen for new messages
  onNewMessage(callback: (message: ChatMessage) => void): void {
    // Store the callback for direct access (always store, even if socket not connected)
    this.messageCallback = callback;

    // Setup listeners if socket is already connected
    // Reset flag first to allow re-setup (needed when switching tickets)
    if (this.socket && this.isConnected && this.socket.connected) {
      console.log('Setting up message_broadcast listener (socket already connected)...');
      this.messageListenerSetup = false; // Reset flag to allow re-setup
      this.setupMessageListeners();
    } else {
      console.log('Socket not connected yet, callback stored. Will setup listener on connect.');
    }
  }

  // Setup message listeners (can be called multiple times safely)
  private setupMessageListeners(): void {
    if (!this.socket || !this.messageCallback) return;

    // Prevent duplicate listener setup
    if (this.messageListenerSetup) {
      console.log('⚠️ Message listener already set up, skipping duplicate setup');
      return;
    }

    // Remove existing listeners first to avoid duplicates
    this.socket.off('new_message');
    this.socket.off('message_broadcast');
    
    // ONLY listen to message_broadcast to avoid duplicates
    // Backend sends message_broadcast to others (via socket.to) - sender doesn't receive it
    // Frontend duplicate detection will handle any edge cases
    this.socket.on('message_broadcast', (data: ChatMessage & { from?: string; isFromSelf?: boolean }) => {
      // message_broadcast has message data directly (backend: { ...messageData, from: socket.userName })
      // Extract the message part (ignore 'from' and 'isFromSelf' fields)
      const message = {
        _id: data._id,
        id: data.id,
        chatId: data.chatId,
        ticketId: data.ticketId,
        sender: data.sender,
        content: data.content,
        messageType: data.messageType,
        createdAt: data.createdAt,
        isRead: data.isRead
      };
      console.log('Received message_broadcast via socket:', message);
      if (this.messageCallback) {
        this.messageCallback(message);
      }
    });
    
    this.messageListenerSetup = true;
    console.log('✅ Message listener set up successfully');
    
    // Note: new_message event is NOT used here to prevent duplicates
    // Backend sends new_message to other users, but message_broadcast is sent to everyone
    // Using only message_broadcast ensures each message is processed only once
  }
  
  // Reset message listener setup flag (call when listeners are removed)
  resetMessageListenerSetup(): void {
    this.messageListenerSetup = false;
  }

  // Listen for typing indicators
  onTyping(callback: (data: { userId: string; userName: string; isTyping: boolean }) => void): void {
    if (this.socket) {
      // Remove existing listener to avoid duplicates
      this.socket.off('user_typing');
      this.socket.on('user_typing', callback);
    }
  }

  // Listen for errors
  onError(callback: (error: { message: string }) => void): void {
    if (this.socket) {
      // Remove existing listener to avoid duplicates
      this.socket.off('error');
      this.socket.on('error', callback);
    }
  }

  // Listen for active users in room
  onActiveUsers(callback: (users: string[]) => void): void {
    if (this.socket) {
      // Remove existing listener to avoid duplicates
      this.socket.off('active_users');
      this.socket.on('active_users', callback);
    }
  }

  // Listen for user status changes (online/offline)
  onUserStatus(callback: (data: { userId: string, userName: string, status: 'online' | 'offline' }) => void): void {
    if (this.socket) {
      this.socket.off('user_status');
      this.socket.on('user_status', (data) => {
        console.log('Raw user_status event received:', data);
        callback(data);
      });
    } else {
      console.log('Socket not available for user_status listener');
    }
  }

  // Remove all listeners
  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // API Methods

  // Get or create chat for a ticket
  async getOrCreateChat(ticketId: string): Promise<Chat> {
    try {
      const response = await fetch(`${API_BASE}/chat/admin/chat/ticket/${ticketId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to get or create chat');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting or creating chat:', error);
      throw error;
    }
  }

  // Get chat messages (optimized for speed)
  // Fetches latest messages first, then sorts them oldest first for display
  // Using reasonable limit (200) to prevent memory issues
  async getChatMessages(chatId: string, page = 1, limit = 200): Promise<ChatMessage[]> {
    try {
      // Use cache: 'no-store' to avoid cache validation delay, but keep it simple
      // Using high limit (5000) to ensure all messages are loaded
      const response = await fetch(`${API_BASE}/chat/admin/chat/${chatId}/messages?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders(),
        // Don't wait for cache validation - fetch fresh data but don't block on cache check
        cache: 'no-cache',
      });

      if (!response.ok) {
        throw new Error('Failed to get chat messages');
      }

      const data = await response.json();
      const messages = Array.isArray(data.data) ? data.data : [];
      
      // Always sort messages by createdAt (oldest first) for consistent display
      // Backend might return in different order, so we always sort to be safe
      const sortedMessages = messages.sort((a: ChatMessage, b: ChatMessage) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB; // Oldest first
      });
      
      console.log(`📥 [API] Fetched ${sortedMessages.length} messages (limit: ${limit})`);
      if (sortedMessages.length > 0) {
        const oldest = new Date(sortedMessages[0].createdAt || 0).toISOString();
        const latest = new Date(sortedMessages[sortedMessages.length - 1].createdAt || 0).toISOString();
        console.log(`📥 [API] Message range: ${oldest} to ${latest}`);
        console.log(`📥 [API] Latest message timestamp: ${latest}`);
      }
      return sortedMessages;
    } catch (error) {
      console.error('Error getting chat messages:', error);
      throw error;
    }
  }

  // Get latest messages (for initial load - fetches latest, returns last N)
  async getLatestMessages(chatId: string, limit = 50): Promise<ChatMessage[]> {
    try {
      // Fetch latest messages and take the last 'limit' messages
      const allMessages = await this.getChatMessages(chatId, 1, 200);
      
      // Get the last N messages (most recent)
      const latestMessages = allMessages.slice(-limit);
      
      console.log(`📥 [API] Fetched latest ${latestMessages.length} messages out of ${allMessages.length} total`);
      return latestMessages;
    } catch (error) {
      console.error('Error getting latest messages:', error);
      throw error;
    }
  }

  // Get older messages (messages before the oldest message in current list)
  async getOlderMessages(chatId: string, beforeDate: string, limit = 50): Promise<ChatMessage[]> {
    try {
      // Fetch latest messages and filter those before the given date
      const allMessages = await this.getChatMessages(chatId, 1, 200);
      const beforeTimestamp = new Date(beforeDate).getTime();
      
      // Filter messages before the date and take last N (most recent of the older ones)
      const olderMessages = allMessages
        .filter(msg => new Date(msg.createdAt || 0).getTime() < beforeTimestamp)
        .slice(-limit);
      
      console.log(`📥 [API] Fetched ${olderMessages.length} older messages before ${beforeDate}`);
      return olderMessages;
    } catch (error) {
      console.error('Error getting older messages:', error);
      throw error;
    }
  }

  // Send message via API (for persistence)
  async sendMessageAPI(data: {
    chatId: string;
    content: string;
    messageType?: 'text' | 'image' | 'file';
    attachments?: { filename: string, url: string }[];
  }): Promise<ChatMessage> {
    try {
      const response = await fetch(`${API_BASE}/chat/admin/chat/send`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Get user's chats
  async getUserChats(): Promise<Chat[]> {
    try {
      const response = await fetch(`${API_BASE}/chat/admin/chats`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to get user chats');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting user chats:', error);
      throw error;
    }
  }
}

// Create singleton instance
const chatService = new ChatService();
export default chatService;
