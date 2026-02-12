'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { notificationService, Notification } from '../services/notificationService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  refreshStats: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Refreshing notifications with token');
      const response = await notificationService.fetchNotifications(1, 10);
      console.log('Notifications refreshed:', response);
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh stats only
  const refreshStats = useCallback(async () => {
    try {
      const stats = await notificationService.getNotificationStats();
      setUnreadCount(stats.unread);
    } catch (error) {
      console.error('Failed to refresh notification stats:', error);
      setUnreadCount(0);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      // Find the notification before deleting to check if it was unread
      const notificationToDelete = notifications.find(notif => notif._id === notificationId);
      const wasUnread = notificationToDelete && !notificationToDelete.isRead;
      
      await notificationService.deleteNotification(notificationId);
      
      // Update state - remove notification from list (single update)
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      
      // Update unread count if the deleted notification was unread
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, [notifications]);

  // Set up real-time updates
  useEffect(() => {
    // Initial fetch
    refreshStats();

    // Set up intervals for real-time updates
    const statsInterval = setInterval(() => {
      refreshStats();
    }, 15000); // Fetch stats every 15 seconds (further reduced frequency)
    
    return () => {
      clearInterval(statsInterval);
    };
  }, [refreshStats]); // Include refreshStats in dependencies

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    refreshStats,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
