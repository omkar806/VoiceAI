// import api from './api';
import api,{ getUserId, setAuthToken, removeAuthToken, setUserId, removeUserId, getOrganizationId } from './apiConfig';

// Types
export interface LLMProvider {
  id: string;
  user_id: string;
  provider_name: string;
  api_key: string;
  base_url?: string;
  created_at: string;
  updated_at: string;
}

export interface LLMConfig {
  provider: string;
  api_key: string;
  model: string;
  base_url?: string;
}

const llmService = {
  // Placeholder for LLM service methods
  // These are not actually used in the agent create page
};


export const getUserLLMProviders = async () => {
  const response = await api.get('/providers/user/llm');
  return response.data;
};

export const createUserLLMProvider = async (data: { 
  provider_name: string; 
  api_key: string;
  model_name?: string;
}) => {
  const response = await api.post('/providers/user/llm', data);
  return response.data;
};

export const deleteUserLLMProvider = async (id: string) => {
  await api.delete(`/providers/user/llm/${id}`);
};


export default llmService; 