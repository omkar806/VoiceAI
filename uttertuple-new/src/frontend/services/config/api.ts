// api.tsconfig/api.ts:

import axios, { InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { safeStorage } from '@/lib/safeStorage';
// const API_BASE_URL = 'http://localhost:8021/api/v1';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_AUTH_URL || 'http://localhost:8022s/api/v1';

// Create axios instance with proxy configuration
const api = axios.create({
 baseURL: API_BASE_URL,
 headers: {
 'Content-Type': 'application/json',
 },
 withCredentials: false, // Enable cookies and credentials
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
 resolve: (value?: any) => void;
 reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
 failedQueue.forEach(({ resolve, reject }) => {
 if (error) {
 reject(error);
 } else {
 resolve(token);
 }
 });
 
 failedQueue = [];
};

// Add auth interceptor to include token in requests
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
 // Get token from localStorage (preferred) or fallback to cookies for backward compatibility
 const token = safeStorage.getItem('access_token') || Cookies.get('access_token');
 const organizationId = safeStorage.getItem('current_organization') || Cookies.get('current_organization');
 
 console.log(`API Request to ${config.url} with organization: ${organizationId}`);
 
 // Add token to headers
 if (token && config.headers) {
 config.headers.Authorization = `Bearer ${token}`;
 }
 
 // Add organization ID to headers if available - try multiple common formats
 if (organizationId && config.headers) {
 // Try multiple header formats that the backend might accept
 config.headers['X-Organization-ID'] = organizationId;
 config.headers['Organization-ID'] = organizationId;
 config.headers['X-Organization'] = organizationId;
 config.headers['Organization'] = organizationId;
 
 // If this is an internal API request that doesn't include organization_id
 // and isn't an auth route, add it as a query parameter
 if (config.url && 
 !config.url.includes('organization_id=') && 
 !config.url.includes('/auth/') &&
 !config.url.includes('/users/me/organization')) {
 
 const separator = config.url.includes('?') ? '&' : '?';
 config.url = `${config.url}${separator}organization_id=${organizationId}`;
 }
 }
 
 return config;
});

// Add response interceptor to handle token refresh
api.interceptors.response.use(
 (response) => response,
 async (error) => {
 const originalRequest = error.config;

 // Check if error is 401 and we haven't already tried to refresh
 if (error.response?.status === 401 && !originalRequest._retry) {
 if (isRefreshing) {
 // If already refreshing, queue this request
 return new Promise((resolve, reject) => {
 failedQueue.push({ resolve, reject });
 }).then(token => {
 if (token) {
 originalRequest.headers.Authorization = `Bearer ${token}`;
 }
 return api(originalRequest);
 }).catch(err => {
 return Promise.reject(err);
 });
 }

 originalRequest._retry = true;
 isRefreshing = true;

 const refreshToken = safeStorage.getItem('refresh_token') || Cookies.get('refresh_token');

 if (refreshToken) {
 try {
 console.log('Attempting to refresh token...');
 const response = await api.post('/auth/refresh', {
 refresh_token: refreshToken
 });

 const { access_token, refresh_token: newRefreshToken } = response.data;

 // Update stored tokens
 storeTokensWithTimestamp(access_token, newRefreshToken);

 // Update the authorization header for the original request
 originalRequest.headers.Authorization = `Bearer ${access_token}`;

 // Process the queue with the new token
 processQueue(null, access_token);

 console.log('Token refreshed successfully');
 
 // Retry the original request
 return api(originalRequest);
 } catch (refreshError) {
 console.error('Token refresh failed:', refreshError);
 
 // Clear all auth data
 clearAuthData();

 // Process the queue with error
 processQueue(refreshError, null);

 // Redirect to login page
 if (typeof window !== 'undefined') {
 window.location.href = '/login';
 }

 return Promise.reject(refreshError);
 } finally {
 isRefreshing = false;
 }
 } else {
 // No refresh token available, clear auth data and redirect
 clearAuthData();

 if (typeof window !== 'undefined') {
 window.location.href = '/login';
 }

 return Promise.reject(error);
 }
 }

 return Promise.reject(error);
 }
);

// Auth interfaces
export interface RegisterRequest {
 email: string;
 password: string;
}

export interface ConfirmRequest {
 confirmation_code: string;
 email: string;
}

export interface ResendConfirmationRequest {
 email: string;
}

export interface LoginRequest {
 email: string;
 password: string;
}

export interface RefreshTokenRequest {
 refresh_token: string;
}

export interface GoogleCallbackRequest {
 code: string;
}

export interface Organization {
 id: string;
 name: string;
 description: string;
 role: string;
 owner_id: string;
 is_default: boolean;
 created_at: string;
}

export interface User {
 id: string;
 email: string;
 first_name?: string;
 last_name?: string;
 current_organization: string;
 organizations: Organization[];
}

export interface UpdateUserRequest {
 first_name?: string;
 last_name?: string;
 email?: string;
}

export interface AuthResponse {
 access_token: string;
 refresh_token: string;
 expires_in: number;
 token_type: string;
 user: User;
}

// Organization interfaces
export interface OrganizationUser {
 id: string;
 email: string;
 role: string;
}

export interface CreateOrganizationRequest {
 name: string;
 description: string;
}

export interface UpdateOrganizationRequest {
 name: string;
 description: string;
}

export interface InviteUserRequest {
 email: string;
 role: string;
}

export interface UpdateUserRoleRequest {
 role: string;
}

export interface AcceptInvitationRequest {
 token: string;
}

export interface RejectInvitationRequest {
 token: string;
}

export interface InvitationBase {
 id: string;
 organization_id: string;
 organization_name: string;
 role: string;
 status: string;
 token: string;
 expires_at: string;
 created_at: string;
}

export interface SentInvitation extends InvitationBase {
 invitee_email: string;
}

export interface ReceivedInvitation extends InvitationBase {
 inviter_id: string;
 inviter_email: string;
}

export interface InvitationsResponse {
 sent: SentInvitation[];
 received: ReceivedInvitation[];
}

// Auth API
export const authApi = {
 register: async (data: RegisterRequest): Promise<void> => {
 await api.post('/auth/register', data);
 },

 confirm: async (data: ConfirmRequest): Promise<void> => {
 await api.post('/auth/confirm', data);
 },

 resendConfirmation: async (data: ResendConfirmationRequest): Promise<void> => {
 await api.post('/auth/resend-confirmation', data);
 },

 login: async (data: LoginRequest): Promise<AuthResponse> => {
 const response = await api.post('/auth/login', data);
 return response.data;
 },

 refresh: async (data: RefreshTokenRequest): Promise<AuthResponse> => {
 const response = await api.post('/auth/refresh', data);
 return response.data;
 },

 getGoogleAuthUrl: async (): Promise<{ url: string }> => {
 const response = await api.get('/auth/google');
 return response.data;
 },

 googleCallback: async (data: GoogleCallbackRequest): Promise<AuthResponse> => {
 const response = await api.post('/auth/google/callback', data);
 return response.data;
 },
};

// Organization API
export const organizationApi = {
 // Get all organizations for the current user
 getAllOrganizations: async (): Promise<Organization[]> => {
 const response = await api.get('/organizations/');
 return response.data;
 },

 // Create a new organization
 createOrganization: async (data: CreateOrganizationRequest): Promise<Organization> => {
 const response = await api.post('/organizations/', data);
 return response.data;
 },

 // Get a specific organization by ID
 getOrganization: async (organizationId: string): Promise<Organization> => {
 const response = await api.get(`/organizations/${organizationId}`);
 return response.data;
 },

 // Update an organization
 updateOrganization: async (organizationId: string, data: UpdateOrganizationRequest): Promise<Organization> => {
 const response = await api.put(`/organizations/${organizationId}`, data);
 return response.data;
 },

 // Delete an organization
 deleteOrganization: async (organizationId: string): Promise<void> => {
 await api.delete(`/organizations/${organizationId}`);
 },

 // Get all users in an organization
 getOrganizationUsers: async (organizationId: string): Promise<OrganizationUser[]> => {
 const response = await api.get(`/organizations/${organizationId}/users`);
 return response.data;
 },

 // Invite a user to an organization
 inviteUser: async (organizationId: string, data: InviteUserRequest): Promise<void> => {
 await api.post(`/organizations/${organizationId}/invite`, data);
 },

 // Update a user's role in an organization
 updateUserRole: async (organizationId: string, userId: string, role: string): Promise<void> => {
 await api.post(`/organizations/${organizationId}/users/${userId}/role?role=${role}`);
 },

 // Remove a user from an organization
 removeUser: async (organizationId: string, userId: string): Promise<void> => {
 await api.delete(`/organizations/${organizationId}/users/${userId}`);
 },

 // Get invitation details from a token
 getInvitationByToken: async (token: string): Promise<ReceivedInvitation> => {
 const response = await api.get(`/invitations/${token}`);
 return response.data;
 },

 // Accept an invitation
 acceptInvitation: async (data: AcceptInvitationRequest): Promise<void> => {
 await api.post('/invitations/accept', data);
 },

 // Reject an invitation
 rejectInvitation: async (data: RejectInvitationRequest): Promise<void> => {
 await api.post('/invitations/reject', data);
 },

 // Get all invitations for the current user
 getAllInvitations: async (): Promise<InvitationsResponse> => {
 const response = await api.get('/invitations/');
 return response.data;
 },
};

// User API
export const userApi = {
 // Get current user profile
 getProfile: async (): Promise<User> => {
 const response = await api.get('/users/me');
 return response.data;
 },

 // Update user profile
 updateUser: async (data: UpdateUserRequest): Promise<User> => {
 const response = await api.put('/users/me', data);
 return response.data;
 },
 
 // Update current organization preference
 updateUserOrganization: async (organizationId: string): Promise<void> => {
 await api.post('/users/me/organization', { organization_id: organizationId });
 },

 // Change user password
 changePassword: async (data: { current_password: string; new_password: string }): Promise<void> => {
 await api.post('/users/change-password', data);
 },

 // Delete user account
 deleteUser: async (): Promise<void> => {
 await api.delete('/users/me');
 },
};

export interface Metric {
 value: string;
 metric: string;
 metric_operation: string;
 label: string;
 dimension: string;
 description: string;
 keywords: string[];
 filter: Record<string, any> | null;
}

export interface DatasetMetrics {
 dataset_id: string;
 dataset_metrics: Metric[];
}

export interface TablesAndMetricsResponse {
 [key: string]: DatasetMetrics;
}

export interface DatasetUploadResponse {
 dataset_id: string;
}

export interface Dataset {
 id: string;
 name: string;
 description: string;
 type: string;
 storage_location: string;
 size_bytes: number;
}

// Add token expiry tracking and proactive refresh
const TOKEN_REFRESH_INTERVAL = 1440 * 60 * 1000; // 1440 minutes in milliseconds (24 hours)
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes buffer before expiry

// Function to check if token needs refresh
const shouldRefreshToken = (): boolean => {
  const tokenTimestamp = safeStorage.getItem('token_timestamp');
  if (!tokenTimestamp) return false;
  
  const tokenAge = Date.now() - parseInt(tokenTimestamp);
  return tokenAge >= (TOKEN_REFRESH_INTERVAL - TOKEN_REFRESH_BUFFER);
};

// Function to proactively refresh token
const proactiveTokenRefresh = async (): Promise<void> => {
  if (!shouldRefreshToken()) return;
  
  const refreshToken = safeStorage.getItem('refresh_token') || Cookies.get('refresh_token');
  if (!refreshToken) return;
  
  try {
    console.log('Proactively refreshing token after 24 hours...');
    const response = await api.post('/auth/refresh', {
      refresh_token: refreshToken
    });

    const { access_token, refresh_token: newRefreshToken } = response.data;

    // Update stored tokens
    storeTokensWithTimestamp(access_token, newRefreshToken);

    console.log('Proactive token refresh successful');
  } catch (error) {
    console.error('Proactive token refresh failed:', error);
    // Handle refresh failure (logout user)
    clearAuthData();
    
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
};

// Set up interval for proactive token refresh (check every hour)
if (typeof window !== 'undefined') {
  setInterval(proactiveTokenRefresh, 60 * 60 * 1000); // Check every hour
}

// Helper function to store tokens with timestamp
export const storeTokensWithTimestamp = (accessToken: string, refreshToken: string): void => {
  const timestamp = Date.now().toString();
  
  // Store in localStorage
  safeStorage.setItem('access_token', accessToken);
  safeStorage.setItem('refresh_token', refreshToken);
  safeStorage.setItem('token_timestamp', timestamp);
  
  // Store in cookies as backup
  Cookies.set('access_token', accessToken);
  Cookies.set('refresh_token', refreshToken);
  Cookies.set('token_timestamp', timestamp);
  
  console.log('Tokens stored with timestamp:', new Date(parseInt(timestamp)).toISOString());
};

// Helper function to clear all auth data
export const clearAuthData = (): void => {
  safeStorage.removeItem('access_token');
  safeStorage.removeItem('refresh_token');
  safeStorage.removeItem('token_timestamp');
  safeStorage.removeItem('current_organization');
  Cookies.remove('access_token');
  Cookies.remove('refresh_token');
  Cookies.remove('token_timestamp');
  Cookies.remove('current_organization');
};

// Helper function to check token status (for debugging)
export const getTokenStatus = (): {
  hasToken: boolean;
  tokenAge: number;
  tokenAgeHours: number;
  shouldRefresh: boolean;
  timeUntilRefresh: number;
} => {
  const token = safeStorage.getItem('access_token');
  const tokenTimestamp = safeStorage.getItem('token_timestamp');
  
  if (!token || !tokenTimestamp) {
    return {
      hasToken: false,
      tokenAge: 0,
      tokenAgeHours: 0,
      shouldRefresh: false,
      timeUntilRefresh: 0
    };
  }
  
  const tokenAge = Date.now() - parseInt(tokenTimestamp);
  const tokenAgeHours = tokenAge / (1000 * 60 * 60);
  const shouldRefresh = tokenAge >= (TOKEN_REFRESH_INTERVAL - TOKEN_REFRESH_BUFFER);
  const timeUntilRefresh = Math.max(0, (TOKEN_REFRESH_INTERVAL - TOKEN_REFRESH_BUFFER) - tokenAge);
  
  return {
    hasToken: true,
    tokenAge,
    tokenAgeHours,
    shouldRefresh,
    timeUntilRefresh
  };
};

