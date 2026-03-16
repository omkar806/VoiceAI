import api from './api';
import axios, { AxiosError } from 'axios';

// Type definitions based on the backend schema
export interface Chatbot {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Chatbots service
const chatbotService = {
  /**
   * Get all chatbots
   */
  getChatbots: async (skip = 0, limit = 100): Promise<Chatbot[]> => {
    try {
      // Add trailing slash to match backend route pattern
      const response = await api.get<Chatbot[]>(`/chatbots/?skip=${skip}&limit=${limit}`);
      return response.data;
    } catch (error) {
      // If endpoint doesn't exist yet, return empty array
      if (axios.isAxiosError(error) && error.response && error.response.status === 404) {
        console.warn('Chatbots endpoint not implemented yet');
        return [];
      }
      throw error;
    }
  },
};

export default chatbotService; 