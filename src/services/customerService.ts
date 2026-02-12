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
export type Customer = {
    id: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
    isActive: boolean;
};

export type ApiCustomer = {
    _id: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
    status: string;
    isActive?: boolean;
};

export type CustomerFormData = {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password: string;
};

export type CustomerListResponse = {
    customers: ApiCustomer[];
    totalPages: number;
    currentPage: number;
    totalCustomers: number;
};

export type StatsResponse = Record<string, { value: number; change: number }>;

// API Service Class
class CustomerService {
    // Fetch customers with pagination and search
    async fetchCustomers(page: number = 1, limit: number = 5, search: string = ''): Promise<CustomerListResponse> {
        if (!API_BASE) {
            throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
        }

        const params = new URLSearchParams({
            page: String(page),
            limit: String(limit),
            search: search,
        });

        const res = await fetch(`${API_BASE}/customers?${params.toString()}`, {
            headers: getHeaders(),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data?.message || 'Failed to load customers');
        }

        return data;
    }

    // Fetch customer statistics
    async fetchStats(): Promise<StatsResponse> {
        if (!API_BASE) {
            throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
        }

        const res = await fetch(`${API_BASE}/customers/stats/summary`, {
            headers: getHeaders(),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data?.message || 'Failed to load stats');
        }

        return data;
    }

    // Add new customer
    async addCustomer(formData: CustomerFormData): Promise<{success: boolean, customer: Customer}> {
        if (!API_BASE) {
            throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
        }

        const res = await fetch(`${API_BASE}/customers`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                name: `${formData.firstName} ${formData.lastName}`.trim(),
                email: formData.email,
                phone: formData.phoneNumber,
                password: formData.password,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data?.message || 'Failed to add customer');
        }

        return data;
    }

    // Update existing customer
    async updateCustomer(customerId: string, formData: CustomerFormData): Promise<{success: boolean, customer: Customer}> {
        if (!API_BASE) {
            throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
        }

        const res = await fetch(`${API_BASE}/customers/${customerId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({
                name: `${formData.firstName} ${formData.lastName}`.trim(),
                email: formData.email,
                phone: formData.phoneNumber,
                password: formData.password,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data?.message || 'Failed to update customer');
        }

        return data;
    }

    // Delete customer
    async deleteCustomer(customerId: string): Promise<{success: boolean, message: string}> {
        if (!API_BASE) {
            throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
        }

        const res = await fetch(`${API_BASE}/customers/${customerId}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data?.message || 'Failed to delete customer');
        }

        return data;
    }

    // Activate customer
    async activateCustomer(customerId: string): Promise<{success: boolean, customer: Customer}> {
        if (!API_BASE) {
            throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
        }

        const res = await fetch(`${API_BASE}/customers/${customerId}/activate`, {
            method: 'PUT',
            headers: getHeaders(),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data?.message || 'Failed to activate customer');
        }

        return data;
    }

    // Deactivate customer
    async deactivateCustomer(customerId: string): Promise<{success: boolean, customer: Customer}> {
        if (!API_BASE) {
            throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
        }

        const res = await fetch(`${API_BASE}/customers/${customerId}/deactivate`, {
            method: 'PUT',
            headers: getHeaders(),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data?.message || 'Failed to deactivate customer');
        }

        return data;
    }


    // Get single customer details
    async getCustomer(customerId: string): Promise<Customer> {
        if (!API_BASE) {
            throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
        }

        const res = await fetch(`${API_BASE}/customers/${customerId}`, {
            headers: getHeaders(),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data?.message || 'Failed to load customer');
        }

        return data;
    }

    // Export customers to CSV
    async exportCustomersCSV(search: string = ''): Promise<Blob> {
        if (!API_BASE) {
            throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL in your env.');
        }

        const params = new URLSearchParams({ search });
        const res = await fetch(`${API_BASE}/customers/export/csv?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
            },
        });

        if (!res.ok) {
            throw new Error('Failed to export customers');
        }

        return res.blob();
    }

    // Helper to download CSV
    downloadCSV(blob: Blob, filename: string = 'customers.csv') {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    // Map API response to Customer type
    mapToCustomer(apiCustomer: ApiCustomer): Customer {
        return {
            id: apiCustomer._id,
            name: apiCustomer.name,
            email: apiCustomer.email,
            phone: apiCustomer.phone,
            createdAt: new Date(apiCustomer.createdAt).toLocaleDateString('en-GB'),
            isActive: apiCustomer.isActive ?? true,
        };
    }
}

// Export singleton instance
export const customerService = new CustomerService();
export default customerService;