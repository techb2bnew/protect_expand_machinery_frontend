const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Equipment {
  _id: string;
  id: string;
  name: string;
  serialNumber: string;
  modelNumber?: string;
  description?: string;
}

interface EquipmentResponse {
  id?: string;
  _id?: string;
  name: string;
  serialNumber?: string;
  modelNumber?: string;
  description?: string;
}

class EquipmentService {
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

  async fetchEquipment(): Promise<Equipment[]> {
    try {
      if (!API_URL) {
        throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
      }

      const response = await fetch(`${API_URL}/equipment`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch equipment');
      }

      const data = await response.json();

      // Handle response structure: { success: true, data: [...] }
      if (data.success && Array.isArray(data.data)) {
        return data.data.map((eq: EquipmentResponse) => ({
          _id: eq.id || eq._id || '',
          id: eq.id || eq._id || '',
          name: eq.name,
          serialNumber: eq.serialNumber || '',
          modelNumber: eq.modelNumber,
          description: eq.description
        }));
      }

      // Fallback: if data is already an array
      if (Array.isArray(data)) {
        return data.map((eq: EquipmentResponse) => ({
          _id: eq.id || eq._id || '',
          id: eq.id || eq._id || '',
          name: eq.name,
          serialNumber: eq.serialNumber || '',
          modelNumber: eq.modelNumber,
          description: eq.description
        }));
      }

      // Fallback: if data.data exists
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((eq: EquipmentResponse) => ({
          _id: eq.id || eq._id || '',
          id: eq.id || eq._id || '',
          name: eq.name,
          serialNumber: eq.serialNumber || '',
          modelNumber: eq.modelNumber,
          description: eq.description
        }));
      }

      console.warn('Unexpected equipment response structure:', data);
      return [];
    } catch (error) {
      console.error('Error fetching equipment:', error);
      throw error;
    }
  }
}

const equipmentService = new EquipmentService();
export default equipmentService;

