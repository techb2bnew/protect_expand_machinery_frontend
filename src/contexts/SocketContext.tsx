'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectSocket: () => void;
  disconnectSocket: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token, user } = useAuth();

  const connectSocket = useCallback(() => {
    // Don't create duplicate socket if already exists
    if (!token || !user || socket) return;

    // Check if ChatService already has a socket connection we can reuse
    // For now, create a lightweight connection only for agent status tracking
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 3, // Reduced attempts
      reconnectionDelay: 1000,
      reconnectionDelayMax: 3000, // Reduced max delay
      // Add connection pooling to prevent too many connections
      forceNew: false,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      
      // Emit user online status for both agents/admins and customers
      newSocket.emit('user_online', {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        role: user.role,
        timestamp: new Date()
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('user_status_update', (data) => {
      console.log('📊 User status update received:', data);
    });

    setSocket(newSocket);
  }, [token, user, socket]);

  const disconnectSocket = useCallback(() => {
    if (socket) {
      // Emit user offline status before disconnecting (for both agents/admins and customers)
      if (user) {
        socket.emit('user_offline', {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          role: user.role,
          timestamp: new Date()
        });
      }
      
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket, user]);

  // Connect socket for all authenticated users (agents, admins, and customers)
  // Don't auto-connect - let components request connection when needed
  useEffect(() => {
    // Auto-connect for all authenticated users
    if (token && user && !socket) {
      // Small delay to avoid immediate connection on page load
      const timer = setTimeout(() => {
        connectSocket();
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!token || !user) {
      disconnectSocket();
    }
  }, [token, user, socket, connectSocket, disconnectSocket]);

  // Handle page visibility changes to maintain connection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && token && user && socket) {
        // Page became visible, ensure socket is connected and emit online status
        if (!socket.connected) {
          console.log('🔄 Page visible, reconnecting socket...');
          socket.connect();
        } else {
          // Re-emit online status when page becomes visible (for all users)
          console.log('📊 Page visible, re-emitting user_online status');
          socket.emit('user_online', {
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            role: user.role,
            timestamp: new Date()
          });
        }
      }
    };

    const handleBeforeUnload = () => {
      // Don't emit offline on page unload as it might be temporary
      console.log('🔄 Page unloading, not emitting offline status');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [socket, token, user]);

  // Cleanup on unmount - properly disconnect and clear socket
  useEffect(() => {
    return () => {
      if (socket) {
        // Remove all listeners before disconnecting
        socket.removeAllListeners();
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [socket]);

  const value: SocketContextType = {
    socket,
    isConnected,
    connectSocket,
    disconnectSocket,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
