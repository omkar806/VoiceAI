// import api from './api'; 
import api,{ getUserId, setAuthToken, removeAuthToken, setUserId, removeUserId, getOrganizationId } from './apiConfig';


// Types
export interface TTSProvider {
  id: string;
  user_id: string;
  provider_name: string;
  api_key: string;
  base_url?: string;
  response_format?: string;
  created_at: string;
  updated_at: string;
}

export interface TTSConfig {
  provider: string;
  api_key: string;
  voice: string;
  voice_id?: string;
  base_url?: string;
  response_format?: string;
}

const ttsService = {
  // Placeholder for TTS service methods
  // These are not actually used in the agent create page
};

export const getUserTTSProviders = async () => {
  const response = await api.get('/providers/user/tts');
  return response.data;
};

export const createUserTTSProvider = async (data: { 
  provider_name: string; 
  api_key: string; 
  model_name?: string;
  base_url?: string;
  response_format?: string;
  voice?: string;
}) => {
  const response = await api.post('/providers/user/tts', data);
  return response.data;
};

export const deleteUserTTSProvider = async (id: string) => {
  await api.delete(`/providers/user/tts/${id}`);
};

export default ttsService; 