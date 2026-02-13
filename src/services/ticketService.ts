const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Ticket {
  _id: string;
  ticketNumber: string;
  description: string;
  status: 'pending' | 'resolved' | 'in_progress' | 'closed';
  customer: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    profileImage?: string;
    company_name?: string;
  };
  assignedAgent?: {
    _id: string;
    name: string;
    email: string;
  };
  categoryId?: {
    _id: string;
    name: string;
  };
  equipmentId?: {
    _id: string;
    name: string;
    serialNumber: string;
  };
  attachments: string[];
  serialNumber?: string;
  control?: string;
  equipmentModel?: string;
  modelNo?: string;
  customerslist?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    categoryIds?: string[];
  }[];
  notes?: string | string[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
}

class TicketService {
  private getAuthToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
  }

  private getHeaders(): HeadersInit {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  async fetchTickets(): Promise<Ticket[]> {
    try {
      // Get user role from token
      const token = this.getAuthToken();
      let apiEndpoint = `${API_URL}/tickets`; // Default for managers

      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.role === 'agent') {
            apiEndpoint = `${API_URL}/agent/tickets`;
          }
        } catch {
          // If token parsing fails, use default endpoint
        }
      }

      const response = await fetch(apiEndpoint, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }

      const data = await response.json();
      return data.tickets || [];
    } catch (error) {
      console.error('Error fetching tickets:', error);
      throw error;
    }
  }

  async fetchCategories(): Promise<Category[]> {
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

  async getTicketId(id: string): Promise<Ticket> {
    try {
      // Get user role from token
      const token = this.getAuthToken();
      let apiEndpoint = `${API_URL}/tickets/${id}`; // Default for managers

      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.role === 'agent') {
            apiEndpoint = `${API_URL}/agent/tickets/${id}`;
          }
        } catch {
          // If token parsing fails, use default endpoint
        }
      }

      const response = await fetch(apiEndpoint, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch ticket');
      }

      const data = await response.json();
      return data.ticket;
    } catch (error) {
      console.error('Error fetching ticket:', error);
      throw error;
    }
  }



  async assignTicket(id: string, agentId: string): Promise<Ticket> {
    try {
      const response = await fetch(`${API_URL}/tickets/${id}/assign`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ agentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign ticket');
      }

      const data = await response.json();
      return data.ticket;
    } catch (error) {
      console.error('Error assigning ticket:', error);
      throw error;
    }
  }

  async updateTicket(id: string, updates: Partial<{ description: string; status: string; assignedAgent: string | null }>): Promise<Ticket> {
    try {
      const response = await fetch(`${API_URL}/tickets/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update ticket');
      }

      const data = await response.json();
      return data.ticket;
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  }

  async updateTicketNotes(id: string, notes: string): Promise<Ticket> {
    try {
      const response = await fetch(`${API_URL}/tickets/${id}/notes`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update ticket notes');
      }

      const data = await response.json();
      return data.ticket;
    } catch (error) {
      console.error('Error updating ticket notes:', error);
      throw error;
    }
  }

  async createTicket(ticketData: {
    description: string;
    categoryId: string;
    customerId: string;
    equipmentId?: string;
    serialNumber?: string;
    attachments?: File[];
    support_type?: string;
    control?: string;
    equipmentModel?: string;
    modelNo?: string;
  }): Promise<Ticket> {
    try {
      const formData = new FormData();
      formData.append('description', ticketData.description);
      formData.append('categoryId', ticketData.categoryId);
      formData.append('customerId', ticketData.customerId);
      if (ticketData.equipmentId) {
        formData.append('equipmentId', ticketData.equipmentId);
      }
      if (ticketData.serialNumber) {
        formData.append('serialNumber', ticketData.serialNumber);
      }
      if (ticketData.support_type) {
        formData.append('support_type', ticketData.support_type);
      }
      if (ticketData.control) {
        formData.append('control', ticketData.control);
      }
      if (ticketData.equipmentModel) {
        formData.append('equipmentModel', ticketData.equipmentModel);
      }
      if (ticketData.modelNo) {
        formData.append('modelNo', ticketData.modelNo);
      }
      if (ticketData.attachments && ticketData.attachments.length > 0) {
        ticketData.attachments.forEach((file) => {
          formData.append('attachments', file);
        });
      }

      const token = this.getAuthToken();
      const headers: HeadersInit = {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };

      // Use website endpoint for managers/admins
      const response = await fetch(`${API_URL}/tickets/create`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create ticket');
      }

      const data = await response.json();
      return data.ticket;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

}

const ticketService = new TicketService();
export default ticketService;
