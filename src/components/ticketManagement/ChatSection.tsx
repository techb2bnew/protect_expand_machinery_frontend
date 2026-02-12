import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { Ticket } from '@/services/ticketService';
import chatService, { ChatMessage, Chat } from '@/services/chatService';

interface ChatSectionProps {
  ticket?: Ticket | null;
}

export default function ChatSection({ ticket }: ChatSectionProps) {
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesReceivedRef = useRef(false); 
  const initialLoadDoneRef = useRef(false); // Track if initial load is complete
  const isInitializingRef = useRef(false); // Track if initialization is in progress
  const previousTicketIdRef = useRef<string | undefined>(undefined); // Track previous ticket ID
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [, setSocketConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [, setActiveUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_FILE_BASE_URL as string | undefined;

  const resolveImageUrl = useCallback((url?: string) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (!IMAGE_BASE_URL) return url;
    const trimmed = url.startsWith('/') ? url.slice(1) : url;
    return `${IMAGE_BASE_URL}/${trimmed}`;
  }, [IMAGE_BASE_URL]);

  // Manual message fetching fallback
  const fetchMessagesManually = useCallback(async () => {
    if (!ticket?._id) return;

    try {
      console.log('Fetching messages manually...');
      const messages = await chatService.getChatMessages(ticket._id);
      setChatMessages(messages);
    } catch (error) {
      console.error('Failed to fetch messages manually:', error);
    }
  }, [ticket?._id]);

  const initializeChat = useCallback(async () => {
    if (!ticket?._id) return;
    
    if (isInitializingRef.current) {
      console.log('⚠️ [SKIP] Chat initialization already in progress, skipping duplicate call');
      return;
    }
    
    isInitializingRef.current = true;

    try {
      const isInitialLoad = chatMessages.length === 0;
      if (isInitialLoad) {
        setLoading(true);
      }

      const shouldProcessBulkMessages = chatMessages.length === 0;
      messagesReceivedRef.current = false; 
      
      chatService.onBulkMessages((messages) => {
        if (!shouldProcessBulkMessages || initialLoadDoneRef.current) {
          console.log('⚠️ [SKIP] Bulk messages received but initial load already done - ignoring to prevent overwriting existing messages');
          return;
        }
        
        console.log('✅ [SUCCESS] Received initial messages via socket:', messages?.length || 0, 'messages');
        messagesReceivedRef.current = true;
        initialLoadDoneRef.current = true;
         setChatMessages(messages || []);
         setLoading(false); 
        console.log(`✅ [SUCCESS] Messages loaded via socket - showing ${messages?.length || 0} messages`);
      });

      const socketConnectPromise = chatService.connect().then(() => {
        setSocketConnected(true);
        setConnectionError(null);
        
        if (handlersRef.current) {
          chatService.onNewMessage(handlersRef.current.handleNewMessage);
          chatService.onTyping(handlersRef.current.handleTyping);
          chatService.onError(handlersRef.current.handleError);
          chatService.onActiveUsers(handlersRef.current.handleActiveUsers);
        }
        
        // Join ticket room and request initial messages via socket
        chatService.joinTicket(ticket._id, true);
        return true;
      }).catch((error) => {
        console.warn('Socket connection failed, using fallback mode:', error);
        setSocketConnected(false);
        setConnectionError('Real-time connection failed. Using fallback mode.');
        return false;
      });

      // PRIORITY 2: Get chat data (needed for sending messages)
      const chatData = await chatService.getOrCreateChat(ticket._id);
      setChat(chatData);

      // PRIORITY 3: Wait for socket messages (max 1000ms) OR use API fallback
      // Give more time for socket to send messages (backend is sending them)
      const socketConnected = await Promise.race([
        socketConnectPromise,
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 1000))
      ]);
      if (!messagesReceivedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

       // If socket didn't send messages, use API as fallback
       if (!messagesReceivedRef.current && shouldProcessBulkMessages) {
         console.warn('⚠️ [FALLBACK] Socket did not send messages, using API fallback');
         // Load latest messages (200 max to prevent memory issues)
         const apiMessages = await chatService.getChatMessages(chatData._id, 1, 200);
         initialLoadDoneRef.current = true;
         setChatMessages(apiMessages);
         setLoading(false); // Hide loading after API messages loaded
         console.log('✅ [API] Messages loaded via API fallback (ALL messages):', apiMessages.length, 'messages');
       } else if (messagesReceivedRef.current) {
        console.log('✅ [SUCCESS] Messages received via socket successfully!');
        // Ensure loading is hidden (should already be hidden in callback)
        setLoading(false);
      } else {
        // Messages already loaded, just ensure loading is off
        setLoading(false);
      }

    } catch (error) {
      console.error('Failed to initialize chat:', error);
      setLoading(false);
      // Fallback to manual message fetching on error
      if (ticket?._id) {
        fetchMessagesManually().catch(() => {
          // Silent fail
        });
      }
    } finally {
      isInitializingRef.current = false;
    }
  }, [ticket?._id]); // Remove chatMessages.length and fetchMessagesManually to prevent infinite loops

  // Initialize chat when component mounts or ticket changes
  useEffect(() => {
    const currentTicketId = ticket?._id;
    
    if (!currentTicketId) {
      // Clear messages if ticket is null
      setChatMessages([]);
      setChat(null);
      isInitializingRef.current = false;
      previousTicketIdRef.current = undefined;
      return;
    }
    
    // Only clear messages if ticket ID actually changed (not on same ticket refresh)
    const ticketChanged = previousTicketIdRef.current !== currentTicketId;
    
    if (ticketChanged) {
      // Clear previous messages when ticket changes (to prevent showing old ticket's messages)
      setChatMessages([]);
      setChat(null);
      // Reset flags when ticket changes
       initialLoadDoneRef.current = false;
       messagesReceivedRef.current = false;
       isInitializingRef.current = false;
      
      // Leave previous ticket room if there was one
      if (previousTicketIdRef.current) {
        chatService.leaveTicket(previousTicketIdRef.current);
      }
      
      previousTicketIdRef.current = currentTicketId;
    }
    
    // Initialize chat (only if not already initializing and ticket exists)
    if (!isInitializingRef.current && currentTicketId) {
      initializeChat();
    }
    
    return () => {
      // Cleanup: leave ticket room on unmount or ticket change
      if (currentTicketId) {
        chatService.leaveTicket(currentTicketId);
      }
      isInitializingRef.current = false;
      // Clean up processed messages ref when ticket changes
      processedMessagesRef.current.clear();
      processingMessagesRef.current.clear();
    };
  }, [ticket?._id]); // Only depend on ticket._id to prevent infinite loops

  // Add connection timeout fallback (reduced timeout since messages load first now)
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('Chat loading timeout - falling back to manual refresh');
        setLoading(false);
        // Try to fetch messages manually if initial load fails
        if (ticket?._id) {
          fetchMessagesManually();
        }
      }, 5000); // Reduced to 5 seconds since messages should load first, socket is non-blocking

      return () => clearTimeout(timeout);
    }
  }, [loading, ticket?._id, fetchMessagesManually]);

  // Track recently processed messages to prevent duplicates
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const processingMessagesRef = useRef<Set<string>>(new Set()); // Track messages currently being processed
  const currentTicketIdRef = useRef<string | undefined>(ticket?._id); // Track current ticket ID for message filtering
  const handlersRef = useRef<{
    handleNewMessage: (newMessage: ChatMessage) => void;
    handleTyping: (data: { userId: string; userName: string; isTyping: boolean }) => void;
    handleError: (error: { message: string }) => void;
    handleActiveUsers: (users: string[]) => void;
  } | null>(null); // Store handlers to re-register when ticket changes

  // Update current ticket ID ref when ticket changes
  useEffect(() => {
    currentTicketIdRef.current = ticket?._id;
  }, [ticket?._id]);

  // Periodic cleanup of processedMessagesRef to prevent memory leak
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // Clean up old entries (keep only last 100 to prevent memory growth)
      if (processedMessagesRef.current.size > 100) {
        const entries = Array.from(processedMessagesRef.current);
        // Remove oldest entries (keep last 50)
        entries.slice(0, entries.length - 50).forEach(key => {
          processedMessagesRef.current.delete(key);
        });
      }
      // Clean up processing set as well
      if (processingMessagesRef.current.size > 50) {
        processingMessagesRef.current.clear();
      }
    }, 30000); // Clean up every 30 seconds

    return () => clearInterval(cleanupInterval);
  }, []);

  // Set up socket listeners - this runs once on mount
  useEffect(() => {
    const handleNewMessage = (newMessage: ChatMessage) => {
      // CRITICAL: Filter messages by ticketId - only process messages for current ticket
      // This prevents messages from other tickets (when agent has multiple tickets) from appearing
      const currentTicketId = currentTicketIdRef.current;
      if (currentTicketId && newMessage.ticketId && newMessage.ticketId !== currentTicketId) {
        console.log('🚫 [FILTER] Ignoring message from different ticket:', {
          messageTicketId: newMessage.ticketId,
          currentTicketId: currentTicketId,
          content: newMessage.content
        });
        return; // Exit early - this message belongs to a different ticket
      }
      
      // Create a unique key based on content + sender + timestamp (not ID, as IDs might differ)
      // This is more reliable for detecting duplicates
      const messageKey = `${newMessage.content?.trim()}_${newMessage.sender.userEmail}_${newMessage.createdAt}`;
      
      // ATOMIC CHECK: Check and mark as processing in one operation to prevent race conditions
      if (processingMessagesRef.current.has(messageKey)) {
        console.log('⚠️ Message is already being processed, ignoring duplicate call:', newMessage.content);
        return; // Exit early if already processing
      }
      
      // Check if we've already processed this exact message
      if (processedMessagesRef.current.has(messageKey)) {
        console.log('⚠️ Duplicate message detected (already processed), ignoring:', newMessage.content);
        return; // Exit early if already processed
      }
      
      // Mark as currently being processed IMMEDIATELY (before any async operations)
      processingMessagesRef.current.add(messageKey);
      
      // Get current user email to check if this is our own message
      const currentUserEmail = localStorage.getItem('user_email') || sessionStorage.getItem('user_email');
      let tokenEmail = null;
      try {
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          tokenEmail = payload.email;
        }
      } catch {
        console.warn('Could not decode token for email');
      }
      const userEmail = currentUserEmail || tokenEmail;
      const isFromCurrentUser = newMessage.sender.userEmail === userEmail;

      // INSTANT update via socket - no delay
      setChatMessages(prev => {
        // FIRST: Check for duplicate by _id or id (fastest check) - check BOTH temp and real IDs
        const existingIndex = prev.findIndex(msg => {
          // Check if IDs match (either _id or id)
          const msgIdMatch = (msg._id && newMessage._id && msg._id === newMessage._id) ||
                             (msg.id && newMessage.id && msg.id === newMessage.id);
          
          // Also check if temp ID matches (for optimistic messages)
          const tempIdMatch = msg._id?.startsWith('temp_') && 
                             newMessage._id?.startsWith('temp_') &&
                             msg._id === newMessage._id;
          
          return msgIdMatch || tempIdMatch;
        });
        
        if (existingIndex !== -1) {
          // If message already exists, don't add duplicate
          console.log('⚠️ Message already exists by ID, ignoring duplicate:', newMessage._id || newMessage.id);
          processingMessagesRef.current.delete(messageKey);
          return prev; // Return unchanged to prevent duplicate
        }
        
        // SECOND: Check for duplicate by content + sender + timestamp (within 1 second)
        // This catches duplicates even if they have slightly different timestamps
        const duplicateByContent = prev.findIndex(msg => {
          if (!msg.content || !newMessage.content) return false;
          
          // Exact content match (case-sensitive, trimmed)
          const msgContent = String(msg.content).trim();
          const newMsgContent = String(newMessage.content).trim();
          if (msgContent !== newMsgContent) return false;
          
          // Same sender (MUST match exactly)
          if (msg.sender?.userEmail !== newMessage.sender?.userEmail) return false;
          
          // Check if timestamps are very close (within 1 second) - likely same message
          const msgTime = new Date(msg.createdAt).getTime();
          const newMsgTime = new Date(newMessage.createdAt).getTime();
          const timeDiff = Math.abs(msgTime - newMsgTime);
          
          if (timeDiff < 1000) { // Within 1 second
            console.log('⚠️ Duplicate detected: exact same content, sender, and timestamp:', {
              content: newMsgContent,
              sender: newMessage.sender?.userEmail,
              existingTimestamp: msg.createdAt,
              newTimestamp: newMessage.createdAt,
              timeDiff: timeDiff + 'ms'
            });
            return true;
          }
          
          return false;
        });
        
        if (duplicateByContent !== -1) {
          console.log('⚠️ Duplicate message detected by content+sender+time, ignoring:', newMessage.content);
          // Remove from processing set since we're not adding it
          processingMessagesRef.current.delete(messageKey);
          return prev; // Return unchanged to prevent duplicate
        }

        // If this is from current user, check for matching temp message by content and timing
        if (isFromCurrentUser) {
          const now = Date.now();
          const tempMessageIndex = prev.findIndex(msg => {
            if (!msg._id?.startsWith('temp-')) return false;
            
            // Match by content (must be exact)
            const contentMatch = msg.content === newMessage.content;
            
            // Also check if temp message was created recently (within 5 seconds for better matching)
            const tempTimestamp = msg._id.replace('temp-', '');
            const tempTime = parseInt(tempTimestamp, 10);
            const isRecent = !isNaN(tempTime) && (now - tempTime) < 5000; // 5 seconds
            
            return contentMatch && isRecent;
          });
          
          if (tempMessageIndex !== -1) {
            // Replace temp message with real message from socket
            console.log('🔄 Replacing temp message with real socket message');
            // Mark as processed
            processingMessagesRef.current.delete(messageKey); // Remove from processing
            processedMessagesRef.current.add(messageKey); // Mark as processed
            setTimeout(() => {
              processedMessagesRef.current.delete(messageKey);
            }, 5000);
            
            
            const updated = [...prev];
            updated[tempMessageIndex] = newMessage;
            return updated;
          } else {
            // If no matching temp message found for sender's own message, ignore it
            // (optimistic message already shown, or API response will handle it)
            console.log('⚠️ Sender\'s own message received but no matching temp message found - ignoring to prevent duplicate');
            processingMessagesRef.current.delete(messageKey); // Remove from processing
            return prev; // Return unchanged to prevent duplicate
          }
        }

        // Add new message instantly (via socket - real-time, only for other users' messages)
        console.log('✅ Adding new message to chat:', newMessage.content);
        // Mark as processed AFTER we've confirmed it's not a duplicate and we're adding it
        processingMessagesRef.current.delete(messageKey); // Remove from processing
        processedMessagesRef.current.add(messageKey); // Mark as processed
        
        
        // Clean up old entries after 5 seconds to prevent memory leak
        setTimeout(() => {
          processedMessagesRef.current.delete(messageKey);
        }, 5000);
        
        return [...prev, newMessage];
      });
      scrollToBottom(); // Always scroll to show new message in real-time
    };

    const handleTyping = (data: { userId: string; userName: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        if (data.isTyping) {
          return [...prev.filter(name => name !== data.userName), data.userName];
        } else {
          return prev.filter(name => name !== data.userName);
        }
      });
    };

    const handleError = (error: { message: string }) => {
      console.error('Chat error:', error.message);
    };

    const handleActiveUsers = (users: string[]) => {
      setActiveUsers(users);
    };

    handlersRef.current = { handleNewMessage, handleTyping, handleError, handleActiveUsers };
    
    // Register callbacks - these will setup listeners if socket is connected
    chatService.onNewMessage(handlersRef.current.handleNewMessage);
    chatService.onTyping(handlersRef.current.handleTyping);
    chatService.onError(handlersRef.current.handleError);
    chatService.onActiveUsers(handlersRef.current.handleActiveUsers);
    
    return () => {
    };
  }, []);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);


  const handleSendMessage = async () => {
    if (!message.trim() || !chat || !ticket?._id || ticket.status === 'closed') return;

    const messageContent = message.trim();
    setMessage('');

    // Get current user info for optimistic message
    const currentUserEmail = localStorage.getItem('user_email') || sessionStorage.getItem('user_email');
    let tokenEmail = null;
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        tokenEmail = payload.email;
      }
    } catch {
      console.warn('Could not decode token for email');
    }
    const userEmail = currentUserEmail || tokenEmail;

    // Create optimistic message to show immediately
    const optimisticMessage: ChatMessage = {
      _id: `temp-${Date.now()}`,
      chatId: chat._id,
      ticketId: ticket._id,
      sender: {
        userId: '', // Will be updated when real message arrives
        userType: 'agent',
        userName: 'You',
        userEmail: userEmail || ''
      },
      content: messageContent,
      messageType: 'text',
      isRead: false,
      createdAt: new Date().toISOString()
    };

    // Add optimistic message to UI immediately (INSTANT)
    setChatMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom(); // Always scroll when user sends message

    // Stop typing indicator
    chatService.sendTyping(ticket._id, false);
    setIsTyping(false);

    try {
      chatService.sendMessage({
        chatId: chat._id,
        ticketId: ticket._id,
        content: messageContent,
        messageType: 'text'
      });

      chatService.sendMessageAPI({
        chatId: chat._id,
        content: messageContent,
        messageType: 'text'
      }).then((savedMessage) => {
        // Replace optimistic message with real message when API responds
        setChatMessages(prev => prev.map(msg => 
          msg._id === optimisticMessage._id ? savedMessage : msg
        ));
      }).catch((error) => {
        console.error('Failed to save message via API:', error);
        // Keep optimistic message even if API fails
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setChatMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
      // Restore message on error
      setMessage(messageContent);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    if (!ticket?._id || ticket.status === 'closed') return;

    // Send typing indicator
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      chatService.sendTyping(ticket._id, true);
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
      chatService.sendTyping(ticket._id, false);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        chatService.sendTyping(ticket._id, false);
      }
    }, 1000);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'N/A';
    return name?.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };




  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-500 text-white font-semibold flex items-center justify-center">
              {ticket?.customer?.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveImageUrl(ticket.customer.profileImage)}
                  alt={ticket.customer.name || 'Customer Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(ticket?.customer?.name)
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Chat with {ticket?.customer?.name || 'Customer'}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ticket #{ticket?.ticketNumber || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      <div ref={chatContainerRef} className="p-6 space-y-4 min-h-[400px] max-h-[500px] overflow-y-auto bg-white dark:bg-gray-800">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400 mx-auto mb-2"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading chat...</p>
            </div>
          </div>
        ) : chatMessages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>No messages yet. Start the conversation!</p>
            {connectionError && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ {connectionError}
                </p>
              </div>
            )}
          </div>
        ) : (
          chatMessages.map((msg) => {
            // Get current user info to determine if message is from current user
            const currentUserEmail = localStorage.getItem('user_email') || sessionStorage.getItem('user_email');
            // Fallback: try to get email from token
            let tokenEmail = null;
            try {
              const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
              if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                tokenEmail = payload.email;
              }
            } catch {
              console.warn('Could not decode token for email');
            }

            const userEmail = currentUserEmail || tokenEmail;
            const isCurrentUser = msg.sender.userEmail === userEmail;
            // Check if this is a system message
            const isSystemMessage = msg.messageType === 'infoSystem';

            if (isSystemMessage) {
              return (
                <div key={msg._id || msg.id} className="flex justify-center my-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-2 max-w-md">
                    <p className="text-sm text-blue-800 dark:text-blue-200 text-center italic">
                      {msg.content}
                      <span className="text-xs text-blue-600 dark:text-blue-400 mt-1 block text-right">
                        {formatTime(msg.createdAt)}
                      </span>
                    </p>

                  </div>
                </div>
              );
            }

            return (
              <div key={msg._id || msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xl ${isCurrentUser ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'} rounded-2xl px-4 py-3`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium opacity-75">
                      {msg.sender.userName}
                    </span>
                  </div>
                  <p className="text-sm break-words">{msg.content}</p>
                  <span className="text-xs opacity-75 mt-1 block">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {ticket?.status === 'closed' ? (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              This ticket is closed. Messages cannot be sent.
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={handleTyping}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              disabled={!chat}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || !chat}
              className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}