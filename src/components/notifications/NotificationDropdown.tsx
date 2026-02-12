import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, Check, Trash2, Eye } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { useNotifications } from '../../contexts/NotificationContext';

const NotificationDropdown: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use notification context
  const {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  // Wrapper functions for context methods
  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDeleteNotification = async (notificationId: string) => {
    await deleteNotification(notificationId);
    // No need to refresh - context already updates the state
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      refreshNotifications();
    }
  }, [isOpen, refreshNotifications]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Notifications</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Notification Icon */}
                    <div className={`w-2 h-2 rounded-full mt-2 ${!notification.isRead ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-800 dark:text-white">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {notificationService.formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 ml-2">
                          {!notification.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notification._id)}
                              className="cursor-pointer p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteNotification(notification._id)}
                            className="cursor-pointer p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 pt-2 pb-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {notifications.length > 0 && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/dashboard/notifications');
                }}
                className="cursor-pointer w-full flex items-center justify-center gap-2 py-2 px-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-blue-200 dark:border-blue-800 font-medium"
              >
                <Eye className="w-4 h-4" />
                View All Notifications
              </button>
            )}
            {notifications.length > 0 && unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="cursor-pointer w-full flex items-center justify-center gap-2 py-2 px-4 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
              >
                <Check className="w-4 h-4" />
                Mark all as read
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
