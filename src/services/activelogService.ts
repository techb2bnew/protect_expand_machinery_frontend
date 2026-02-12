const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const getAuthToken = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
};

const getHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getAuthToken()}`,
});

export type ApiActivityLog = {
  _id: string;
  user: string;
  message: string;
  createdAt: string;
  status?: string;
};

export type ActivityLogListResponse = {
  data: ApiActivityLog[];
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
  filters?: {
    startDate?: string;
    endDate?: string;
  };
};

// ✅ UPDATED SERVICE
class ActivityLogService {
  async fetchActivityLogs(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    startDate?: string,
    endDate?: string
  ): Promise<ActivityLogListResponse> {
    if (!API_BASE) {
      throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
    }

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (search) params.append('search', search);

    const res = await fetch(`${API_BASE}/activity-logs/list?${params.toString()}`, {
      headers: getHeaders(),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || 'Failed to load activity logs');
    }

    return data;
  }
}

export const activityLogService = new ActivityLogService();
export default activityLogService;
