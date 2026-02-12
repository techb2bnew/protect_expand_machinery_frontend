const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ;

export interface UserProfile {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    status?: string;
    profileImage?: string;
    categoryIds?: string[];
    createdAt?: string;
    updatedAt?: string;
}

export interface UpdateProfileData {
    name?: string;
    email?: string;
    phone?: string;
    currentPassword?: string; // New field for password change
    newPassword?: string;    // New field for password change
  }
class UserService {
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

    async getCurrentUser(): Promise<UserProfile> {
        try {
            const response = await fetch(`${API_BASE_URL}/profile/me`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user profile');
            }

            const data = await response.json();
            return data.user || data;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    }

    async updateProfile(profileData: UpdateProfileData): Promise<UserProfile> {
        try {
            const response = await fetch(`${API_BASE_URL}/profile/update`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(profileData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update profile');
            }

            const data = await response.json();
            return data.user || data;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }

    async uploadProfileImage(file: File): Promise<UserProfile> {
        const token = this.getAuthToken();
        const formData = new FormData();
        formData.append('profileImage', file);

        const headers: HeadersInit = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE_URL}/profile/profile-image`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to upload profile image');
        }

        const data = await response.json();
        return data.user || data;
    }

}

const userService = new UserService();
export default userService;
