// import api from './api';
import api,{ getUserId, setAuthToken, removeAuthToken, setUserId, removeUserId, getOrganizationId } from './apiConfig';
// Type definitions based on the backend schema
const organizationId = getOrganizationId();
export interface ToolParameter {
  name: string;
  description: string;
  type: string;
}

export interface CollectionField {
  name: string;
  type: 'text' | 'list' | 'number' | 'payment';
  required: boolean;
}

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  endpoint_url?: string;
  method?: string;
  auth_type?: string;
  auth_config?: Record<string, string>;
  request_schema?: string;
  response_schema?: string;
  parameters: ToolParameter[];
  response_type: string;
  confirmation_required: boolean;
  agent_id: string;
  created_at: string;
  updated_at: string;
}

export interface TTSConfig {
  provider: string;
  base_url?: string;
  model?: string;
  api_key: string;
  voice?: string;
  voice_id?: string;
  response_format?: string;
}

export interface RAGDatabaseConfig {
  id: string;
  collection_name: string;
  embedding_model: string;
  description?: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  instructions: string;
  llm_provider_id?: string;
  llm_model?: string;
  llm_config?: {
    voice?: string;
    [key: string]: any;
  };
  voice_id: string | null;
  tts_provider_id?: string;
  tts_config?: TTSConfig;
  rag_config?: RAGDatabaseConfig[];
  llm_options: Record<string, any> | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  tools: AgentTool[];
  collection_fields: CollectionField[];
}

export interface AgentCompact {
  id: string;
  name: string;
  description: string | null;
}

export interface CreateAgentData {
  name: string;
  description?: string;
  instructions: string;
  llm_provider_id?: string;
  llm_model?: string;
  llm_config?: {
    voice?: string;
    [key: string]: any;
  };
  voice_id?: string;
  tts_provider_id?: string;
  tts_config?: TTSConfig;
  rag_config?: RAGDatabaseConfig[];
  llm_options?: Record<string, any>;
  collection_fields?: CollectionField[];
  tools?: {
    name: string;
    description: string;
    endpoint_url?: string;
    method?: string;
    auth_type?: string;
    auth_config?: Record<string, string>;
    request_schema?: string;
    response_schema?: string;
    parameters?: ToolParameter[];
    response_type?: string;
    confirmation_required?: boolean;
  }[];
}

export interface UpdateAgentData {
  name?: string;
  description?: string;
  instructions?: string;
  llm_provider_id?: string;
  llm_model?: string;
  llm_config?: {
    voice?: string;
    [key: string]: any;
  };
  voice_id?: string;
  tts_provider_id?: string;
  tts_config?: TTSConfig;
  rag_config?: RAGDatabaseConfig[];
  llm_options?: Record<string, any>;
  collection_fields?: CollectionField[];
}

export interface CreateToolData {
  name: string;
  description: string;
  endpoint_url?: string;
  method?: string;
  auth_type?: string;
  auth_config?: Record<string, string>;
  request_schema?: string;
  response_schema?: string;
  parameters?: ToolParameter[];
  response_type?: string;
  confirmation_required?: boolean;
}

export interface UpdateToolData {
  name?: string;
  description?: string;
  endpoint_url?: string;
  method?: string;
  auth_type?: string;
  auth_config?: Record<string, string>;
  request_schema?: string;
  response_schema?: string;
  parameters?: ToolParameter[];
  response_type?: string;
  confirmation_required?: boolean;
}

// Agents service
const agentService = {
  /**
   * Get all agents
   */
  getAgents: async (skip = 0, limit = 100): Promise<Agent[]> => {
    const response = await api.get<Agent[]>(`/agents/?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  /**
   * Get a compact list of agents (for dropdowns)
   */
  getAgentsCompact: async (): Promise<AgentCompact[]> => {
    const response = await api.get<AgentCompact[]>('/agents/compact');
    return response.data;
  },

  /**
   * Get agent by ID
   */
  getAgentById: async (id: string): Promise<Agent> => {
    const response = await api.get<Agent>(`/agents/${id}`);
    return response.data;
  },

  /**
   * Create a new agent
   */
  createAgent: async (data: CreateAgentData): Promise<Agent> => {
    const response = await api.post<Agent>('/agents', data);
    return response.data;
  },

  /**
   * Update an agent
   */
  updateAgent: async (id: string, data: UpdateAgentData): Promise<Agent> => {
    const response = await api.put<Agent>(`/agents/${id}`, data);
    return response.data;
  },

  /**
   * Delete an agent
   */
  deleteAgent: async (id: string): Promise<void> => {
    await api.delete(`/agents/${id}`);
  },

  /**
   * Get all tools for an agent
   */
  getAgentTools: async (agentId: string): Promise<AgentTool[]> => {
    const response = await api.get<AgentTool[]>(`/agents/${agentId}/tools`);
    return response.data;
  },

  /**
   * Create a new tool for an agent
   */
  createAgentTool: async (agentId: string, data: CreateToolData): Promise<AgentTool> => {
    const response = await api.post<AgentTool>(`/agents/${agentId}/tools`, data);
    return response.data;
  },

  /**
   * Update a tool
   */
  updateAgentTool: async (agentId: string, toolId: string, data: UpdateToolData): Promise<AgentTool> => {
    const response = await api.put<AgentTool>(`/agents/${agentId}/tools/${toolId}`, data);
    return response.data;
  },

  /**
   * Delete a tool
   */
  deleteAgentTool: async (agentId: string, toolId: string): Promise<void> => {
    await api.delete(`/agents/${agentId}/tools/${toolId}`);
  },
};

export default agentService; 