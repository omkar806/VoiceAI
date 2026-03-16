import api from './api';
import { safeStorage } from '@/lib/safeStorage';

// Type definitions
export interface LoginCredentials {
  username: string; // Backend uses 'username' for email in the OAuth2 flow
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
}

export interface SignupData {
  email: string;
  password: string;
  full_name: string;
}

export interface UpdateProfileData {
  full_name: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

// Authentication service functions
const authService = {
  /**
   * Login user and get access token
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
    // Convert credentials to form data format as required by OAuth2
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await api.post<LoginResponse>('/auth/login/access-token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    // Store token in localStorage
    if (typeof window !== 'undefined' && response.data.access_token) {
      safeStorage.setItem('token', response.data.access_token);
      safeStorage.setItem('isAuthenticated', 'true');
    }
    
    return response.data;
    } catch (error: any) {
      // Handle 401 error for incorrect credentials without showing error page
      if (error.response && error.response.status === 401) {
        throw { response: { data: { detail: 'Invalid email or password' } } };
      }
      // Rethrow other errors
      throw error;
    }
  },

  /**
   * Register a new user
   */
  signup: async (userData: SignupData): Promise<UserProfile> => {
    const response = await api.post<UserProfile>('/auth/signup', {
      email: userData.email,
      password: userData.password,
      full_name: userData.full_name,
    });
    
    return response.data;
  },

  /**
   * Get current user profile
   */
  getUserProfile: async (): Promise<UserProfile> => {
    const response = await api.get<UserProfile>('/auth/me');
    return response.data;
  },
  
  /**
   * Update user profile information
   */
  updateProfile: async (data: UpdateProfileData): Promise<UserProfile> => {
    const response = await api.put<UserProfile>('/users/me', data);
    return response.data;
  },
  
  /**
   * Change user password
   */
  changePassword: async (data: ChangePasswordData): Promise<void> => {
    await api.put('/users/me/password', data);
  },
  
  /**
   * Logout user
   */
  logout: (): void => {
    if (typeof window !== 'undefined') {
      safeStorage.removeItem('token');
      safeStorage.removeItem('isAuthenticated');
      safeStorage.removeItem('userProfile');
    }
  },
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    if (typeof window !== 'undefined') {
      return safeStorage.getItem('isAuthenticated') === 'true';
    }
    return false;
  },
};

export default authService; 