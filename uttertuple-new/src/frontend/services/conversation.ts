import api from './api';

// Type definitions
export interface Conversation {
  id: string;
  agent_id: string;
  user_id: string;
  title: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

// Conversation service
const conversationService = {
  /**
   * Get all conversations
   */
  getConversations: async (skip = 0, limit = 100): Promise<Conversation[]> => {
    const response = await api.get<Conversation[]>(`/conversations/?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  /**
   * Get conversation by ID
   */
  getConversationById: async (id: string): Promise<Conversation> => {
    const response = await api.get<Conversation>(`/conversations/${id}`);
    return response.data;
  },

  /**
   * Create a new conversation
   */
  createConversation: async (data: { agent_id: string; title?: string }): Promise<Conversation> => {
    const response = await api.post<Conversation>('/conversations', data);
    return response.data;
  },

  /**
   * Update a conversation
   */
  updateConversation: async (id: string, data: { title?: string; is_shared?: boolean }): Promise<Conversation> => {
    const response = await api.put<Conversation>(`/conversations/${id}`, data);
    return response.data;
  },

  /**
   * Delete a conversation
   */
  deleteConversation: async (id: string): Promise<void> => {
    await api.delete(`/conversations/${id}`);
  },
};

export default conversationService; 