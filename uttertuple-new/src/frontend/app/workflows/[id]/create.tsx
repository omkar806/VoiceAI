"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter, useParams } from 'next/navigation';
// import { useParams } from 'next/navigation';
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Panel,
  MarkerType,
  ConnectionLineType,
  ConnectionLineComponent,
  useReactFlow,
  NodeChange,
  NodePositionChange,
  NodeTypes
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toast } from 'react-hot-toast';

import MainLayout from '../../../components/layout/MainLayout';
import { nodeTypes } from '../../../components/workflows/WorkflowNodes';
import { edgeTypes } from '../../../components/workflows/EdgeLabel';
import AgentSidebar from '../../../components/workflows/AgentSidebar';
import WorkflowControls from '../../../components/workflows/WorkflowControls';
import ContextMenu from '../../../components/workflows/ContextMenu';
import ConfirmDialog from '../../../components/workflows/ConfirmDialog';
import NodeEditDialog from '../../../components/workflows/NodeEditDialog';
import EdgeEditDialog from '../../../components/workflows/EdgeEditDialog';
import { Agent, StartNodeData, EndNodeData, AgentNodeData, DecisionNodeData } from '../../../types/workflow';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import TextArea from '../../../components/ui/TextArea';
import Select from '../../../components/ui/Select';
import { PlusCircle, GitBranch, Trash, X, Plus, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import workflowService, { NodeType as BackendNodeType } from '../../../services/workflow';
import agentService from '../../../services/agent';

// Node IDs
const START_NODE_ID = 'start-node';
const END_NODE_ID = 'end-node';

// Canvas size constants
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

// Interface for edge condition
interface EdgeCondition {
  name: string;
  description: string;
  response_type: string;
  parameters: EdgeConditionParameter[];
  confirmation_required: boolean;
}

interface EdgeConditionParameter {
  name: string;
  description: string;
  type: string;
}

// Function to generate empty condition
const emptyCondition = (): EdgeCondition => ({
  name: '',
  description: '',
  response_type: 'string',
  parameters: [],
  confirmation_required: false
});

// Update the generateWorkflowJson function to use real agent data
const generateWorkflowJson = (
  workflowName: string,
  nodes: Node[],
  edges: Edge[],
  initialGreeting?: string,
  agents: Agent[] = []
) => {
  // Find agent nodes
  const agentNodes = nodes.filter(node => node.type === 'agent');
  const startNode = nodes.find(node => node.id === START_NODE_ID);
  
  console.log('START NODE:', startNode);
  console.log('ALL EDGES:', edges);
  console.log('ALL NODES:', nodes);
  
  // Create a mapping of agent IDs to agent key names for easier lookup
  const agentIdToKeyMap = new Map<string, string>();
  const nodeIdToKeyMap = new Map<string, string>();
  
  // First, build the ID to key name mapping (using a simpler format without underscores)
  agentNodes.forEach((agentNode, index) => {
    const agentId = (agentNode.data as AgentNodeData).agentId;
    const agentData = agents.find(a => a.id === agentId);
    
    // Generate a simple key name from the agent's name
    const keyName = agentData?.name 
      ? agentData.name.toLowerCase().replace(/\s+/g, '') 
      : (agentNode.data as AgentNodeData).label.toLowerCase().replace(/\s+/g, '');
    
    agentIdToKeyMap.set(agentId, keyName);
    nodeIdToKeyMap.set(agentNode.id, keyName); // Map node ID directly to key name
    
    console.log(`Mapping agent node ${agentNode.id} (agent ID: ${agentId}) to key: ${keyName}`);
  });
  
  // Create voices mapping object - will be populated from agent data
  const voices: Record<string, string> = {};
  
  // Create agents object with transitions and collection fields
  const agentsConfig: Record<string, any> = {};
  
  // Build each agent's configuration
  agentNodes.forEach((agentNode, index) => {
    const agentId = (agentNode.data as AgentNodeData).agentId;
    const agentData = agents.find(a => a.id === agentId);
    console.log(`Agent data for ${agentId}:`, agentData);
    
    const keyName = agentIdToKeyMap.get(agentId) || '';
    
    if (!keyName) return; // Skip if no valid key name
    
    // Assign voice based on agent data
    const voiceName = keyName;
    
    // Get voice_id from agent data if available
    if (agentData && 'voice_id' in agentData) {
      console.log(`Voice ID for ${keyName}:`, (agentData as any).voice_id);
      voices[voiceName] = (agentData as any).voice_id;
    } else {
      console.log(`No voice_id found for agent ${keyName}`);
    }
    
    // Find all outgoing edges from this agent
    const outgoingEdges = edges.filter(edge => edge.source === agentNode.id);
    
    // Map transitions to target agent keys
    const canTransferTo = outgoingEdges.map(edge => {
      const targetNode = nodes.find(n => n.id === edge.target);
      if (targetNode?.type === 'agent') {
        const targetAgentKeyName = nodeIdToKeyMap.get(targetNode.id);
        if (targetAgentKeyName) {
          return targetAgentKeyName;
        }
        
        // Fallback to agent ID mapping if node mapping doesn't exist
        const targetAgentId = (targetNode.data as AgentNodeData).agentId;
        return agentIdToKeyMap.get(targetAgentId) || null;
      }
      return null;
    }).filter(Boolean) as string[];
    
    // Get collection fields from the agent data and map to the format needed
    let collects: any[] = [];
    if (agentData && 'collection_fields' in agentData) {
      collects = ((agentData as any).collection_fields || []).map((field: any) => ({
        name: field.name,
        type: field.type,
        required: field.required
      }));
    }
    
    // Build the agent configuration
    agentsConfig[keyName] = {
      name: agentData?.name || (agentNode.data as AgentNodeData).label,
      voice: voiceName,
      description: agentData?.instructions || `You are a ${agentData?.name} agent.`, // Use instructions as description
      can_transfer_to: canTransferTo,
      collects: collects
    };
  });
  
  // Determine starting agent (from connections to start node)
  let startingAgent = '';
  
  // CRITICAL FIX: Always use START_NODE_ID constant for filtering start edges
  const startEdges = edges.filter(edge => edge.source === START_NODE_ID);
  console.log('Start edges:', startEdges);
  
  if (startEdges.length > 0) {
    // Get the first edge from start node (or most recent if multiple exist)
    const startEdge = startEdges[startEdges.length - 1];
    const targetNodeId = startEdge.target;
    console.log('Target node ID from start edge:', targetNodeId);
    
    // First try to lookup the key directly from the node ID mapping
    const directMappedKey = nodeIdToKeyMap.get(targetNodeId);
    if (directMappedKey) {
      startingAgent = directMappedKey;
      console.log('Found starting agent directly from node ID mapping:', startingAgent);
    } else {
      // Fallback to finding node and looking up by agent ID
      const targetNode = nodes.find(n => n.id === targetNodeId);
      console.log('Target node:', targetNode);
      
      if (targetNode?.type === 'agent') {
        const targetAgentId = (targetNode.data as AgentNodeData).agentId;
        console.log('Target agent ID:', targetAgentId);
        
        // Find the agent data based on the targetAgentId
        const agentData = agents.find(a => a.id === targetAgentId);
        if (agentData) {
          // Use the agent name directly
          const keyName = agentData.name.toLowerCase().replace(/\s+/g, '');
          startingAgent = keyName;
          console.log('Starting agent determined from name:', startingAgent);
        } else {
          // Fallback to the mapping
          startingAgent = agentIdToKeyMap.get(targetAgentId) || '';
          console.log('Starting agent from ID map:', startingAgent);
        }
      }
    }
  } else {
    console.log('No edges connected to start node found');
  }
  
  // IMPORTANT: Only use the fallback if absolutely necessary
  if (!startingAgent && Object.keys(agentsConfig).length > 0) {
    startingAgent = Object.keys(agentsConfig)[0];
    console.log('Using fallback starting agent (first agent):', startingAgent);
  }
  
  // Build the complete JSON structure
  const workflowJson = {
    voices,
    agents: agentsConfig,
    starting_agent: startingAgent,
    greeting: initialGreeting || ''
  };
  
  // Log the generated JSON for debugging
  console.log('%c GENERATED WORKFLOW JSON FORMAT', 'background: #222; color: #bada55; font-size: 20px');
  console.log('Starting agent:', startingAgent);
  console.log('Voices:', voices);
  console.log('Agents with collects:', agentsConfig);
  console.log(JSON.stringify(workflowJson, null, 2));
  
  return workflowJson;
};

// Force regeneration of workflow JSON before saving and testing
const forceRefreshWorkflowJson = (nodes: Node[], edges: Edge[], agents: Agent[] = []) => {
  console.log('Force refreshing workflow JSON with latest graph state');
  
  // First check if there are any direct connections from start node
  const startEdges = edges.filter(edge => edge.source === START_NODE_ID);
  if (startEdges.length === 0) {
    console.log('No start connections found during forced refresh');
    return null;
  }

  // Create a direct mapping from node IDs to agent key names for quick lookup
  const nodeIdToKeyMap = new Map<string, string>();
  
  // Build the node ID to key name mapping (similar to generateWorkflowJson)
  const agentNodes = nodes.filter(node => node.type === 'agent');
  agentNodes.forEach(agentNode => {
    const agentId = (agentNode.data as AgentNodeData).agentId;
    const agentData = agents.find(a => a.id === agentId);
    
    // Generate consistent key name from agent name
    const keyName = agentData?.name 
      ? agentData.name.toLowerCase().replace(/\s+/g, '') 
      : (agentNode.data as AgentNodeData).label.toLowerCase().replace(/\s+/g, '');
      
    nodeIdToKeyMap.set(agentNode.id, keyName);
    console.log(`Force refresh: Mapped node ${agentNode.id} to key ${keyName}`);
  });
  
  // Get the most recent start edge
  const startEdge = startEdges[startEdges.length - 1];
  const targetNodeId = startEdge.target;
  console.log('Force refresh: Target node ID from start edge:', targetNodeId);
  
  // First try to look up the key directly from node ID mapping
  const directMappedKey = nodeIdToKeyMap.get(targetNodeId);
  if (directMappedKey) {
    console.log('Force refresh: Found starting agent directly:', directMappedKey);
    return directMappedKey;
  }
  
  // Fall back to looking up the node and finding by agent ID
  const targetNode = nodes.find(n => n.id === targetNodeId);
  if (!targetNode || targetNode.type !== 'agent') {
    console.log('Force refresh: Target node is not an agent');
    return null;
  }

  const targetAgentId = (targetNode.data as AgentNodeData).agentId;
  const agentData = agents.find(a => a.id === targetAgentId);
  if (!agentData) {
    console.log('Force refresh: Agent data not found');
    return null;
  }

  // Use the agent name directly to generate the key
  const keyName = agentData.name.toLowerCase().replace(/\s+/g, '');
  console.log('Force refresh: Starting agent determined from name:', keyName);
  return keyName;
};

// Custom connection line with arrow
const CustomConnectionLine: ConnectionLineComponent = ({ 
  fromX, 
  fromY, 
  toX, 
  toY 
}) => {
  // Calculate angle for arrow rotation
  const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
  
  return (
    <g>
      <path
        fill="none"
        stroke="#888"
        strokeWidth={1.5}
        className="animated"
        d={`M${fromX},${fromY} C ${fromX + 50},${fromY} ${toX - 50},${toY} ${toX},${toY}`}
      />
      <polygon
        points={`${toX},${toY} ${toX-10},${toY-5} ${toX-10},${toY+5}`}
        fill="#888"
        transform={`rotate(${angle}, ${toX}, ${toY})`}
      />
    </g>
  );
};

const CreateWorkflowPage: NextPage = () => {
  const router = useRouter();
  const params = useParams();
  
  const id = params.id as string;
  console.log('ID:', id);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [workflowName, setWorkflowName] = useState('Banking Workflow');
  const [initialGreeting, setInitialGreeting] = useState('Welcome to our banking service. How can I help you today?');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [realAgents, setRealAgents] = useState<Agent[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    type: 'node' as 'node' | 'edge',
    id: '',
  });
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    entityId: '',
    entityType: 'node' as 'node' | 'edge',
  });
  
  // Edit dialogs state
  const [nodeEditDialog, setNodeEditDialog] = useState({
    isOpen: false,
    node: null as Node | null,
  });
  
  const [edgeEditDialog, setEdgeEditDialog] = useState({
    isOpen: false,
    edge: null as Edge | null,
  });
  
  // Edge condition modal state
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [currentCondition, setCurrentCondition] = useState<EdgeCondition>(emptyCondition());
  const [parameters, setParameters] = useState<EdgeConditionParameter[]>([]);
  
  // Track nodes that have position changes pending
  const [pendingPositionUpdates, setPendingPositionUpdates] = useState<Record<string, boolean>>({});
  const positionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep track of temporary to real edge ID mappings
  const [edgeIdMap, setEdgeIdMap] = useState<Map<string, string>>(new Map());
  
  // When a new edge is created in the backend, store the mapping
  const addEdgeIdMapping = useCallback((tempId: string, realId: string) => {
    setEdgeIdMap(prevMap => {
      const newMap = new Map(prevMap);
      newMap.set(tempId, realId);
      return newMap;
    });
  }, []);

  // Get the real edge ID from a temporary one
  const getRealEdgeId = useCallback((edgeId: string) => {
    if (!edgeId.startsWith('edge-')) {
      return edgeId; // Already a real ID
    }
    return edgeIdMap.get(edgeId) || edgeId;
  }, [edgeIdMap]);
  
  // Initial nodes - positioned horizontally with more space between them
  const initialNodes: Node<StartNodeData | EndNodeData>[] = [
    {
      id: START_NODE_ID,
      type: 'start',
      position: { x: 100, y: CANVAS_HEIGHT / 2 }, // Left side, middle height
      data: { label: 'Start' },
    },
    {
      id: END_NODE_ID,
      type: 'end',
      position: { x: CANVAS_WIDTH - 200, y: CANVAS_HEIGHT / 2 }, // Right side, middle height
      data: { label: 'End' },
    },
  ];
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setContextMenu({ ...contextMenu, show: false });
  }, [contextMenu]);
  
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    setSelectedNode(node);
    setSelectedEdge(null);
    
    // Don't show context menu for Start and End nodes
    if (node.id === START_NODE_ID || node.id === END_NODE_ID) {
      return;
    }
    
    // Show context menu
    setContextMenu({
      show: true,
      x: event.clientX,
      y: event.clientY,
      type: 'node',
      id: node.id,
    });
  }, []);
  
  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdge(edge);
    setSelectedNode(null);
    
    // Show context menu with the correct edge ID
    setContextMenu({
      show: true,
      x: event.clientX,
      y: event.clientY,
      type: 'edge',
      id: edge.id,
    });
  }, []);
  
  const handleEditNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // If it's an agent node, redirect to the agent edit page
    if (node.type === 'agent') {
      const agentData = node.data as AgentNodeData;
      if (agentData.agentId) {
        // Close the context menu
        setContextMenu({ ...contextMenu, show: false });
        // Navigate to the agent edit page
        router.push(`/agents/${agentData.agentId}`);
        return;
      }
    }
    
    // For other node types, open the edit dialog
    setNodeEditDialog({
      isOpen: true,
      node,
    });
    setContextMenu({ ...contextMenu, show: false });
  }, [nodes, contextMenu, router]);
  
  const handleEditEdge = useCallback(async (edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) return;

    if (workflowId) {
      try {
        // Fetch the latest edge data from the backend
        const edgeData = await workflowService.getWorkflowEdge(workflowId, edgeId);
        
        // Update the local edge with complete data from backend
        const completeEdge = {
          ...edge,
          data: {
            ...edge.data,
            condition: edgeData.condition,
            state: edgeData.state,
            label: edgeData.label,
            name: edgeData.condition?.name || edgeData.label || '',
            description: edgeData.condition?.description || '',
            parameters: edgeData.condition?.parameters || [],
            confirmation_required: edgeData.condition?.confirmation_required || false,
            response_type: edgeData.condition?.response_type || 'tuple',
          }
        };
        
        // Open the edit dialog with the updated edge
        setEdgeEditDialog({
          isOpen: true,
          edge: completeEdge as Edge,
        });
      } catch (error) {
        console.error('Error fetching edge data:', error);
        toast.error('Failed to load edge data');
        
        // Fallback to using local data
        setEdgeEditDialog({
          isOpen: true,
          edge,
        });
      }
    } else {
      // If we don't have a workflowId, just use local data
      setEdgeEditDialog({
        isOpen: true,
        edge,
      });
    }
    
    setContextMenu({ ...contextMenu, show: false });
  }, [edges, contextMenu, workflowId]);
  
  const handleDeleteConfirm = useCallback((entityId: string, entityType: 'node' | 'edge') => {
    let title = '';
    let message = '';
    
    if (entityType === 'node') {
      const node = nodes.find(n => n.id === entityId);
      if (!node) return;
      
      // Don't allow deleting start or end nodes
      if (node.id === START_NODE_ID || node.id === END_NODE_ID) {
        toast.error("Start and End nodes cannot be deleted");
        return;
      }
      
      title = 'Delete Node';
      message = `Are you sure you want to delete this ${node.type} node? All connections to and from this node will also be removed.`;
    } else if (entityType === 'edge') {
      const edge = edges.find(e => e.id === entityId);
      if (!edge) return;
      
      title = 'Delete Connection';
      message = 'Are you sure you want to delete this connection?';
    }
    
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      entityId,
      entityType,
    });
    setContextMenu({ ...contextMenu, show: false });
  }, [nodes, edges, contextMenu]);
  
  const handleDeleteEntity = useCallback(async () => {
    const { entityId, entityType } = confirmDialog;
    
    if (!workflowId) {
      // If we don't have a workflowId, just update the local state
      if (entityType === 'node') {
        // Delete the node and all connected edges
        setNodes(nodes.filter(n => n.id !== entityId));
        setEdges(edges.filter(e => e.source !== entityId && e.target !== entityId));
      } else if (entityType === 'edge') {
        // Delete just the edge
        setEdges(prev => prev.filter(e => e.id !== entityId));
      }
    } else {
      // If we have a workflowId, call the backend API
      try {
        if (entityType === 'node') {
          // Delete the node on the backend
          await workflowService.deleteWorkflowNode(workflowId, entityId);
          
          // Update local state
          setNodes(nodes.filter(n => n.id !== entityId));
          setEdges(edges.filter(e => e.source !== entityId && e.target !== entityId));
        } else if (entityType === 'edge') {
          // Get the real edge ID if it's a temporary one
          const realEdgeId = getRealEdgeId(entityId);
          
          // Check if we're dealing with a temporary edge ID without a mapping
          if (realEdgeId.startsWith('edge-') && !edgeIdMap.has(realEdgeId)) {
            // For edges with temporary IDs without mappings, just remove them from the local state
            // since they haven't been properly created on the backend yet
            setEdges(prev => prev.filter(e => e.id !== entityId));
          } else {
            // For edges with real UUIDs or mappings, delete on the backend
            await workflowService.deleteWorkflowEdge(workflowId, realEdgeId);
            
            // Update local state
            setEdges(prev => prev.filter(e => e.id !== entityId));
            
            // Remove the mapping if it exists
            if (edgeIdMap.has(entityId)) {
              setEdgeIdMap(prevMap => {
                const newMap = new Map(prevMap);
                newMap.delete(entityId);
                return newMap;
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error deleting ${entityType}:`, error);
        toast.error(`Failed to delete ${entityType}`);
      }
    }
    
    // Close the confirm dialog
    setConfirmDialog({
      ...confirmDialog,
      isOpen: false
    });
  }, [confirmDialog, nodes, edges, workflowId, getRealEdgeId, edgeIdMap]);
  
  const handleNodeDataSave = useCallback(async (nodeId: string, newData: any) => {
    // Update local state
    setNodes(prev => 
      prev.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );
    
    // If we have a workflowId, update on the backend
    if (workflowId) {
      try {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        // Get current position values
        const positionX = node.position.x;
        const positionY = node.position.y;
        
        console.log(`Updating node ${nodeId} in backend with position: (${positionX}, ${positionY})`);
        
        // Update node in backend
        await workflowService.updateWorkflowNode(workflowId, nodeId, {
          position_x: positionX,
          position_y: positionY,
          data: { ...node.data, ...newData },
          agent_id: node.type === 'agent' ? (node.data as AgentNodeData).agentId : null
        });
        
        toast.success('Node updated');
      } catch (error: any) {
        console.error('Error updating node:', error);
        
        // Check if it's a 404 error (node not found)
        const is404 = error.response?.status === 404;
        if (is404) {
          toast.error('Node not found in backend. It may have been deleted or had its ID changed.');
        } else {
          toast.error('Failed to update node on server');
        }
      }
    }
    
    setNodeEditDialog({ isOpen: false, node: null });
  }, [setNodes, workflowId, nodes]);
  
  const handleEdgeDataSave = useCallback(async (edgeId: string, newData: any) => {
    console.log('Saving edge data:', newData);
    
    // Preserve the connection points
    const sourceHandle = newData.sourceHandle;
    const targetHandle = newData.targetHandle;
    
    // Create a comprehensive data object that contains all properties
    // This ensures the edge data is consistent and will load correctly when editing
    const updatedData = {
      // Core properties for the tool
      name: newData.name,
      description: newData.description,
      label: newData.name, // Use name as the label for display
      response_type: newData.response_type || 'tuple',
      parameters: newData.parameters || [],
      confirmation_required: newData.confirmation_required || false,
      type: 'transition',
      
      // Connection points stored at root level
      sourceHandle,
      targetHandle,
      
      // State data with connection points
      state: {
        ...(newData.state || {}),
        sourceHandle,
        targetHandle
      },
      
      // Store the full object as condition as well for backend compatibility
      condition: {
        name: newData.name,
        description: newData.description,
        response_type: newData.response_type || 'tuple',
        parameters: newData.parameters || [],
        confirmation_required: newData.confirmation_required || false,
        type: 'transition',
        sourceHandle,
        targetHandle
      },
      
      // Store the full tool configuration for easier reload
      tool: {
        name: newData.name,
        description: newData.description,
        response_type: newData.response_type || 'tuple',
        parameters: newData.parameters || [],
        confirmation_required: newData.confirmation_required || false,
        state: {
          ...(newData.state || {}),
          sourceHandle,
          targetHandle
        }
      }
    };
    
    console.log('Updated edge data:', updatedData);
    
    // If we have a workflowId, update on the backend
    if (workflowId) {
      try {
        console.log('Sending to backend:', {
          condition: updatedData.condition,
          state: updatedData.state,
          label: updatedData.name
        });
        
        // Update edge in backend
        const updatedEdge = await workflowService.updateWorkflowEdge(workflowId, edgeId, {
          condition: updatedData.condition,
          state: updatedData.state,
          label: updatedData.name
        });
        
        console.log('Edge updated in backend, response:', updatedEdge);
        
        // Fetch the updated edge data from backend to ensure we have the latest data
        const refreshedEdge = await workflowService.getWorkflowEdge(workflowId, edgeId);
        console.log('Refreshed edge data from backend:', refreshedEdge);
        
        // Update the edge in local state with the fresh data from backend
        setEdges(prev => 
          prev.map(edge => 
            edge.id === edgeId ? { 
              ...edge, 
              data: {
                ...updatedData, // Keep our comprehensive local structure
                condition: refreshedEdge.condition, // Update with fresh backend data
                state: refreshedEdge.state, 
                label: refreshedEdge.label || updatedData.name,
              },
              sourceHandle,
              targetHandle,
              label: refreshedEdge.label || updatedData.name
            } : edge
          )
        );
      } catch (error) {
        console.error('Error updating edge:', error);
        toast.error('Failed to update edge on server');
        
        // Update local state only as fallback
        setEdges(prev => 
          prev.map(edge => 
            edge.id === edgeId ? { 
              ...edge, 
              data: updatedData,
              sourceHandle,
              targetHandle,
              label: updatedData.name
            } : edge
          )
        );
      }
    } else {
      // If no workflowId, just update local state
      setEdges(prev => 
        prev.map(edge => 
          edge.id === edgeId ? { 
            ...edge, 
            data: updatedData,
            sourceHandle,
            targetHandle,
            label: updatedData.name
          } : edge
        )
      );
    }
    
    setEdgeEditDialog({ isOpen: false, edge: null });
    toast.success('Connection updated');
  }, [setEdges, workflowId, edges]);
  
  const handleAddConditionToEdge = useCallback((edgeId: string) => {
    setCurrentCondition(emptyCondition());
    setParameters([]);
    setSelectedEdge(edges.find(e => e.id === edgeId) || null);
    setShowConditionModal(true);
  }, [edges]);
  
  // Handle edge connect event
  const onConnect = useCallback(async (params: Connection) => {
    // Get source and target nodes
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);
    
    if (!sourceNode || !targetNode) return;
    
    console.log('Connecting source node:', sourceNode.id, 'to target node:', targetNode.id);
    console.log('Connection params:', params);
    
    // Check if this is a connection from the start node
    const isFromStartNode = sourceNode.id === START_NODE_ID;
    
    // If connecting from start node, delete any existing edges from start node
    if (isFromStartNode) {
      console.log('Connecting from START node - will remove any existing start edges');
      
      // Find existing start connections
      const existingStartEdges = edges.filter(e => e.source === START_NODE_ID);
      
      // Remove existing start connections from backend & local state
      if (existingStartEdges.length > 0 && workflowId) {
        for (const edge of existingStartEdges) {
          try {
            // Convert temporary edge ID to real one if needed
            const realEdgeId = getRealEdgeId(edge.id);
            
            console.log(`Deleting existing start edge: ${realEdgeId}`);
            // Delete from backend
            await workflowService.deleteWorkflowEdge(workflowId, realEdgeId);
            
            // Update local state (will happen after the loop)
          } catch (error) {
            console.error(`Error deleting existing start edge ${edge.id}:`, error);
          }
        }
        
        // Remove all start edges from local state
        setEdges(edges => edges.filter(e => e.source !== START_NODE_ID));
      }
    }
    
    // Generate a temporary ID that we can reference until we get the real UUID from the backend
    const tempEdgeId = `edge-${params.source}-${params.target}-${Date.now()}`;
    
    // Preserve sourceHandle and targetHandle to maintain connection points
    const sourceHandle = params.sourceHandle;
    const targetHandle = params.targetHandle;
    
    console.log('Source handle:', sourceHandle);
    console.log('Target handle:', targetHandle);
    
    // Create a label based on node types
    let edgeLabel = "";
    
    // Create default name and description
    let name, description;
    if (sourceNode.type === 'start') {
      // For start node edges, clear all text
      name = "";
      description = "";
      edgeLabel = "";
      console.log('Creating start edge to:', targetNode.id, 'with no label');
    } else if (targetNode.type === 'end') {
      name = "End";
      description = `End the conversation after ${sourceNode.data.label}`;
    } else {
      // For agent-to-agent transitions
      const targetName = targetNode.data.label;
      name = `to_${targetName}`;
      description = `Transition from ${sourceNode.data.label} to ${targetNode.data.label}`;
    }
    
    // Create edge with consistent data format
    const newEdge = {
      ...params,
      id: tempEdgeId,
      type: 'conditional', // Use conditional type for all edges
      animated: true,
      sourceHandle,
      targetHandle,
      data: {
        label: name,
        name,
        description,
        type: 'transition',
        response_type: 'tuple',
        parameters: [],
        confirmation_required: false,
        state: {
          sourceHandle,
          targetHandle
        },
        sourceId: params.source,
        targetId: params.target,
        sourceName: sourceNode.data.label,
        targetName: targetNode.data.label,
        sourceNodeType: sourceNode.type,
        targetNodeType: targetNode.type,
        sourceHandle,
        targetHandle,
        // Include complete tool definition
        tool: {
          name,
          description,
          response_type: 'tuple',
          parameters: [],
          confirmation_required: false,
          sourceHandle,
          targetHandle,
          state: {
            sourceHandle,
            targetHandle
          }
        }
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#888',
      }
    };
    
    console.log('New edge to add:', newEdge);
    
    // Add the edge to local state
    setEdges((eds) => addEdge(newEdge, eds));
    
    // Create the edge in the backend if we have a workflowId
    if (workflowId) {
      try {
        // Create edge in backend
        const createdEdge = await workflowService.createWorkflowEdge(workflowId, {
          source_node_id: params.source || '',
          target_node_id: params.target || '',
          condition: {
            name,
            description,
            type: 'transition',
            parameters: [],
            response_type: 'tuple',
            confirmation_required: false,
            sourceHandle,
            targetHandle
          },
          state: {
            sourceHandle,
            targetHandle
          },
          label: name 
        });
        
        console.log('Edge created in backend:', createdEdge);
        
        // Store the mapping from temp ID to real UUID
        addEdgeIdMapping(tempEdgeId, createdEdge.id);
        
        // Fetch complete edge data to ensure we have the latest 
        const completeEdge = await workflowService.getWorkflowEdge(workflowId, createdEdge.id);
        console.log('Retrieved complete edge data:', completeEdge);
        
        // Replace the temporary ID with the real UUID from the backend
        // and include complete data from the backend
        setEdges(eds => 
          eds.map(e => 
            e.id === tempEdgeId ? { 
              ...e, 
              id: createdEdge.id,
              sourceHandle,
              targetHandle,
              data: {
                ...e.data,
                sourceHandle,
                targetHandle,
                // Include complete backend data
                condition: completeEdge.condition,
                state: completeEdge.state
              }
            } : e
          )
        );
        
        // No longer opening the edge edit dialog
      } catch (error) {
        console.error('Error creating edge:', error);
        toast.error('Failed to create connection on server');
        
        // Remove the edge from local state if backend creation failed
        setEdges(eds => eds.filter(e => e.id !== tempEdgeId));
      }
    }
  }, [nodes, setEdges, workflowId, addEdgeIdMapping, edges, getRealEdgeId]);
  
  // Handle drag start event
  const onDragStart = (event: React.DragEvent<HTMLDivElement>, agentId: string) => {
    // Find agent data from real agents list
    const agent = realAgents.find(a => a.id === agentId);
    if (!agent) return;
    
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: 'agent',
      agentId: agent.id,
      name: agent.name,
      description: agent.description || '',
    }));
    event.dataTransfer.effectAllowed = 'move';
    
    // Set drag image if needed
    const dragPreview = document.createElement('div');
    dragPreview.innerHTML = `<div class="bg-primary-100 text-primary-800 p-2 rounded border border-primary-300">${agent.name}</div>`;
    document.body.appendChild(dragPreview);
    event.dataTransfer.setDragImage(dragPreview, 75, 25);
    
    // Remove the preview after a short delay
    setTimeout(() => {
      document.body.removeChild(dragPreview);
    }, 0);
  };
  
  // Handle drop event
  const onDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds || !reactFlowInstance) return;

      const agentData = event.dataTransfer.getData('application/reactflow');
      if (!agentData) return;
      
      try {
        const { type, agentId, name, description } = JSON.parse(agentData);
        
        if (!agentId) return;

        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        // Generate a temporary ID for the node until we get the real ID from the backend
        const tempNodeId = `temp-${agentId}-${Date.now()}`;
        
        // Create the node with temporary ID
        const newNode: Node<AgentNodeData> = {
          id: tempNodeId,
          type,
          position,
          data: {
            label: name,
            agentId, // Keep the agent ID in the data
            description,
          },
        };

        // Add node to local state
        setNodes((nds) => nds.concat(newNode));
        
        // If we have a workflowId, create the node in the backend
        if (workflowId) {
          try {
            // Create node in backend
            const createdNode = await workflowService.createWorkflowNode(workflowId, {
              node_type: BackendNodeType.AGENT,
              position_x: position.x,
              position_y: position.y,
              agent_id: agentId,
              data: {
                label: name,
                description,
                agentId,
              }
            });
            
            console.log('Node created in backend:', createdNode);
            
            // Replace the temporary ID with the real UUID from the backend
            setNodes(nds => 
              nds.map(n => 
                n.id === tempNodeId ? 
                { ...n, id: createdNode.id } : 
                n
              )
            );
          } catch (error) {
            console.error('Error creating node:', error);
            toast.error('Failed to create node on server');
            
            // Remove the node from local state if backend creation failed
            setNodes(nds => nds.filter(n => n.id !== tempNodeId));
          }
        }
      } catch (error) {
        console.error('Error dropping node:', error);
      }
    },
    [reactFlowInstance, setNodes, workflowId]
  );
  
  // Add parameter to condition
  const handleAddParameter = () => {
    setParameters([...parameters, { name: '', description: '', type: 'string' }]);
  };
  
  // Remove parameter from condition
  const handleRemoveParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };
  
  // Update parameter data
  const handleParameterChange = (index: number, field: keyof EdgeConditionParameter, value: string) => {
    const updatedParameters = [...parameters];
    updatedParameters[index] = { ...updatedParameters[index], [field]: value };
    setParameters(updatedParameters);
  };
  
  // Save condition to edge
  const handleSaveCondition = () => {
    if (!selectedEdge) return;
    
    // Create updated condition with parameters
    const condition = {
      ...currentCondition,
      parameters
    };
    
    // Update edge data with condition and preserve state
    setEdges(edges.map(edge => {
      if (edge.id === selectedEdge.id) {
        // Preserve any existing state data
        const state = edge.data?.state || {};
        
        return {
          ...edge,
          data: {
            ...edge.data,
            condition: condition.name,
            tool: condition,
            state: state
          }
        };
      }
      return edge;
    }));
    
    // Close modal
    setShowConditionModal(false);
    setSelectedEdge(null);
  };

  // Handle drag over event
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  
  // Load agents from backend
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const agents = await agentService.getAgentsCompact();
        setRealAgents(agents.map(agent => ({
          ...agent,
          description: agent.description || ''  // Convert null to empty string
        })));
      } catch (error) {
        console.error('Error loading agents:', error);
        toast.error('Failed to load agents');
      }
    };
    
    loadAgents();
  }, []);
  
  // Load workflow from backend if ID is provided
  useEffect(() => {
    if (id && typeof id === 'string') {
      const loadWorkflow = async () => {
        setIsLoading(true);
        try {
          // Use the special editor endpoint to avoid agent validation issues
          const workflow = await workflowService.getWorkflowForEditor(id);
          setWorkflowId(workflow.id);
          setWorkflowName(workflow.name);
          
          if (workflow.initial_greeting) {
            setInitialGreeting(workflow.initial_greeting);
          }
          
          // If workflow has stored JSON format, update UI
          if (workflow.workflow_json) {
            console.log('Loaded workflow JSON:', workflow.workflow_json);
          }
          
          // Load nodes and edges to ReactFlow
          if (workflow.nodes && workflow.edges) {
            // Convert backend nodes to ReactFlow format
            const rfNodes = workflow.nodes.map(node => {
              let nodeType: string;
              let nodeData: any = { ...node.data };
              
              // Ensure node data has required properties based on node type
              if (!nodeData.label) {
                nodeData.label = node.node_type === BackendNodeType.START ? 'Start' : 
                                  node.node_type === BackendNodeType.END ? 'End' : 
                                  node.node_type === BackendNodeType.AGENT && node.agent ? node.agent.name : 'Node';
              }
              
              switch (node.node_type) {
                case BackendNodeType.START:
                  nodeType = 'start';
                  break;
                case BackendNodeType.END:
                  nodeType = 'end';
                  break;
                case BackendNodeType.AGENT:
                  nodeType = 'agent';
                  // Add agentId to data for agent nodes
                  if (node.agent_id) {
                    nodeData.agentId = node.agent_id;
                  } else if (node.agent && node.agent.id) {
                    nodeData.agentId = node.agent.id;
                  }
                  break;
                default:
                  nodeType = 'custom';
              }
              
              return {
                id: node.id,
                type: nodeType,
                position: { x: node.position_x, y: node.position_y },
                data: nodeData,
              };
            });
            
            // Convert backend edges to ReactFlow format
            const rfEdges = workflow.edges.map(edge => {
              // Extract edge data from condition and state
              const condition = edge.condition || {};
              const state = edge.state || {};
              const sourceHandle = state.sourceHandle || condition.sourceHandle || null;
              const targetHandle = state.targetHandle || condition.targetHandle || null;
              
              // Find source and target nodes
              const sourceNode = workflow.nodes.find(n => n.id === edge.source_node_id);
              const targetNode = workflow.nodes.find(n => n.id === edge.target_node_id);
              
              // Determine node types for frontend
              const sourceNodeType = sourceNode?.node_type === BackendNodeType.START ? 'start' :
                                   sourceNode?.node_type === BackendNodeType.END ? 'end' :
                                   sourceNode?.node_type === BackendNodeType.AGENT ? 'agent' : 'custom';
              const targetNodeType = targetNode?.node_type === BackendNodeType.START ? 'start' :
                                   targetNode?.node_type === BackendNodeType.END ? 'end' :
                                   targetNode?.node_type === BackendNodeType.AGENT ? 'agent' : 'custom';
              
              // Create label based on connection type
              let label = edge.label || condition.name || '';
              let name = condition.name || edge.label || '';
              let description = condition.description || '';
              
              if (sourceNode && targetNode && sourceNode.node_type === BackendNodeType.START) {
                // Clear ALL text fields for start node edges
                label = '';
                name = '';
                description = '';
              }
              
              // Create a comprehensive data object that includes all tool properties
              const edgeData = {
                // Basic properties
                label,
                name,
                description,
                // Tool configuration
                response_type: condition.response_type || 'tuple',
                parameters: condition.parameters || [],
                confirmation_required: condition.confirmation_required || false,
                type: condition.type || 'transition',
                // Connection points in multiple places for safety
                sourceHandle,
                targetHandle,
                // Add node type information for edge display logic
                sourceId: edge.source_node_id,
                targetId: edge.target_node_id,
                sourceName: sourceNode?.data?.label || (sourceNode?.node_type === BackendNodeType.START ? 'Start' : sourceNode?.node_type === BackendNodeType.END ? 'End' : 'Node'),
                targetName: targetNode?.data?.label || (targetNode?.node_type === BackendNodeType.START ? 'Start' : targetNode?.node_type === BackendNodeType.END ? 'End' : 'Node'),
                sourceNodeType,
                targetNodeType,
                // Full objects
                state: {
                  ...state,
                  sourceHandle, 
                  targetHandle
                },
                // Store the condition object directly
                condition: sourceNode?.node_type === BackendNodeType.START ? {} : {
                  ...condition,
                  sourceHandle,
                  targetHandle
                },
                // Store full tool configuration for easier access
                tool: {
                  name: sourceNode?.node_type === BackendNodeType.START ? '' : (condition.name || edge.label || ''),
                  description: sourceNode?.node_type === BackendNodeType.START ? '' : (condition.description || ''),
                  response_type: condition.response_type || 'tuple',
                  parameters: condition.parameters || [],
                  confirmation_required: condition.confirmation_required || false,
                  type: condition.type || 'transition',
                  state: {
                    ...state,
                    sourceHandle,
                    targetHandle
                  },
                  sourceHandle,
                  targetHandle
                }
              };
              
              return {
                id: edge.id,
                source: edge.source_node_id,
                target: edge.target_node_id,
                type: 'conditional',
                sourceHandle,
                targetHandle,
                label, // Use edge label for display
                data: edgeData,
                animated: true,
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20,
                  color: '#888',
                },
              };
            });
            
            // Set nodes and edges (type assertion since we've ensured the data is correct)
            setNodes(rfNodes as any);
            setEdges(rfEdges as any);
          }
          
          toast.success('Workflow loaded successfully');
        } catch (error) {
          console.error('Error loading workflow:', error);
          toast.error('Failed to load workflow');
        } finally {
          setIsLoading(false);
        }
      };
      
      loadWorkflow();
    }
  }, [id, setNodes, setEdges]);
  
  // Save workflow logic
  const handleSave = async () => {
    try {
      setSavingStatus('saving');
      
      // First ensure we're working with the latest edge state
      console.log('Updating workflow with latest edges:', edges);
      
      // Generate workflow JSON with real agents and current edge state
      // const workflowJson = await workflowService.generateWorkflowJsonFromDb(String(workflowId));
      
      // Force refresh the starting agent before saving
      const forcedStartingAgent = forceRefreshWorkflowJson(nodes, edges, realAgents);
      // if (forcedStartingAgent) {
      //   // Override the starting_agent if we have a forced refresh value
      //   workflowJson.starting_agent = forcedStartingAgent;
      //   console.log('Overriding starting agent to:', forcedStartingAgent);
      // }
      
      // // Log the generated JSON for debugging
      // console.log('%c FINAL WORKFLOW JSON FORMAT', 'background: #222; color: #bada55; font-size: 20px');
      // console.log('Starting agent:', workflowJson.starting_agent);
      // console.log('Voices:', workflowJson.voices);
      // console.log('Agents with collects:', workflowJson.agents);
      // console.log(JSON.stringify(workflowJson, null, 2));
      
      // Map ReactFlow nodes to backend node format
      const backendNodes = nodes.map(node => {
        let nodeType: BackendNodeType;
        switch (node.type) {
          case 'start':
            nodeType = BackendNodeType.START;
            break;
          case 'end':
            nodeType = BackendNodeType.END;
            break;
          case 'agent':
            nodeType = BackendNodeType.AGENT;
            break;
          default:
            nodeType = BackendNodeType.GREETING;
        }
        
        return {
          node_type: nodeType,
          position_x: node.position.x,
          position_y: node.position.y,
          agent_id: node.type === 'agent' ? (node.data as AgentNodeData).agentId : null,
          data: node.data
        };
      });
      
      // Map ReactFlow edges to backend edge format
      const backendEdges = edges.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (!sourceNode || !targetNode) {
          throw new Error(`Could not find source or target node for edge ${edge.id}`);
        }
        
        return {
          source_node_id: edge.source,
          target_node_id: edge.target,
          condition: edge.data?.condition || {},
          state: edge.data?.state || {},
          label: edge.data?.label || null
        };
      });
      
      if (workflowId) {
        // Update existing workflow
        await workflowService.updateWorkflow(workflowId, {
          name: workflowName,
          initial_greeting: initialGreeting,
          workflow_json: {}
        });
        
        // Update all nodes to ensure positions are saved
        const updatePromises = nodes.map(node => 
          workflowService.updateWorkflowNode(workflowId, node.id, {
            position_x: node.position.x,
            position_y: node.position.y,
            data: node.data,
            agent_id: node.type === 'agent' ? (node.data as AgentNodeData).agentId : null
          })
        );
        
        await Promise.all(updatePromises);
        
        // No need to update edges as they follow node positions
        
        setSavingStatus('saved');
        toast.success('Workflow updated successfully!');
        
        // Refresh edge data from backend to ensure everything is in sync
        await refreshWorkflowEdges();
      } else {
        // Create new workflow
        const workflow = await workflowService.createWorkflow({
          name: workflowName,
          initial_greeting: initialGreeting,
          workflow_json: {}
        });
        
        setWorkflowId(workflow.id);
        
        // Create all nodes
        const nodeIdMap = new Map();
        
        // Create nodes one by one to properly map IDs
        for (const node of backendNodes) {
          try {
            const createdNode = await workflowService.createWorkflowNode(workflow.id, node);
            // Store mapping from original node ID to backend node ID
            const originalId = node.node_type === BackendNodeType.AGENT 
              ? node.agent_id 
              : (node.node_type === BackendNodeType.START ? START_NODE_ID : END_NODE_ID);
              
            if (originalId) {
              nodeIdMap.set(originalId, createdNode.id);
            }
          } catch (error) {
            console.error('Error creating node:', error);
          }
        }
        
        // Create all edges, now that we have node IDs
        for (const edge of backendEdges) {
          try {
            // Use mapped IDs for source and target
            const sourceId = nodeIdMap.get(edge.source_node_id) || edge.source_node_id;
            const targetId = nodeIdMap.get(edge.target_node_id) || edge.target_node_id;
            
            await workflowService.createWorkflowEdge(workflow.id, {
              source_node_id: sourceId,
              target_node_id: targetId,
              condition: edge.condition,
              state: edge.state || {},  // Add empty state object if not present
              label: edge.label
            });
          } catch (error) {
            console.error('Error creating edge:', error);
          }
        }

        // Update nodes with correct IDs from backend
        setNodes(nodes => nodes.map(node => {
          // If we have a mapping for this node ID, use the backend ID
          const backendNodeId = nodeIdMap.get(node.id);
          if (backendNodeId) {
            return { ...node, id: backendNodeId };
          }
          return node;
        }));
        
        setSavingStatus('saved');
        toast.success('Workflow created successfully!');
        
        // Refresh edge data from backend for the newly created workflow
        await refreshWorkflowEdges();
      }
      
      // Reset status after a delay
      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving workflow:', error);
      setSavingStatus('error');
      toast.error('Failed to save workflow');
    }
  };
  
  // Handle test workflow logic
  const handleTest = async () => {
    if (!workflowId) {
      toast.error('Please save the workflow first');
      return;
    }

    try {
      // First check if a process is already running
      const processStatus = await workflowService.checkWorkflowProcessStatus(workflowId);
      
      // If a process is already running, terminate it first
      if (processStatus.status === 'running') {
        toast.loading('Terminating existing process...', { 
          duration: 1000,
          style: {
            background: '#FEF2F2',
            color: '#DC2626',
            borderColor: '#FECACA',
            borderLeftWidth: '4px',
          },
          icon: '⏱️'
        });
        await workflowService.terminateWorkflowProcess(workflowId);
        
        // Small delay to ensure process is terminated
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Now save any pending changes
      await handleSave();

      // Call backend to start workflow test using database-generated JSON
      console.log('Starting workflow test using backend-generated JSON...');
      const testResponse = await workflowService.startWorkflowTest(workflowId);
      console.log('Workflow test server started:', testResponse);

      // Show success message
      toast.success('Workflow test server started successfully');

      // Navigate to test page
      router.push(`/workflows/${workflowId}/page`);
    } catch (error) {
      console.error('Error starting workflow test:', error);
      
      // Fallback to frontend-generated JSON if database approach fails
      try {
        console.log('Falling back to frontend-generated JSON...');
        
        // Generate workflow JSON with real agents
        const workflowJson = generateWorkflowJson(workflowName, nodes, edges, initialGreeting, realAgents);
        
        // Force refresh the starting agent before testing
        const forcedStartingAgent = forceRefreshWorkflowJson(nodes, edges, realAgents);
        if (forcedStartingAgent) {
          // Override the starting_agent if we have a forced refresh value
          workflowJson.starting_agent = forcedStartingAgent;
          console.log('Overriding starting agent for test to:', forcedStartingAgent);
        }

        // Start the workflow test server with the generated JSON
        const testResponse = await workflowService.startWorkflowTest(workflowId, workflowJson);
        console.log('Workflow test server started with frontend JSON:', testResponse);

        // Show success message
        toast.success('Workflow test server started successfully (using frontend JSON)');

        // Navigate to test page
        router.push(`/workflows/${workflowId}/test`);
      } catch (fallbackError) {
        console.error('Error with fallback method:', fallbackError);
        toast.error('Failed to start workflow test server');
      }
    }
  };
  
  // Handle initial greeting change
  const handleInitialGreetingChange = (greeting: string) => {
    setInitialGreeting(greeting);
  };
  
  // Filtered agents based on search query
  const filteredAgents = realAgents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Set up event listeners for edge configuration and deletion events
  useEffect(() => {
    // Handler function for edge configuration events
    const handleEdgeConfigureEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.edgeId) {
        const edgeId = customEvent.detail.edgeId;
        const edge = edges.find(e => e.id === edgeId);
        if (edge) {
          handleEditEdge(edgeId);
        }
      }
    };
    
    // Handler function for edge deletion events
    const handleEdgeDeleteEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.edgeId) {
        const edgeId = customEvent.detail.edgeId;
        handleDeleteConfirm(edgeId, 'edge');
      }
    };
    
    // Add event listeners
    window.addEventListener('edge:configure', handleEdgeConfigureEvent);
    window.addEventListener('edge:delete', handleEdgeDeleteEvent);
    
    // Cleanup
    return () => {
      window.removeEventListener('edge:configure', handleEdgeConfigureEvent);
      window.removeEventListener('edge:delete', handleEdgeDeleteEvent);
    };
  }, [edges, handleEditEdge, handleDeleteConfirm]);
  
  // Handle node position changes with debouncing
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // First apply changes to local state
    onNodesChange(changes);
    
    // Only process position changes that are completed (not during dragging)
    const positionChanges = changes.filter(
      (change): change is NodePositionChange => 
        change.type === 'position' && change.dragging === false
    );
    
    if (positionChanges.length === 0 || !workflowId) return;
    
    // Mark nodes with position changes
    const updatedPendingNodes = { ...pendingPositionUpdates };
    positionChanges.forEach(change => {
      // Skip start and end nodes if they shouldn't be movable
      const node = nodes.find(n => n.id === change.id);
      if (!node) return;
      
      updatedPendingNodes[change.id] = true;
    });
    setPendingPositionUpdates(updatedPendingNodes);
    
    // Clear any existing timeout
    if (positionUpdateTimeoutRef.current) {
      clearTimeout(positionUpdateTimeoutRef.current);
    }
    
    // Set a new timeout to save positions after 500ms of inactivity
    positionUpdateTimeoutRef.current = setTimeout(async () => {
      // Get current node positions
      const nodesToUpdate = nodes.filter(node => updatedPendingNodes[node.id]);
      
      if (nodesToUpdate.length === 0) return;
      
      console.log(`Updating positions for ${nodesToUpdate.length} nodes`);
      
      // Keep track of nodes that failed to update
      const failedNodes = new Set<string>();
      
      // Save each node position to backend
      try {
        // Update nodes one by one with error handling
        for (const node of nodesToUpdate) {
          try {
            await workflowService.updateWorkflowNode(workflowId!, node.id, {
              position_x: node.position.x,
              position_y: node.position.y,
              // Preserve existing node data
              data: node.data,
              // Include agent_id for agent nodes
              agent_id: node.type === 'agent' ? (node.data as AgentNodeData).agentId : null
            });
            console.log(`Successfully updated node ${node.id} position`);
          } catch (error: any) {
            console.error(`Error updating node ${node.id} position:`, error);
            failedNodes.add(node.id);
            // Don't show toast for individual failures to avoid spamming
          }
        }
        
        // Only show a toast if there were failures
        if (failedNodes.size > 0) {
          const nodeCount = failedNodes.size;
          toast.error(`Failed to update ${nodeCount} node${nodeCount > 1 ? 's' : ''}`);
        }
        
        // Clear pending updates for successful nodes
        const updatedPending = { ...pendingPositionUpdates };
        for (const nodeId of Object.keys(updatedPending)) {
          if (!failedNodes.has(nodeId)) {
            delete updatedPending[nodeId];
          }
        }
        setPendingPositionUpdates(updatedPending);
        
        console.log(`Updated positions for ${nodesToUpdate.length - failedNodes.size} nodes`);
      } catch (error) {
        console.error('Error updating node positions:', error);
        // Don't show toast to avoid spamming the user
      }
    }, 500);
  }, [onNodesChange, pendingPositionUpdates, nodes, workflowId]);
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (positionUpdateTimeoutRef.current) {
        clearTimeout(positionUpdateTimeoutRef.current);
      }
    };
  }, []);
  
  // Handle edge update from Edge Edit Dialog
  const handleUpdateEdge = useCallback((edgeId: string, data: any) => {
    // Convert temporary edge ID to real one if needed
    const realEdgeId = getRealEdgeId(edgeId);
    
    // If it's still a temporary ID and we don't have a mapping, skip the update
    if (realEdgeId.startsWith('edge-') && !edgeIdMap.has(realEdgeId)) {
      console.warn('Attempted to update an edge with a temporary ID:', edgeId);
      setEdgeEditDialog({
        isOpen: false,
        edge: null
      });
      return;
    }
    
    // Get the existing edge to preserve connection points
    const existingEdge = edges.find(e => e.id === edgeId);
    if (!existingEdge) {
      console.warn('Edge not found for update:', edgeId);
      setEdgeEditDialog({
        isOpen: false,
        edge: null
      });
      return;
    }
    
    // Preserve sourceHandle and targetHandle
    const sourceHandle = existingEdge.sourceHandle || data.state?.sourceHandle || null;
    const targetHandle = existingEdge.targetHandle || data.state?.targetHandle || null;
    
    // Make sure these values are saved in the state
    const updatedState = {
      ...(data.state || {}),
      sourceHandle,
      targetHandle
    };
    
    // Update edge locally with preserved connection points
    setEdges(eds => 
      eds.map(e => e.id === edgeId ? { 
        ...e, 
        data: { ...data, state: updatedState },
        sourceHandle,
        targetHandle
      } : e)
    );
    
    // Update on backend if we have a workflowId
    if (workflowId) {
      // Extract condition from data for backend
      const condition = { ...data };
      // Add connection points to condition for extra safety
      condition.sourceHandle = sourceHandle;
      condition.targetHandle = targetHandle;
      
      // Remove state from condition to avoid duplication
      if (condition.state) {
        delete condition.state;
      }
      
      workflowService.updateWorkflowEdge(workflowId, realEdgeId, {
        condition: condition,
        state: updatedState,
        label: data.label || null
      }).catch(error => {
        console.error('Error updating edge:', error);
        toast.error('Failed to update connection');
      });
    }
    
    // Close the edge edit dialog
    setEdgeEditDialog({
      isOpen: false,
      edge: null
    });
  }, [workflowId, edges, setEdges, getRealEdgeId, edgeIdMap]);
  
  // Function to refresh all edges for a workflow from the backend
  const refreshWorkflowEdges = useCallback(async () => {
    if (!workflowId) return;
    
    try {
      console.log('Refreshing all edges from backend');
      const backendEdges = await workflowService.getWorkflowEdges(workflowId);
      console.log('Retrieved edges from backend:', backendEdges);
      
      // Update each edge in local state with data from backend
      setEdges(currentEdges => {
        return currentEdges.map(edge => {
          // Find matching backend edge
          const backendEdge = backendEdges.find(be => be.id === edge.id);
          if (!backendEdge) return edge; // Keep edge if no backend data found
          
          // Find source and target nodes to get their types
          const sourceNode = nodes.find(n => n.id === edge.source);
          const targetNode = nodes.find(n => n.id === edge.target);
          
          // Extract connection points from various possible locations
          // First try edge directly, then data object, then state object
          const sourceHandle = 
            edge.sourceHandle || 
            edge.data?.sourceHandle || 
            edge.data?.state?.sourceHandle ||
            backendEdge.state?.sourceHandle ||
            backendEdge.condition?.sourceHandle;
            
          const targetHandle = 
            edge.targetHandle || 
            edge.data?.targetHandle || 
            edge.data?.state?.targetHandle ||
            backendEdge.state?.targetHandle ||
            backendEdge.condition?.targetHandle;
          
          console.log(`Refreshing edge ${edge.id} with source handle: ${sourceHandle}, target handle: ${targetHandle}`);
          
          // Ensure state object has the connection points
          const updatedState = {
            ...(backendEdge.state || {}),
            sourceHandle,
            targetHandle
          };
          
          // Ensure condition object has the connection points
          const updatedCondition = {
            ...(backendEdge.condition || {}),
            sourceHandle,
            targetHandle
          };
          
          // Update with backend data but preserve React Flow properties
          return {
            ...edge,
            sourceHandle,
            targetHandle,
            data: {
              ...edge.data,
              condition: updatedCondition,
              state: updatedState,
              label: backendEdge.label || edge.data.label,
              name: backendEdge.condition?.name || backendEdge.label || edge.data.name || '',
              description: backendEdge.condition?.description || edge.data.description || '',
              parameters: backendEdge.condition?.parameters || [],
              confirmation_required: backendEdge.condition?.confirmation_required || false,
              sourceHandle,
              targetHandle,
              // Include node type information for edge display logic
              sourceId: edge.source,
              targetId: edge.target,
              sourceName: sourceNode?.data?.label || 'Node',
              targetName: targetNode?.data?.label || 'Node',
              sourceNodeType: sourceNode?.type || 'custom',
              targetNodeType: targetNode?.type || 'custom',
            }
          };
        });
      });
      
      console.log('Edges refreshed successfully');
    } catch (error) {
      console.error('Error refreshing edges:', error);
    }
  }, [workflowId, setEdges, nodes]);
  
  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold mr-4">
              {workflowId ? 'Edit Workflow' : 'Create Workflow'}
            </h1>
            <Input
              className="w-64"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Workflow Name"
            />
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={!workflowId || isLoading}
            >
              Test Workflow
            </Button>
            <Button
              onClick={handleSave}
              disabled={savingStatus === 'saving' || isLoading}
            >
              {savingStatus === 'saving' ? 'Saving...' : 
               savingStatus === 'saved' ? 'Saved!' : 'Save Workflow'}
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-lg">Loading workflow...</p>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            <AgentSidebar 
              agents={realAgents} 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onDragStart={onDragStart}
            />
            
            <div className="flex-1 h-full">
              <ReactFlowProvider>
                <div className="h-full" ref={reactFlowWrapper}>
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onPaneClick={handlePaneClick}
                    onNodeClick={handleNodeClick}
                    onEdgeClick={handleEdgeClick}
                    nodeTypes={nodeTypes as NodeTypes}
                    edgeTypes={edgeTypes}
                    connectionLineComponent={CustomConnectionLine}
                    connectionLineType={ConnectionLineType.Bezier}
                    defaultEdgeOptions={{
                      type: 'conditional',
                      markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: '#888',
                      },
                    }}
                    fitView
                  >
                    <Controls />
                    <MiniMap />
                    <Background gap={16} color="#f8fafc" />
                  </ReactFlow>
                </div>
              </ReactFlowProvider>
            </div>
          </div>
        )}
        
        {/* Context Menu */}
        <ContextMenu 
          show={contextMenu.show}
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          onEditClick={() => contextMenu.type === 'node' 
            ? handleEditNode(contextMenu.id) 
            : handleEditEdge(contextMenu.id)
          }
          onDeleteClick={() => handleDeleteConfirm(contextMenu.id, contextMenu.type)}
          onClose={() => setContextMenu({ ...contextMenu, show: false })}
        />
        
        {/* Confirm Delete Dialog */}
        <ConfirmDialog 
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={handleDeleteEntity}
          onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        />
        
        {/* Node Edit Dialog */}
        <NodeEditDialog 
          isOpen={nodeEditDialog.isOpen}
          node={nodeEditDialog.node as Node}
          onClose={() => setNodeEditDialog({ isOpen: false, node: null })}
          onSave={handleNodeDataSave}
        />
      </div>
    </MainLayout>
  );
};

export default CreateWorkflowPage; 