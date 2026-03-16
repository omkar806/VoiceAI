import axios, { InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Changed from true to false to avoid CORS issues with wildcard
});

// Add auth interceptor to include token in requests
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = Cookies.get('access_token');
  const organizationId = Cookies.get('current_organization');
  
  // Add token to headers
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
    await api.post('/authtuple/auth/register', data);
  },

  confirm: async (data: ConfirmRequest): Promise<void> => {
    await api.post('/authtuple/auth/confirm', data);
  },

  resendConfirmation: async (data: ResendConfirmationRequest): Promise<void> => {
    await api.post('/authtuple/auth/resend-confirmation', data);
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/authtuple/auth/login', data);
    return response.data;
  },

  refresh: async (data: RefreshTokenRequest): Promise<AuthResponse> => {
    const response = await api.post('/authtuple/auth/refresh', data);
    return response.data;
  },

  getGoogleAuthUrl: async (): Promise<{ url: string }> => {
    const response = await api.get('/authtuple/auth/google');
    return response.data;
  },

  googleCallback: async (data: GoogleCallbackRequest): Promise<AuthResponse> => {
    const response = await api.post('/authtuple/auth/google/callback', data);
    return response.data;
  },
};

// Organization API
export const organizationApi = {
  // Get all organizations for the current user
  getAllOrganizations: async (): Promise<Organization[]> => {
    const response = await api.get('/authtuple/organizations/');
    return response.data;
  },

  // Create a new organization
  createOrganization: async (data: CreateOrganizationRequest): Promise<Organization> => {
    const response = await api.post('/authtuple/organizations/', data);
    return response.data;
  },

  // Get a specific organization by ID
  getOrganization: async (organizationId: string): Promise<Organization> => {
    const response = await api.get(`/authtuple/organizations/${organizationId}`);
    return response.data;
  },

  // Update an organization
  updateOrganization: async (organizationId: string, data: UpdateOrganizationRequest): Promise<Organization> => {
    const response = await api.put(`/authtuple/organizations/${organizationId}`, data);
    return response.data;
  },

  // Delete an organization
  deleteOrganization: async (organizationId: string): Promise<void> => {
    await api.delete(`/authtuple/organizations/${organizationId}`);
  },

  // Get all users in an organization
  getOrganizationUsers: async (organizationId: string): Promise<OrganizationUser[]> => {
    const response = await api.get(`/authtuple/organizations/${organizationId}/users`);
    return response.data;
  },

  // Invite a user to an organization
  inviteUser: async (organizationId: string, data: InviteUserRequest): Promise<void> => {
    await api.post(`/authtuple/organizations/${organizationId}/invite`, data);
  },

  // Update a user's role in an organization
  updateUserRole: async (organizationId: string, userId: string, role: string): Promise<void> => {
    await api.post(`/authtuple/organizations/${organizationId}/users/${userId}/role?role=${role}`);
  },

  // Remove a user from an organization
  removeUser: async (organizationId: string, userId: string): Promise<void> => {
    await api.delete(`/authtuple/organizations/${organizationId}/users/${userId}`);
  },

  // Get invitation details from a token
  getInvitationByToken: async (token: string): Promise<ReceivedInvitation> => {
    const response = await api.get(`/authtuple/invitations/${token}`);
    return response.data;
  },

  // Accept an invitation
  acceptInvitation: async (data: AcceptInvitationRequest): Promise<void> => {
    await api.post('/authtuple/invitations/accept', data);
  },

  // Reject an invitation
  rejectInvitation: async (data: RejectInvitationRequest): Promise<void> => {
    await api.post('/authtuple/invitations/reject', data);
  },

  // Get all invitations for the current user
  getAllInvitations: async (): Promise<InvitationsResponse> => {
    const response = await api.get('/authtuple/invitations/');
    return response.data;
  },
};

// User API
export const userApi = {
  // Get current user profile
  getProfile: async (): Promise<User> => {
    const response = await api.get('/authtuple/users/me');
    return response.data;
  },

  // Update user profile
  updateUser: async (data: UpdateUserRequest): Promise<User> => {
    const response = await api.put('/authtuple/users/me', data);
    return response.data;
  },

  // Change user password
  changePassword: async (data: { current_password: string; new_password: string }): Promise<void> => {
    await api.post('/authtuple/users/change-password', data);
  },

  // Delete user account
  deleteUser: async (): Promise<void> => {
    await api.delete('/authtuple/users/me');
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

