const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// Helper function to get auth token
const getAuthToken = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
};

// Helper function to create headers
const getHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getAuthToken()}`,
});

// Types
export type Notification = {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'customer' | 'ticket' | 'agent' | 'system';
  isRead: boolean;
  userId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type NotificationListResponse = {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type NotificationStats = {
  total: number;
  unread: number;
  today: number;
};

// API Service Class
class NotificationService {
  // Fetch notifications for a user
  async fetchNotifications(page: number = 1, limit: number = 10): Promise<NotificationListResponse> {
    if (!API_BASE) {
      throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
    }

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    console.log('Fetching notifications with token');
    console.log('API URL:', `${API_BASE}/notifications?${params.toString()}`);

    const res = await fetch(`${API_BASE}/notifications?${params.toString()}`, {
      headers: getHeaders(),
    });

    const data = await res.json();
    console.log('Notification API response:', data);

    if (!res.ok) {
      console.error('Notification API error:', data);
      throw new Error(data?.message || 'Failed to load notifications');
    }

    return data;
  }

  // Get notification stats
  async getNotificationStats(): Promise<NotificationStats> {
    if (!API_BASE) {
      throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
    }
    const res = await fetch(`${API_BASE}/notifications/stats`, {
      headers: getHeaders(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Notification stats API error:', data);
      throw new Error(data?.message || 'Failed to load notification stats');
    }

    return data;
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<{success: boolean, message: string}> {
    if (!API_BASE) {
      throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
    }

    const res = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: getHeaders(),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || 'Failed to mark notification as read');
    }

    return data;
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<{success: boolean, message: string}> {
    if (!API_BASE) {
      throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
    }

    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: getHeaders(),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || 'Failed to mark all notifications as read');
    }

    return data;
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<{success: boolean, message: string}> {
    if (!API_BASE) {
      throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
    }

    const res = await fetch(`${API_BASE}/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || 'Failed to delete notification');
    }

    return data;
  }

  // Create notification (for testing purposes)
  async createNotification(notificationData: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    category: 'customer' | 'ticket' | 'agent' | 'system';
    userId: string;
    metadata?: Record<string, unknown>;
  }): Promise<{success: boolean, notification: Notification}> {
    if (!API_BASE) {
      throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
    }

    const res = await fetch(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(notificationData),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || 'Failed to create notification');
    }

    return data;
  }

  // Helper function to format time ago
  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  // Helper function to get notification icon based on type
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
