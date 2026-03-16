import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  StartNodeData,
  EndNodeData,
  AgentNodeData,
  DecisionNodeData 
} from '../../types/workflow';

// Start Node Component
export const StartNode: React.FC<NodeProps<StartNodeData>> = ({ data, selected }) => {
  const { darkMode } = useTheme();
  
  return (
    <div 
      className={`px-4 py-2 rounded-lg shadow border-2 transition-all duration-200 ${
        selected
          ? 'shadow-lg scale-105 border-green-500'
          : darkMode 
            ? 'shadow-md border-gray-600'
            : 'shadow-md border-gray-300'
      } ${
        darkMode
          ? 'bg-gray-800 text-white'
          : 'bg-green-50 text-green-800'
      }`}
    >
      <div className="font-bold text-center">{data.label}</div>
      <Handle 
        type="source" 
        position={Position.Right}
        className={darkMode ? 'border-gray-500' : ''}
        isConnectable={true}
      />
    </div>
  );
};

// End Node Component
export const EndNode: React.FC<NodeProps<EndNodeData>> = ({ data, selected }) => {
  const { darkMode } = useTheme();
  
  return (
    <div 
      className={`px-4 py-2 rounded-lg shadow border-2 transition-all duration-200 ${
        selected
          ? 'shadow-lg scale-105 border-red-500'
          : darkMode 
            ? 'shadow-md border-gray-600'
            : 'shadow-md border-gray-300'
      } ${
        darkMode
          ? 'bg-gray-800 text-white'
          : 'bg-red-50 text-red-800'
      }`}
    >
      <div className="font-bold text-center">{data.label}</div>
      <Handle 
        type="target" 
        position={Position.Left}
        className={darkMode ? 'border-gray-500' : ''}
        isConnectable={true}
      />
    </div>
  );
};

// Agent Node Component
export const AgentNode: React.FC<NodeProps<AgentNodeData>> = ({ data, selected }) => {
  const { darkMode } = useTheme();
  
  // Function to truncate text
  const truncateText = (text: string, maxLength: number = 15) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };
  
  // Get agent data from the realAgents context if available
  // This would need to be passed down or accessed via context
  // For now, we'll work with the data we have
  
  return (
    <div 
      className={`rounded-lg shadow border-2 transition-all duration-200 min-w-[200px] ${
        selected
          ? 'shadow-lg scale-105 border-blue-500'
          : darkMode 
            ? 'shadow-md border-gray-600'
            : 'shadow-md border-gray-300'
      } ${
        darkMode
          ? 'bg-gray-800 text-white'
          : 'bg-blue-50 text-blue-900'
      }`}
    >
      {/* Agent Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center mb-2">
          {/* Agent icon/avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
            darkMode ? 'bg-blue-800 text-blue-100' : 'bg-blue-100 text-blue-700'
          }`}>
            {data.label.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm" title={data.label}>
              {truncateText(data.label, 20)}
            </div>
          </div>
        </div>
        
        {data.description && (
          <div 
            className={`text-xs ${darkMode ? 'text-gray-300' : 'text-blue-700'}`}
            title={data.description}
          >
            {truncateText(data.description, 30)}
          </div>
        )}
      </div>

      {/* Agent Details */}
      <div className="p-2 space-y-1">
        {/* LLM Model */}
        <div className={`flex justify-between items-center text-xs ${
          darkMode ? 'text-gray-300' : 'text-blue-800'
        }`}>
          <span className="font-medium">LLM:</span>
          <span className="truncate ml-1" title={data.llm_model || 'Not configured'}>
            {truncateText(data.llm_model || 'Not set', 12)}
          </span>
        </div>

        {/* TTS Provider - Hide when LLM is openai-realtime */}
        {data.llm_model !== 'openai-realtime' && (
          <div className={`flex justify-between items-center text-xs ${
            darkMode ? 'text-gray-300' : 'text-blue-800'
          }`}>
            <span className="font-medium">TTS:</span>
            <span className="truncate ml-1" title={data.tts_provider || 'Not configured'}>
              {truncateText(data.tts_provider || 'Not set', 12)}
            </span>
          </div>
        )}

        {/* Voice */}
        <div className={`flex justify-between items-center text-xs ${
          darkMode ? 'text-gray-300' : 'text-blue-800'
        }`}>
          <span className="font-medium">Voice:</span>
          <span className="truncate ml-1" title={data.voice_id || 'Default'}>
            {truncateText(data.voice_id || 'Default', 12)}
          </span>
        </div>

        {/* RAG Databases */}
        <div className={`flex justify-between items-center text-xs ${
          darkMode ? 'text-gray-300' : 'text-blue-800'
        }`}>
          <span className="font-medium">RAG:</span>
          <span className="truncate ml-1">
            {data.rag_count ? `${data.rag_count} DB${data.rag_count > 1 ? 's' : ''}` : 'None'}
          </span>
        </div>

        {/* Tools */}
        <div className={`flex justify-between items-center text-xs ${
          darkMode ? 'text-gray-300' : 'text-blue-800'
        }`}>
          <span className="font-medium">Tools:</span>
          <span className="truncate ml-1">
            {data.tools_count ? `${data.tools_count} tool${data.tools_count > 1 ? 's' : ''}` : 'None'}
          </span>
        </div>

        {/* Collection Fields */}
        {data.collection_fields_count && data.collection_fields_count > 0 && (
          <div className={`flex justify-between items-center text-xs ${
            darkMode ? 'text-gray-300' : 'text-blue-800'
          }`}>
            <span className="font-medium">Fields:</span>
            <span className="truncate ml-1">
              {data.collection_fields_count} field{data.collection_fields_count > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Status Indicator */}
      <div className="px-3 pb-2">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${
            (data.llm_model && (data.voice_id || data.tts_provider)) 
              ? 'bg-green-500' 
              : data.llm_model 
                ? 'bg-yellow-500' 
                : 'bg-red-500'
          }`}></div>
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-blue-600'}`}>
            {(data.llm_model && (data.voice_id || data.tts_provider)) 
              ? 'Fully configured' 
              : data.llm_model 
                ? 'Partially configured' 
                : 'Needs configuration'
            }
          </span>
        </div>
      </div>
      
      <Handle 
        type="target" 
        position={Position.Left}
        className={darkMode ? 'border-gray-500' : ''}
        isConnectable={true}
      />
      <Handle 
        type="source" 
        position={Position.Right}
        className={darkMode ? 'border-gray-500' : ''}
        isConnectable={true}
      />
    </div>
  );
};

// Decision Node Component
export const DecisionNode: React.FC<NodeProps<DecisionNodeData>> = ({ data, selected }) => {
  const { darkMode } = useTheme();
  
  return (
    <div 
      className={`px-4 py-2 rounded-lg shadow border-2 transition-all duration-200 ${
        selected
          ? 'shadow-lg scale-105 border-purple-500'
          : darkMode 
            ? 'shadow-md border-gray-600'
            : 'shadow-md border-gray-300'
      } ${
        darkMode
          ? 'bg-gray-800 text-white'
          : 'bg-purple-50 text-purple-900'
      }`}
    >
      <div className="font-bold text-center mb-1">{data.label}</div>
      {data.conditions && data.conditions.length > 0 && (
        <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-purple-700'}`}>
          {data.conditions.join(', ')}
        </div>
      )}
      <Handle 
        type="target" 
        position={Position.Left}
        className={darkMode ? 'border-gray-500' : ''}
        isConnectable={true}
      />
      <Handle 
        type="source" 
        position={Position.Right}
        className={darkMode ? 'border-gray-500' : ''}
        isConnectable={true}
      />
    </div>
  );
};

// Greeting Node Component 
interface GreetingNodeProps {
  data: {
    label: string;
    greeting: string;
    nodeType: string;
  };
}

export const GreetingNode: React.FC<GreetingNodeProps> = ({ data }) => (
  <div className="bg-sky-50 border border-sky-200 rounded-lg shadow-sm p-3 min-w-[180px]">
    <Handle type="target" position={Position.Left} id="greeting-target-left" />
    
    <div className="flex items-center justify-between mb-2">
      <div className="font-medium text-sky-700 text-sm">Initial Greeting</div>
      <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center">
        <span className="text-sky-700 font-medium text-xs">💬</span>
      </div>
    </div>
    
    <p className="text-xs text-sky-800 border-l-2 border-sky-200 pl-2 italic">
      {data.label}
    </p>
    
    <Handle type="source" position={Position.Right} id="greeting-source-right" />
  </div>
);

// Register node types for ReactFlow
export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  agent: AgentNode,
  decision: DecisionNode,
  custom: GreetingNode
};

export default nodeTypes; 