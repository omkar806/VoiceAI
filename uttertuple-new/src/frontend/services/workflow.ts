// import api from './api';
import api,{ getUserId, setAuthToken, removeAuthToken, setUserId, removeUserId, getOrganizationId } from './apiConfig';

// Type definitions based on the backend schema
export enum NodeType {
  AGENT = "agent",
  START = "start",
  END = "end",
  GREETING = "greeting"
}

export interface WorkflowNodeBase {
  agent_id?: string | null;
  node_type: NodeType;
  position_x: number;
  position_y: number;
  data: Record<string, any>;
}

export interface WorkflowNode extends WorkflowNodeBase {
  id: string;
  workflow_id: string;
  created_at: string;
  updated_at: string;
  agent?: AgentCompactResponse | null;
}

export interface AgentCompactResponse {
  id: string;
  name: string;
  description: string | null;
}

export interface WorkflowEdgeBase {
  source_node_id: string;
  target_node_id: string;
  condition: Record<string, any>;
  state: Record<string, any>;
  label?: string | null;
}

export interface WorkflowEdge extends WorkflowEdgeBase {
  id: string;
  workflow_id: string;
  created_at: string;
  updated_at: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  initial_greeting: string | null;
  default_context: Record<string, any>;
  llm_model: string | null;
  llm_options: Record<string, any>;
  workflow_json?: Record<string, any> | null;
  user_id: string;
  initial_agent_id?: string | null;
  created_at: string;
  updated_at: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface CreateWorkflowData {
  name: string;
  description?: string | null;
  initial_greeting?: string | null;
  default_context?: Record<string, any>;
  workflow_json?: Record<string, any>; // New field for storing the complete JSON
}

export interface UpdateWorkflowData {
  name?: string;
  description?: string | null;
  initial_greeting?: string | null;
  initial_agent_id?: string | null;
  default_context?: Record<string, any>;
  workflow_json?: Record<string, any>; // New field for storing the complete JSON
}

export interface CreateNodeData extends WorkflowNodeBase {}

export interface UpdateNodeData {
  agent_id?: string | null;
  node_type?: NodeType;
  position_x?: number;
  position_y?: number;
  data?: Record<string, any>;
}

export interface CreateEdgeData extends WorkflowEdgeBase {}

export interface UpdateEdgeData {
  source_node_id?: string;
  target_node_id?: string;
  condition?: Record<string, any>;
  state?: Record<string, any>;
  label?: string | null;
}

// Add new interface for test response
export interface WorkflowTestResponse {
  status: string;
  message: string;
  room_name?: string;
  server_url?: string;
}

// Add new interface for process status response
export interface ProcessStatusResponse {
  status: string; // "running", "terminated", "completed", "not_workflow" or "not_found"
  message: string;
  process_id?: number;
  command?: string;
  is_workflow_subprocess?: boolean;
}

// Simple in-memory cache for workflows list (stale-while-revalidate)
let workflowsCache: { data: Workflow[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds

// Workflows service
const workflowService = {
  /**
   * Get all workflows (uses cache for instant load on revisit)
   */
  getWorkflows: async (skip = 0, limit = 100): Promise<Workflow[]> => {
    const now = Date.now();
    if (workflowsCache && now - workflowsCache.timestamp < CACHE_TTL_MS) {
      return workflowsCache.data;
    }
    const response = await api.get<Workflow[]>(`/workflows/?skip=${skip}&limit=${limit}`);
    workflowsCache = { data: response.data, timestamp: now };
    return response.data;
  },

  /**
   * Get workflows with optional cache bypass (for refresh)
   */
  getWorkflowsFresh: async (skip = 0, limit = 100): Promise<Workflow[]> => {
    const response = await api.get<Workflow[]>(`/workflows/?skip=${skip}&limit=${limit}`);
    workflowsCache = { data: response.data, timestamp: Date.now() };
    return response.data;
  },

  /**
   * Get cached workflows if available (for instant display)
   */
  getCachedWorkflows: (): Workflow[] | null => {
    if (!workflowsCache) return null;
    if (Date.now() - workflowsCache.timestamp > CACHE_TTL_MS) return null;
    return workflowsCache.data;
  },

  /**
   * Get workflow by ID
   */
  getWorkflowById: async (id: string): Promise<Workflow> => {
    const response = await api.get<Workflow>(`/workflows/${id}`);
    return response.data;
  },

  /**
   * Get workflow for editor (avoids agent model validation issues)
   */
  getWorkflowForEditor: async (id: string): Promise<Workflow> => {
    const response = await api.get<Workflow>(`/workflows/${id}/editor`);
    return response.data;
  },

  /**
   * Create a new workflow
   */
  createWorkflow: async (data: CreateWorkflowData): Promise<Workflow> => {
    const response = await api.post<Workflow>('/workflows', data);
    return response.data;
  },

  /**
   * Update a workflow
   */
  updateWorkflow: async (id: string, data: UpdateWorkflowData): Promise<Workflow> => {
    const response = await api.put<Workflow>(`/workflows/${id}`, data);
    return response.data;
  },

  /**
   * Delete a workflow
   */
  deleteWorkflow: async (id: string): Promise<void> => {
    await api.delete(`/workflows/${id}`);
  },

  /**
   * Get nodes for a workflow
   */
  getWorkflowNodes: async (workflowId: string): Promise<WorkflowNode[]> => {
    const response = await api.get<WorkflowNode[]>(`/workflows/${workflowId}/nodes`);
    return response.data;
  },

  /**
   * Create a new node for a workflow
   */
  createWorkflowNode: async (workflowId: string, data: CreateNodeData): Promise<WorkflowNode> => {
    const response = await api.post<WorkflowNode>(`/workflows/${workflowId}/nodes`, data);
    return response.data;
  },

  /**
   * Update a workflow node
   */
  updateWorkflowNode: async (workflowId: string, nodeId: string, data: UpdateNodeData): Promise<WorkflowNode> => {
    const response = await api.put<WorkflowNode>(`/workflows/${workflowId}/nodes/${nodeId}`, data);
    return response.data;
  },

  /**
   * Delete a workflow node
   */
  deleteWorkflowNode: async (workflowId: string, nodeId: string): Promise<void> => {
    await api.delete(`/workflows/${workflowId}/nodes/${nodeId}`);
  },

  /**
   * Get edges for a workflow
   */
  getWorkflowEdges: async (workflowId: string): Promise<WorkflowEdge[]> => {
    const response = await api.get<WorkflowEdge[]>(`/workflows/${workflowId}/edges`);
    return response.data;
  },

  /**
   * Create a new edge for a workflow
   */
  createWorkflowEdge: async (workflowId: string, data: CreateEdgeData): Promise<WorkflowEdge> => {
    const response = await api.post<WorkflowEdge>(`/workflows/${workflowId}/edges`, data);
    return response.data;
  },

  /**
   * Update a workflow edge
   */
  updateWorkflowEdge: async (workflowId: string, edgeId: string, data: UpdateEdgeData): Promise<WorkflowEdge> => {
    const response = await api.put<WorkflowEdge>(`/workflows/${workflowId}/edges/${edgeId}`, data);
    return response.data;
  },

  /**
   * Delete a workflow edge
   */
  deleteWorkflowEdge: async (workflowId: string, edgeId: string): Promise<void> => {
    await api.delete(`/workflows/${workflowId}/edges/${edgeId}`);
  },

  /**
   * Get a specific edge by ID
   */
  getWorkflowEdge: async (workflowId: string, edgeId: string): Promise<WorkflowEdge> => {
    const response = await api.get<WorkflowEdge>(`/workflows/${workflowId}/edges/${edgeId}`);
    return response.data;
  },

  /**
   * Export workflow to JSON
   */
  exportWorkflowToJson: async (workflowId: string): Promise<any> => {
    const response = await api.get(`/workflows/${workflowId}/export`);
    return response.data;
  },

  /**
   * Run a workflow
   */
  runWorkflow: async (workflowId: string): Promise<any> => {
    const response = await api.post(`/workflows/${workflowId}/run`);
    return response.data;
  },

  /**
   * Generate workflow JSON directly from database (more reliable)
   */
  generateWorkflowJsonFromDb: async (workflowId: string): Promise<any> => {
    try {
      const response = await api.get<any>(`/workflows/${workflowId}/generate-json`);
      return response.data;
    } catch (error) {
      console.error('Error generating workflow JSON from database:', error);
      throw error;
    }
  },

  /**
   * Start a workflow test (uses database-generated JSON by default)
   */
  async startWorkflowTest(workflowId: string, workflowJson?: Record<string, any>): Promise<WorkflowTestResponse> {
    try {
      // If workflowJson is provided, use it. Otherwise, use the endpoint without a body
      // to let the backend generate the JSON from database
      let response;
      if (workflowJson) {
        // Use provided workflow JSON
        response = await api.post<WorkflowTestResponse>(`/workflows/${workflowId}/test`, workflowJson);
      } else {
        // Let backend generate workflow JSON from database
        response = await api.post<WorkflowTestResponse>(`/workflows/${workflowId}/test`);
      }
      return response.data;
    } catch (error) {
      console.error('Error starting workflow test:', error);
      throw error;
    }
  },

  /**
   * Get workflow logs 
   */
  getWorkflowLogs: async (workflowId: string): Promise<string[]> => {
    try {
      const response = await api.get<{logs: string[]}>(`/workflows/${workflowId}/logs`);
      return response.data.logs;
    } catch (error) {
      console.error('Error fetching workflow logs:', error);
      return [];
    }
  },
  
  /**
   * Get workflow logs without authentication (for subprocess logs) 
   */
  getPublicWorkflowLogs: async (workflowId: string): Promise<string[]> => {
    try {
      const response = await api.get<{logs: string[]}>(`/workflows/${workflowId}/logs/public`);
      return response.data.logs;
    } catch (error) {
      console.error('Error fetching public workflow logs:', error);
      return [];
    }
  },
  
  /**
   * Download workflow logs as text file
   */
  downloadWorkflowLogs: async (workflowId: string): Promise<Blob> => {
    const response = await api.get(`/workflows/${workflowId}/logs/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Terminate a workflow process (authenticated)
   */
  terminateWorkflowProcess: async (workflowId: string): Promise<any> => {
    const response = await api.post(`/workflows/${workflowId}/terminate`);
    return response.data;
  },

  /**
   * Terminate a workflow process (public endpoint, used when navigating away)
   */
  terminateWorkflowProcessPublic: async (workflowId: string): Promise<any> => {
    const response = await api.post(`/workflows/${workflowId}/terminate/public`);
    return response.data;
  },

  /**
   * Check the status of a workflow process
   */
  checkWorkflowProcessStatus: async (workflowId: string): Promise<ProcessStatusResponse> => {
    const response = await api.get<ProcessStatusResponse>(`/workflows/${workflowId}/status`);
    return response.data;
  },

  /**
   * Execute a workflow with a LiveKit agent
   */
  executeWorkflow: async (workflowId: string, workflowJson?: Record<string, any>): Promise<any> => {
    try {
      // Use axios directly with absolute URL to bypass the api baseURL
      const axios = (await import('axios')).default;
      const body = workflowJson ? { workflowId, workflowJson } : { workflowId };
      
      // Get the auth token to include in the request
      const { getToken } = await import('../utils/auth');
      const token = getToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Use the correct URL that points to Next.js API route
      const response = await axios.post('/api/execute-workflow', body, { headers });
      return response.data;
    } catch (error) {
      console.error('Error executing workflow:', error);
      throw error;
    }
  }
};

export default workflowService;