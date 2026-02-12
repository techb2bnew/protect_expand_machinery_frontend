import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import chatService, { ChatMessage, Chat } from '@/services/chatService';
import type { Ticket } from '@/services/ticketService';

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId?: string | null;
  chatTicketData?: Ticket | null;
}

export default function Chatbot({ isOpen, onClose, ticketId, chatTicketData }: ChatbotProps) {
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesReceivedRef = useRef(false); // Track if messages received via socket
  const initialLoadDoneRef = useRef(false); // Track if initial load is complete
  const isInitializingRef = useRef(false); // Track if initialization is in progress
  const previousTicketIdRef = useRef<string | undefined>(undefined); // Track previous ticket ID

  const initializeChat = useCallback(async () => {
    if (!ticketId) return;
    
    // Prevent multiple simultaneous initializations
    if (isInitializingRef.current) {
      console.log('⚠️ [SKIP] Chat initialization already in progress, skipping duplicate call (Chatbot)');
      return;
    }
    
    isInitializingRef.current = true;

    try {
      // Always show loading on initialization (we cleared messages before calling this)
      setLoading(true);

      // PRIORITY 1: Setup bulk messages listener FIRST (before connecting)
      // Always process bulk messages during initialization (messages were just cleared)
      messagesReceivedRef.current = false; // Reset for this initialization
      initialLoadDoneRef.current = false; // Reset to allow processing
      
      // Setup listener for bulk messages BEFORE connecting
      chatService.onBulkMessages((messages) => {
        // Only process if initialization is not done yet
        if (initialLoadDoneRef.current) {
          console.log('⚠️ [SKIP] Bulk messages received but initial load already done - ignoring to prevent overwriting existing messages (Chatbot)');
          return;
        }
        
        console.log('✅ [SUCCESS] Received initial messages via socket (Chatbot):', messages?.length || 0, 'messages');
        // Always mark as received and hide loading, even if empty
        messagesReceivedRef.current = true;
        initialLoadDoneRef.current = true;
        // Socket sends messages, use them directly
        setChatMessages(messages || []);
        setLoading(false); // Hide loading immediately when messages arrive (even if empty)
        console.log(`✅ [SUCCESS] Messages loaded via socket (Chatbot) - showing ${messages?.length || 0} messages`);
      });

      // PRIORITY 2: Connect socket and get messages via socket (FASTEST)
      const socketConnectPromise = chatService.connect().then(() => {
        // Join ticket room and request initial messages via socket
        chatService.joinTicket(ticketId, true);
        return true;
      }).catch((error) => {
        console.warn('Socket connection failed, using fallback mode:', error);
        return false;
      });

      // PRIORITY 3: Get chat data (needed for sending messages)
      const chatData = await chatService.getOrCreateChat(ticketId);
      setChat(chatData);

      // PRIORITY 4: Wait for socket messages (max 1000ms) OR use API fallback
      const socketConnected = await Promise.race([
        socketConnectPromise,
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 1000))
      ]);

      // Wait a bit more for messages to arrive via socket (backend sends them after join)
      if (!messagesReceivedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 800)); // Increased wait time for socket messages
      }

      // If socket didn't send messages, use API as fallback
      if (!messagesReceivedRef.current && !initialLoadDoneRef.current) {
        console.warn('⚠️ [FALLBACK] Socket did not send messages (Chatbot), using API fallback');
        // Load latest messages (200 max to prevent memory issues)
        const apiMessages = await chatService.getChatMessages(chatData._id, 1, 200);
        initialLoadDoneRef.current = true;
        messagesReceivedRef.current = true;
        setChatMessages(apiMessages);
        setLoading(false); // Hide loading after API messages loaded
        console.log('✅ [API] Messages loaded via API fallback (Chatbot) - ALL messages:', apiMessages.length, 'messages');
      } else if (messagesReceivedRef.current) {
        console.log('✅ [SUCCESS] Messages received via socket successfully! (Chatbot)');
        // Ensure loading is hidden (should already be hidden in callback)
        setLoading(false);
      } else {
        // No messages received and initial load not done - ensure loading is off
        setLoading(false);
      }

    } catch (error) {
      console.error('Failed to initialize chat:', error);
      setLoading(false);
    } finally {
      isInitializingRef.current = false;
    }
  }, [ticketId]); // Remove chatMessages.length to prevent infinite loops

  // Initialize chat when ticketId changes
  useEffect(() => {
    if (isOpen && ticketId) {
      // Only clear messages if ticket ID actually changed (not on same ticket refresh)
      const ticketChanged = previousTicketIdRef.current !== ticketId;
      
      if (ticketChanged) {
        // Clear previous messages when ticketId changes (to prevent showing old ticket's messages)
        setChatMessages([]);
        setChat(null);
        // Reset flags when ticketId changes
        initialLoadDoneRef.current = false;
        messagesReceivedRef.current = false;
        isInitializingRef.current = false;
        
        // Leave previous ticket room if there was one
        if (previousTicketIdRef.current) {
          chatService.leaveTicket(previousTicketIdRef.current);
        }
        
        previousTicketIdRef.current = ticketId;
      }
      
      // Initialize chat (only if not already initializing and ticketId exists)
      if (!isInitializingRef.current) {
        initializeChat();
      }
    } else if (!isOpen) {
      // Clear messages when chatbot is closed
      setChatMessages([]);
      setChat(null);
      isInitializingRef.current = false;
      previousTicketIdRef.current = undefined;
    }
    return () => {
      if (ticketId) {
        chatService.leaveTicket(ticketId);
      }
      isInitializingRef.current = false;
      // Clean up processed messages ref when ticket changes or closes
      processedMessagesRef.current.clear();
      processingMessagesRef.current.clear();
    };
  }, [isOpen, ticketId]); // Only depend on isOpen and ticketId to prevent infinite loops

  // Track recently processed messages to prevent duplicates
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const processingMessagesRef = useRef<Set<string>>(new Set()); // Track messages currently being processed
  const currentTicketIdRef = useRef<string | undefined>(ticketId || undefined); // Track current ticket ID for message filtering

  // Update current ticket ID ref when ticket changes
  useEffect(() => {
    currentTicketIdRef.current = ticketId || undefined;
  }, [ticketId]);

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

  // Set up socket listeners
  useEffect(() => {
    const handleNewMessage = (newMessage: ChatMessage) => {
      // CRITICAL: Filter messages by ticketId - only process messages for current ticket
      // This prevents messages from other tickets (when agent has multiple tickets) from appearing
      const currentTicketId = currentTicketIdRef.current;
      if (currentTicketId && newMessage.ticketId && newMessage.ticketId !== currentTicketId) {
        console.log('🚫 [FILTER] Ignoring message from different ticket (Chatbot):', {
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
        console.log('⚠️ Message is already being processed, ignoring duplicate call (Chatbot):', newMessage.content);
        return; // Exit early if already processing
      }
      
      // Check if we've already processed this exact message
      if (processedMessagesRef.current.has(messageKey)) {
        console.log('⚠️ Duplicate message detected (already processed), ignoring (Chatbot):', newMessage.content);
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
        console.warn('Could not decode token');
      }
      const userEmail = currentUserEmail || tokenEmail;
      const isFromCurrentUser = newMessage.sender.userEmail === userEmail;

      // INSTANT update via socket - no delay
      setChatMessages(prev => {
        // FIRST: Check for duplicate by _id or id (fastest check) - check BOTH temp and real IDs
        const existingById = prev.findIndex(msg => {
          // Check if IDs match (either _id or id)
          const msgIdMatch = (msg._id && newMessage._id && msg._id === newMessage._id) ||
                             (msg.id && newMessage.id && msg.id === newMessage.id);
          
          // Also check if temp ID matches (for optimistic messages)
          const tempIdMatch = msg._id?.startsWith('temp_') && 
                             newMessage._id?.startsWith('temp_') &&
                             msg._id === newMessage._id;
          
          return msgIdMatch || tempIdMatch;
        });
        
        if (existingById !== -1) {
          console.log('⚠️ Message already exists by ID, ignoring duplicate (Chatbot):', newMessage._id || newMessage.id);
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
            console.log('⚠️ Duplicate detected (Chatbot): exact same content, sender, and timestamp:', {
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
          console.log('⚠️ Duplicate message detected by content+sender+time, ignoring (Chatbot):', newMessage.content);
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
            console.log('🔄 Replacing temp message with real socket message (Chatbot)');
            
            const updated = [...prev];
            updated[tempMessageIndex] = newMessage;
            return updated;
          } else {
            // If no matching temp message found for sender's own message, ignore it
            // (optimistic message already shown, or API response will handle it)
            console.log('⚠️ Sender\'s own message received but no matching temp message found - ignoring to prevent duplicate (Chatbot)');
            processingMessagesRef.current.delete(messageKey); // Remove from processing
            return prev; // Return unchanged to prevent duplicate
          }
        }

        // Add new message instantly (via socket - real-time, only for other users' messages)
        console.log('✅ Adding new message to chat (Chatbot):', newMessage.content);
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

    if (isOpen) {
      // Register callbacks - these will setup listeners if socket is connected
      chatService.onNewMessage(handleNewMessage);
      chatService.onTyping(handleTyping);
      chatService.onError(handleError);
    }

    // IMPORTANT: Don't remove listeners on cleanup - we need them to persist across ticket changes
    // The ticket filtering in handleNewMessage ensures only current ticket messages are processed
    return () => {
      // Cleanup: Remove listeners when chatbot closes to prevent memory leaks
      if (!isOpen) {
        // Note: We don't remove listeners here as they're shared across components
        // The duplicate detection in handleNewMessage will prevent issues
      }
    };
  }, [isOpen]);

  // Always scroll to bottom when new messages arrive (real-time chat)
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Auto-scroll to bottom when messages change (real-time updates)
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);


  const handleSendMessage = async () => {
    if (!message.trim() || !chat || !ticketId) return;

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

    // Create optimistic message to show immediately (INSTANT)
    const optimisticMessage: ChatMessage = {
      _id: `temp-${Date.now()}`,
      chatId: chat._id,
      ticketId: ticketId,
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

    // Add optimistic message to UI immediately (INSTANT - no API wait)
    setChatMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom(); // Always scroll when user sends message

    // Stop typing indicator
    chatService.sendTyping(ticketId, false);
    setIsTyping(false);

    try {
      // Send via socket FIRST for real-time delivery (INSTANT)
      chatService.sendMessage({
        chatId: chat._id,
        ticketId: ticketId,
        content: messageContent,
        messageType: 'text'
      });

      // Send via API in background for persistence (don't wait)
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

    if (!ticketId) return;

    if (value.trim() && !isTyping) {
      setIsTyping(true);
      chatService.sendTyping(ticketId, true);
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
      chatService.sendTyping(ticketId, false);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        chatService.sendTyping(ticketId, false);
      }
    }, 1000);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div className=" absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute right-6 bottom-6 w-[380px] h-[550px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white text-purple-600 font-bold text-sm">
              {chatTicketData?.customer?.name?.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="text-sm font-semibold">Support Chat</p>
              <p className="text-xs text-white/80">Ticket {chatTicketData?.ticketNumber || 'N/A'}</p>
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer text-white/90 hover:text-white transition-colors text-xl leading-none">
            ✕
          </button>
        </div>

        {/* Messages Area */}
        <div ref={chatContainerRef} className="flex-1 p-4 space-y-3 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            chatMessages.map((msg) => {
              const currentUserEmail = localStorage.getItem('user_email') || sessionStorage.getItem('user_email');
              let tokenEmail = null;
              try {
                const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
                if (token) {
                  const payload = JSON.parse(atob(token.split('.')[1]));
                  tokenEmail = payload.email;
                }
              } catch {
                console.warn('Could not decode token');
              }

              const userEmail = currentUserEmail || tokenEmail;
              const isCurrentUser = msg.sender.userEmail === userEmail;

              // Check if this is a system message
              const isSystemMessage = msg.messageType === 'infoSystem';

              if (isSystemMessage) {
                return (
                  <div key={msg._id || msg.id} className="flex justify-center my-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl px-3 py-2 max-w-[85%]">
                      <p className="text-xs text-blue-800 dark:text-blue-200 text-center italic">
                        {msg.content}
                      </p>
                      <span className="text-xs text-blue-600 dark:text-blue-400 mt-1 block text-right">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg._id || msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${isCurrentUser ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'} rounded-2xl px-3 py-2 shadow-sm`}>
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
              <div className="bg-white dark:bg-gray-700 rounded-2xl px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {typingUsers.join(', ')} typing...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={handleTyping}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              disabled={!chat || loading}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gr  ay-600 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || !chat || loading}
              className="cursor-pointer px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}