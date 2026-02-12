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
export interface TermsAndConditions {
  _id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  updatedBy?: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface TermsFormData {
  content: string;
}

// API Service Class
class TermsService {
  // Get latest active terms (for app - public)
  async getLatestTerms(): Promise<{ success: boolean; data: TermsAndConditions }> {
    if (!API_BASE) {
      throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
    }

    const res = await fetch(`${API_BASE}/terms/latest`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || 'Failed to fetch terms and conditions');
    }

    return data;
  }

  // Get all terms (for admin)
  async getAllTerms(type: 'terms' | 'privacy_policy' = 'terms'): Promise<{ success: boolean; data: TermsAndConditions[] }> {
    if (!API_BASE) {
      throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
    }

    const url = type === 'privacy_policy' 
      ? `${API_BASE}/terms/?type=${type}`
      : `${API_BASE}/terms?type=${type}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || `Failed to fetch ${type === 'privacy_policy' ? 'privacy policy' : 'terms and conditions'}`);
    }

    return data;
  }

  // Create new terms
  async createTerms(formData: TermsFormData, type: 'terms' | 'privacy_policy' = 'terms'): Promise<{ success: boolean; data: TermsAndConditions; message: string }> {
    if (!API_BASE) {
      throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
    }

    const url = type === 'privacy_policy' 
      ? `${API_BASE}/terms/privacy-policy`
      : `${API_BASE}/terms`;

    const res = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ...formData, type }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || `Failed to create ${type === 'privacy_policy' ? 'privacy policy' : 'terms and conditions'}`);
    }

    return data;
  }

  // Update terms
  async updateTerms(formData: TermsFormData, type: 'terms' | 'privacy_policy' = 'terms'): Promise<{ success: boolean; data: TermsAndConditions; message: string }> {
    if (!API_BASE) {
      throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
    }

    const url = type === 'privacy_policy' 
      ? `${API_BASE}/terms/privacy-policy`
      : `${API_BASE}/terms`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ ...formData, type }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || `Failed to update ${type === 'privacy_policy' ? 'privacy policy' : 'terms and conditions'}`);
    }

    return data;
  }
}

// Export singleton instance
export const termsService = new TermsService();
export default termsService;

