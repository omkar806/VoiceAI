import axios from 'axios';
import Cookies from 'js-cookie';
import { safeStorage } from '@/lib/safeStorage';


// const API_BASE_URL = "http://localhost:8020/api/v1";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL_DEV;
console.log("API_BASE_URL",API_BASE_URL)
const TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'user_id';

// Helper functions to manage authentication state
export const setAuthToken = (token: string) => {
  safeStorage.setItem(TOKEN_KEY, token);
};

export const getAuthToken = (): string | null => {
  return safeStorage.getItem(TOKEN_KEY);
};

export const removeAuthToken = () => {
  safeStorage.removeItem(TOKEN_KEY);
};

export const setUserId = (userId: number | string) => {
  safeStorage.setItem(USER_ID_KEY, userId.toString());
};

export const getUserId = (): string | null => {
  return safeStorage.getItem(USER_ID_KEY);
};

export const removeUserId = () => {
  safeStorage.removeItem(USER_ID_KEY);
};

export const getOrganizationId = (): string | null => {
  // First, try to get from localStorage directly
  const orgId = safeStorage.getItem('current_organization');
  if (orgId) return orgId;
  
  // If not in localStorage, try cookies for backward compatibility
  const cookieOrgId = Cookies.get('current_organization');
  if (cookieOrgId) return cookieOrgId;
  
  // If not stored separately, get from the user object
  const userJson = safeStorage.getItem('user_data');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      return user.current_organization;
    } catch (e) {
      console.error('Error parsing user JSON', e);
    }
  }
  
  return null;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    // Ensure credentials are always included
    config.withCredentials = true;
    
    // Log the request URL for debugging
    console.log(`Making API request to: ${config.url}`);

    // Get token and organization ID from localStorage (preferred) or cookies
    const credentials = safeStorage.getItem('access_token') || Cookies.get('access_token');
    const organizationId = safeStorage.getItem('current_organization') || Cookies.get('current_organization');
    
    console.log(`Secondary API client request with organization: ${organizationId}`);
    
    if (credentials && config.url !== '/login') {
      // Use stored credentials for Authorization header
      config.headers.Authorization = `Bearer ${credentials}`;
      
      // Add organization ID only in one place (params) to avoid duplication
      if (organizationId) {
        // Add organization ID to headers
        config.headers['X-Organization-ID'] = organizationId;
        
        // ONLY add to params, not to URL directly
        if (!config.params) {
          config.params = { organization_id: organizationId };
        } else if (!config.params.organization_id) {
          config.params.organization_id = organizationId;
        }
        
        // Add to request body for POST/PUT requests if not already present
        if (['post', 'put','delete'].includes(config.method?.toLowerCase() || '') && 
            config.data && typeof config.data === 'object' && 
            !(config.data instanceof FormData) && 
            !config.data.organization_id) {
          config.data.organization_id = organizationId;
        }
      }
      
      // Add user_id to query params for all GET requests if not already present
      if (config.method?.toLowerCase() === 'get' && config.params) {
        const userId = safeStorage.getItem(USER_ID_KEY);
        if (userId && !config.params.user_id) {
          config.params.user_id = userId;
          console.log('Added user_id to GET params:', userId);
        }
      }
      
      // Add user_id to request body for all POST/PUT/DELETE requests if not already present
      if (['post', 'put', 'delete'].includes(config.method?.toLowerCase() || '') && 
          config.data && typeof config.data === 'object' && !config.data.user_id) {
        const userId = safeStorage.getItem(USER_ID_KEY);
        if (userId) {
          // Only modify if it's an object and not FormData
          if (!(config.data instanceof FormData)) {
            config.data.user_id = userId;
            console.log('Added user_id to request body:', userId);
          }
        }
      }
      
      console.log('Using stored credentials for authentication');
    } else if (config.url === '/login') {
      console.log('Login request - using provided credentials');
    } else {
      console.warn('No auth credentials found for request');
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 responses (unauthorized)
    if (error.response && error.response.status === 401) {
      // Clear auth data
      removeAuthToken();
      removeUserId();
      
      // Redirect to login page if needed
      // This would need to be implemented based on your routing solution
    //   window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api; 
