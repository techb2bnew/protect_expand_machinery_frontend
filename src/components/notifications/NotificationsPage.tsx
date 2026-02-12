'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Trash2, CheckCheck, Filter } from 'lucide-react';
import { notificationService, Notification } from '../../services/notificationService';
import { useNotifications } from '../../contexts/NotificationContext';

const NotificationsPage: React.FC = () => {
  const router = useRouter();
  const { refreshStats } = useNotifications();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const limit = 20;

  // Fetch notifications
  const fetchNotifications = useCallback(async (pageNum: number, filterType: string) => {
    try {
      setLoading(true);
      const response = await notificationService.fetchNotifications(pageNum, limit);
      
      let filteredNotifications = response.notifications;
      
      // Apply filter
      if (filterType === 'unread') {
        filteredNotifications = response.notifications.filter(n => !n.isRead);
      } else if (filterType === 'read') {
        filteredNotifications = response.notifications.filter(n => n.isRead);
      }
      
      setNotifications(filteredNotifications);
      setTotal(response.total);
      setUnreadCount(response.unreadCount);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Initial load and when page/filter changes
  useEffect(() => {
    fetchNotifications(page, filter);
  }, [page, filter, fetchNotifications]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      refreshStats();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
      refreshStats();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Delete notification
  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const notificationToDelete = notifications.find(notif => notif._id === notificationId);
      const wasUnread = notificationToDelete && !notificationToDelete.isRead;
      
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      refreshStats();
      fetchNotifications(page, filter);
      // If current page becomes empty and not on first page, go to previous page
      if (notifications.length === 1 && page > 1) {
        setPage(page - 1);
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Get filtered count
  const getFilteredCount = () => {
    if (filter === 'unread') return unreadCount;
    if (filter === 'read') return total - unreadCount;
    return total;
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="mb-6 flex-shrink-0">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                Notifications
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {getFilteredCount()} notification{getFilteredCount() !== 1 ? 's' : ''}
                {filter === 'all' && ` • ${unreadCount} unread`}
              </p>
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-2 flex-wrap flex-shrink-0">
          <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <button
            onClick={() => {
              setFilter('all');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            All ({total})
          </button>
          <button
            onClick={() => {
              setFilter('unread');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => {
              setFilter('read');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filter === 'read'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Read ({total - unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <p className="text-lg">No notifications found</p>
              <p className="text-sm mt-2">
                {filter === 'all'
                  ? "You don't have any notifications yet"
                  : filter === 'unread'
                  ? "You don't have any unread notifications"
                  : "You don't have any read notifications"}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Notification Indicator */}
                      <div
                        className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                          !notification.isRead
                            ? 'bg-blue-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                                {notification.title}
                              </h3>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  notification.type === 'success'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    : notification.type === 'warning'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                    : notification.type === 'error'
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                }`}
                              >
                                {notification.type}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-4 mt-3">
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                {notificationService.formatTimeAgo(notification.createdAt)}
                              </p>
                              {notification.category && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  • {notification.category}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!notification.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notification._id)}
                                className="cursor-pointer p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                title="Mark as read"
                              >
                                <Check className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteNotification(notification._id)}
                              className="cursor-pointer p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Delete notification"
                            >
                              <Trash2 className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 md:px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;

