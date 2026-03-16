import { Node, Edge } from 'reactflow';

// Agent interfaces
export interface Agent {
  id: string;
  name: string;
  description: string;
  instructions?: string;
  tools?: any[];
  llm_provider_id?: string;
  llm_model?: string;
  llm_config?: {
    voice?: string;
    [key: string]: any;
  };
  voice_id?: string | null;
  tts_provider_id?: string;
  tts_config?: {
    provider: string;
    base_url?: string;
    model?: string;
    api_key: string;
    voice?: string;
    voice_id?: string;
    response_format?: string;
  };
  rag_config?: any[];
  llm_options?: Record<string, any> | null;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  collection_fields?: any[];
}

// Node data interfaces
export interface BaseNodeData {
  label: string;
}

export interface StartNodeData extends BaseNodeData {
  greeting?: string;
}

export interface EndNodeData extends BaseNodeData {
  message?: string;
}

export interface AgentNodeData extends BaseNodeData {
  agentId: string;
  description?: string;
  config?: {
    responseFormat?: 'text' | 'json';
    maxTokens?: number;
    temperature?: number;
  };
  // Add comprehensive agent properties for enhanced display
  llm_model?: string;
  llm_provider_id?: string;
  tts_provider?: string;
  tts_provider_id?: string;
  voice_id?: string;
  rag_count?: number;
  tools_count?: number;
  collection_fields_count?: number;
  tts_config?: {
    provider?: string;
    voice?: string;
    [key: string]: any;
  };
  rag_config?: any[];
  tools?: any[];
  collection_fields?: any[];
}

export interface DecisionNodeData extends BaseNodeData {
  conditions?: DecisionCondition[];
  defaultTargetId?: string;
}

export interface DecisionCondition {
  id: string;
  name: string;
  expression: string; 
  targetNodeId?: string;
}

// Edge data interfaces
export interface BaseEdgeData {
  label?: string;
  type?: string;
}

export interface ConditionalEdgeData extends BaseEdgeData {
  name?: string;
  condition?: string | { name?: string; description?: string; [key: string]: any };
  probability?: number;
  type?: 'success' | 'failure' | 'default';
  stroke?: string;
  strokeWidth?: number;
  state?: Record<string, any>;
  description?: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  tool?: Record<string, any>;
  hasCondition?: boolean;
  conditionType?: string;
  aiPrompt?: string;
  sourceId?: string;
  targetId?: string;
  sourceName?: string;
  targetName?: string;
  sourceNodeType?: string;
  targetNodeType?: string;
}

// Workflow interfaces
export interface Workflow {
  id: string;
  name: string;
  initialGreeting: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowSettings {
  maxTurns?: number;
  timeoutSeconds?: number;
  fallbackAgentId?: string;
  defaultLLMConfig?: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
} 