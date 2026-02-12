const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Agent {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  status: 'online' | 'offline';
  isActive?: boolean;
  categoryIds?: string[];
  createdAt: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalAgents: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

export interface AgentsResponse {
  success: boolean;
  pagination: PaginationInfo;
  data: Agent[];
}

export interface ExportResponse {
  success: boolean;
  message: string;
  count: number;
  data: Record<string, unknown>[];
}

export interface CreateAgentData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status?: 'online' | 'offline';
}

class AgentService {
  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    }
    return null;
  }

  private getHeaders(): HeadersInit {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  async fetchAgents(page: number = 1, limit: number = 10, search: string = ''): Promise<AgentsResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search })
      });

      const response = await fetch(`${API_URL}/agents?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
  }

  async getAgent(id: string): Promise<Agent> {
    try {
      const response = await fetch(`${API_URL}/agents/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch agent');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching agent:', error);
      throw error;
    }
  }

  async createAgent(agentData: CreateAgentData): Promise<Agent> {
    try {
      const response = await fetch(`${API_URL}/agents`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(agentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create agent');
      }

      const data = await response.json();
      return data.data;
    } catch (error: unknown) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  async updateAgent(id: string, agentData: Partial<CreateAgentData>): Promise<Agent> {
    try {
      const response = await fetch(`${API_URL}/agents/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(agentData),
      });

      if (!response.ok) {
        throw new Error('Failed to update agent');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error updating agent:', error);
      throw error;
    }
  }

  async deleteAgent(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/agents/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw error;
    }
  }

  async getCategoryList(): Promise<{_id: string, name: string}[]> {
    try {
      const response = await fetch(`${API_URL}/agents/categorylist`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch category list');
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching category list:', error);
      throw error;
    }
  }

  async toggleAgentStatus(id: string): Promise<Agent> {
    try {
      const response = await fetch(`${API_URL}/agents/${id}/toggle-status`, {
        method: 'PUT',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to toggle agent status');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error toggling agent status:', error);
      throw error;
    }
  }

  async exportAgents(search: string = ''): Promise<ExportResponse> {
    try {
      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`${API_URL}/agents/export?${params}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to export agents');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error exporting agents:', error);
      throw error;
    }
  }
}

const agentService = new AgentService();
export default agentService;

