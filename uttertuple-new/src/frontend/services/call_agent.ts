// import api from './api';
import api,{ getUserId, setAuthToken, removeAuthToken, setUserId, removeUserId, getOrganizationId } from './apiConfig';

import { Workflow } from './workflow';

export interface CallAgent {
  id: string;
  user_id: string;
  workflow_id: string;
  call_type: string;
  phone_numbers: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
  workflow?: Workflow;
}

export interface CreateCallAgentData {
  workflow_id: string;
  call_type: string;
  phone_numbers?: string[] | null;
}

export interface UpdateCallAgentData {
  status?: string;
  phone_numbers?: string[] | null;
}

// Call Agent service
const callAgentService = {
  /**
   * Get all call agents
   */
  getCallAgents: async (skip = 0, limit = 100): Promise<CallAgent[]> => {
    const response = await api.get<CallAgent[]>(`/call-agents/?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  /**
   * Get call agent by ID
   */
  getCallAgentById: async (id: string): Promise<CallAgent> => {
    const response = await api.get<CallAgent>(`/call-agents/${id}`);
    return response.data;
  },

  /**
   * Create a new call agent
   */
  createCallAgent: async (data: CreateCallAgentData): Promise<CallAgent> => {
    const response = await api.post<CallAgent>('/call-agents', data);
    return response.data;
  },

  /**
   * Update a call agent
   */
  updateCallAgent: async (id: string, data: UpdateCallAgentData): Promise<CallAgent> => {
    const response = await api.put<CallAgent>(`/call-agents/${id}`, data);
    return response.data;
  },

  /**
   * Delete a call agent
   */
  deleteCallAgent: async (id: string): Promise<void> => {
    await api.delete(`/call-agents/${id}`);
  }
};

export default callAgentService; 