export interface ToolParameter {
  name: string;
  description: string;
  type: "string" | "number" | "boolean" | "array" | "object";
}

export interface CustomTool {
  name: string;
  description: string;
  parameters?: ToolParameter[];
  response_type?: "string" | "agent" | "tuple";
  confirmation_required?: boolean;
}

export interface AgentConfig {
  name: string;
  instructions: string;
  tools?: string[];
  custom_tools?: CustomTool[];
  transitions?: string[];
  voice_id?: string;
  greeting?: string;
  llm_model?: string;
  llm_options?: Record<string, any>;
}

export interface FlowConfig {
  flow_name: string;
  agents: AgentConfig[];
  initial_agent: string;
  default_context?: Record<string, any>;
  initial_greeting?: string;
  llm_model?: string;
  llm_options?: Record<string, any>;
}

export interface UserConfig {
  id: string;
  email: string;
  username: string;
  agents: AgentConfig[];
  flows: FlowConfig[];
} 