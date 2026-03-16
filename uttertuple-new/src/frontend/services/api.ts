import axios from 'axios';
import { getToken, removeToken } from '../utils/auth';

// Default API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_AUTH_URL
// for local development
// const API_BASE_URL = "http://localhost:8021/api/v1"
// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
console.log(API_BASE_URL)
// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = getToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response && error.response.status === 401) {
      // Only handle session expiration redirects if not on the login/auth pages
      const isAuthPath = window.location.pathname.startsWith('/login');
      
      if (!isAuthPath) {
        // Clear auth data
        removeToken();
        console.log('Token removed');
        // Redirect to login page if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// LLM and TTS Provider API
// export const getUserLLMProviders = async () => {
//   const response = await api.get('/providers/user/llm');
//   return response.data;
// };

// export const createUserLLMProvider = async (data: { 
//   provider_name: string; 
//   api_key: string;
//   model_name?: string;
// }) => {
//   const response = await api.post('/providers/user/llm', data);
//   return response.data;
// };

// export const deleteUserLLMProvider = async (id: string) => {
//   await api.delete(`/providers/user/llm/${id}`);
// };

// export const getUserTTSProviders = async () => {
//   const response = await api.get('/providers/user/tts');
//   return response.data;
// };

// export const createUserTTSProvider = async (data: { 
//   provider_name: string; 
//   api_key: string; 
//   model_name?: string;
//   base_url?: string;
//   response_format?: string;
//   voice?: string;
// }) => {
//   const response = await api.post('/providers/user/tts', data);
//   return response.data;
// };

// export const deleteUserTTSProvider = async (id: string) => {
//   await api.delete(`/providers/user/tts/${id}`);
// };

export default api; 
