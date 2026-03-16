import React from 'react';
import { Search } from 'lucide-react';
import Input from '../ui/Input';
import { Agent } from '../../types/workflow';

interface AgentSidebarProps {
  agents: Agent[];
  onDragStart: (event: React.DragEvent<HTMLDivElement>, agentId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const AgentSidebar: React.FC<AgentSidebarProps> = ({
  agents,
  onDragStart,
  searchQuery = '',
  onSearchChange,
}) => {
  // Filter agents based on search query
  const filteredAgents = searchQuery
    ? agents.filter(
        (agent) =>
          agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          agent.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : agents;

  return (
    <div className="w-64 border-r border-neutral-200 bg-white p-4 overflow-y-auto">
      <h2 className="font-medium text-neutral-800 mb-3">Available Agents</h2>
      
      {onSearchChange && (
        <div className="mb-3">
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-neutral-500" />}
            className="text-sm"
          />
        </div>
      )}
      
      <div className="space-y-2">
        {filteredAgents.map((agent) => (
          <div
            key={agent.id}
            className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg cursor-move hover:shadow-sm transition-shadow"
            draggable
            onDragStart={(e) => onDragStart(e, agent.id)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">{agent.name}</span>
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 text-xs font-medium">
                  {agent.name.charAt(0)}
                </span>
              </div>
            </div>
            <p className="text-xs text-neutral-600 line-clamp-2">{agent.description}</p>
          </div>
        ))}
        
        {filteredAgents.length === 0 && (
          <div className="p-3 text-center text-neutral-500 text-sm">
            No agents found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentSidebar; 