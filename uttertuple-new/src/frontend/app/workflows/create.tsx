'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Phone, PlayCircle } from 'lucide-react';

import MainLayout from '../../components/layout/MainLayout';
import { nodeTypes } from '../../components/workflows/WorkflowNodes';
import { edgeTypes } from '../../components/workflows/EdgeLabel';
import AgentSidebar from '../../components/workflows/AgentSidebar';
import WorkflowControls from '../../components/workflows/WorkflowControls';
import ContextMenu from '../../components/workflows/ContextMenu';
import ConfirmDialog from '../../components/workflows/ConfirmDialog';
import NodeEditDialog from '../../components/workflows/NodeEditDialog';
import EdgeEditDialog from '../../components/workflows/EdgeEditDialog';
import EdgeConditionPopup from '../../components/workflows/EdgeConditionPopup';
import { Agent, StartNodeData, EndNodeData, AgentNodeData, DecisionNodeData } from '../../types/workflow';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Select from '../../components/ui/Select';
import { PlusCircle, GitBranch, Trash, X, Plus, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import workflowService, { NodeType as BackendNodeType } from '@/services/workflow';
import agentService from '../../services/agent';
import { useTheme } from '../../contexts/ThemeContext';
import { storeWorkflowJson } from '@/utils/workflowStorage';

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
  const { darkMode } = useTheme();
  
  // Calculate angle for arrow rotation
  const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
  
  return (
    <g>
      <path
        fill="none"
        stroke={darkMode ? "#aaa" : "#888"}
        strokeWidth={1.5}
        className="animated"
        d={`M${fromX},${fromY} C ${fromX + 50},${fromY} ${toX - 50},${toY} ${toX},${toY}`}
      />
      <polygon
        points={`${toX},${toY} ${toX-10},${toY-5} ${toX-10},${toY+5}`}
        fill={darkMode ? "#aaa" : "#888"}
        transform={`rotate(${angle}, ${toX}, ${toY})`}
      />
    </g>
  );
};

const CreateWorkflowPage: NextPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id'); // Get workflow ID from URL if present
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [workflowName, setWorkflowName] = useState('Banking Workflow');
  const [initialGreeting, setInitialGreeting] = useState('Welcome to our banking service. How can I help you today?');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [autoSaveIndicator, setAutoSaveIndicator] = useState<string | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [realAgents, setRealAgents] = useState<Agent[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { darkMode } = useTheme();
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    type: 'node' as 'node' | 'edge',
    id: '',
    nodeType: '' as string | undefined,
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
  
  // Edge edit dialog state
  const [edgeEditDialog, setEdgeEditDialog] = useState<{
    isOpen: boolean;
    edge: Edge | null;
  }>({
    isOpen: false,
    edge: null,
  });
  
  // Edge condition popup state
  const [edgeConditionPopup, setEdgeConditionPopup] = useState<{
    isOpen: boolean;
    edge: Edge | null;
  }>({
    isOpen: false,
    edge: null,
  });
  
  // Add Node popup state
  const [showAddNodePopup, setShowAddNodePopup] = useState(false);
  const [addNodePosition, setAddNodePosition] = useState({ x: 0, y: 0 });
  
  // Edge condition modal state
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [currentCondition, setCurrentCondition] = useState<EdgeCondition>(emptyCondition());
  const [parameters, setParameters] = useState<EdgeConditionParameter[]>([]);
  
  // Track nodes that have position changes pending
  const [pendingPositionUpdates, setPendingPositionUpdates] = useState<Record<string, boolean>>({});
  const positionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep track of temporary to real edge ID mappings
  const [edgeIdMap, setEdgeIdMap] = useState<Map<string, string>>(new Map());
  
  // Refs for debouncing
  const workflowNameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialGreetingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
    // Removed End node - it should only be added when needed
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
    
    // Determine node type for context menu
    let nodeType = node.type;
    if (node.id === START_NODE_ID) {
      nodeType = 'start';
    } else if (node.id === END_NODE_ID) {
      nodeType = 'end';
    }
    
    // Show context menu for all nodes
    setContextMenu({
      show: true,
      x: event.clientX,
      y: event.clientY,
      type: 'node',
      id: node.id,
      nodeType: nodeType,
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
      nodeType: undefined,
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
  
  // Handle adding or editing a condition for an edge
  const handleAddCondition = useCallback(async (edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) return;
    
    if (workflowId) {
      try {
        // Fetch the latest edge data from the backend
        const edgeData = await workflowService.getWorkflowEdge(workflowId, edgeId);
        
        // Check if there's an existing condition with description
        const hasCondition = edgeData.condition && 
                        typeof edgeData.condition === 'object' && 
                        'description' in edgeData.condition && 
                        !!edgeData.condition.description;
        
        // Update the local edge with complete data from backend
        const completeEdge = {
          ...edge,
          data: {
            ...edge.data,
            conditionType: 'AI',
            aiPrompt: edgeData.condition?.description || '',
            hasCondition: hasCondition
          }
        };
        
        // Open the condition popup with the updated edge
        setEdgeConditionPopup({
          isOpen: true,
          edge: completeEdge as Edge,
        });
      } catch (error) {
        console.error('Error fetching edge condition data:', error);
        toast.error('Failed to load edge condition data');
        
        // Fallback to using local data
        setEdgeConditionPopup({
          isOpen: true,
          edge,
        });
      }
    } else {
      // If we don't have a workflowId, just use local data
      setEdgeConditionPopup({
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
  
  const handleEdgeDataSave = useCallback(async (edgeId: string, data: any) => {
    // Find the existing edge
    const existingEdge = edges.find(e => e.id === edgeId);
    if (!existingEdge) {
      console.error('Edge not found:', edgeId);
      return;
    }
    
    // Get the real edge ID (in case it's a temporary one)
    const realEdgeId = getRealEdgeId(edgeId);
    
    // Preserve sourceHandle and targetHandle
    const sourceHandle = existingEdge.sourceHandle || data.state?.sourceHandle || null;
    const targetHandle = existingEdge.targetHandle || data.state?.targetHandle || null;
    
    // Make sure these values are saved in the state
    const updatedState = {
      ...(data.state || {}),
      sourceHandle,
      targetHandle,
      type: data.type || data.name || 'condition' // Preserve type in state
    };
    
    // Update edge locally with preserved connection points
    setEdges(eds => 
      eds.map(e => e.id === edgeId ? { 
        ...e, 
        data: { 
          ...data,
          type: data.type || data.name || 'condition', // Preserve type in edge data
          state: updatedState,
          condition: {
            ...data,
            type: data.type || data.name || 'condition', // Preserve type in condition
            sourceHandle,
            targetHandle
          }
        },
        sourceHandle,
        targetHandle
      } : e)
    );
    
    // Update on backend if we have a workflowId
    if (workflowId) {
      // Extract condition from data for backend
      const condition = { 
        ...data,
        type: data.type || data.name || 'condition', // Preserve type in backend condition
        sourceHandle,
        targetHandle
      };
      
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
    let label = "";
    
    // Create default name and description
    let name, description;
    if (sourceNode.type === 'start') {
      name = "Start";
      description = `Start the conversation with ${targetNode.data.label}`;
      console.log('Creating start edge to:', targetNode.id, 'with label:', targetNode.data.label);
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
        sourceNodeType: sourceNode.type, // Add source node type
        targetNodeType: targetNode.type, // Add target node type
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

        // Find the full agent data from realAgents
        const agent = realAgents.find(a => a.id === agentId);
        if (!agent) {
          console.error('Agent not found in realAgents:', agentId);
          return;
        }

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
            // Add comprehensive agent data for enhanced display
            llm_model: agent.llm_model,
            llm_provider_id: agent.llm_provider_id,
            tts_provider: agent.tts_config?.provider,
            tts_provider_id: agent.tts_provider_id,
            voice_id: agent.voice_id || undefined,
            rag_count: agent.rag_config?.length || 0,
            tools_count: agent.tools?.length || 0,
            collection_fields_count: agent.collection_fields?.length || 0,
            tts_config: agent.tts_config,
            rag_config: agent.rag_config,
            tools: agent.tools,
            collection_fields: agent.collection_fields,
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
    [reactFlowInstance, setNodes, workflowId, realAgents]
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
        // Use getAgents() instead of getAgentsCompact() to get full agent data
        const agents = await agentService.getAgents();
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
                    
                    // Find the full agent data and enhance the node data
                    const agent = realAgents.find(a => a.id === node.agent_id);
                    if (agent) {
                      nodeData.llm_model = agent.llm_model;
                      nodeData.llm_provider_id = agent.llm_provider_id;
                      nodeData.tts_provider = agent.tts_config?.provider;
                      nodeData.tts_provider_id = agent.tts_provider_id;
                      nodeData.voice_id = agent.voice_id || undefined;
                      nodeData.rag_count = agent.rag_config?.length || 0;
                      nodeData.tools_count = agent.tools?.length || 0;
                      nodeData.collection_fields_count = agent.collection_fields?.length || 0;
                      nodeData.tts_config = agent.tts_config;
                      nodeData.rag_config = agent.rag_config;
                      nodeData.tools = agent.tools;
                      nodeData.collection_fields = agent.collection_fields;
                    }
                  } else if (node.agent && node.agent.id) {
                    nodeData.agentId = node.agent.id;
                    
                    // Find the full agent data and enhance the node data
                    const agent = realAgents.find(a => a.id === node.agent?.id);
                    if (agent) {
                      nodeData.llm_model = agent.llm_model;
                      nodeData.llm_provider_id = agent.llm_provider_id;
                      nodeData.tts_provider = agent.tts_config?.provider;
                      nodeData.tts_provider_id = agent.tts_provider_id;
                      nodeData.voice_id = agent.voice_id || undefined;
                      nodeData.rag_count = agent.rag_config?.length || 0;
                      nodeData.tools_count = agent.tools?.length || 0;
                      nodeData.collection_fields_count = agent.collection_fields?.length || 0;
                      nodeData.tts_config = agent.tts_config;
                      nodeData.rag_config = agent.rag_config;
                      nodeData.tools = agent.tools;
                      nodeData.collection_fields = agent.collection_fields;
                    }
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
                // Preserve the original condition type or use the condition name as type
                type: condition.type || condition.name || 'condition',
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
                  targetHandle,
                  type: condition.type || condition.name || 'condition' // Preserve type in state
                },
                // Store the condition object directly with all properties
                condition: sourceNode?.node_type === BackendNodeType.START ? {} : {
                  ...condition,
                  sourceHandle,
                  targetHandle,
                  type: condition.type || condition.name || 'condition' // Ensure type is preserved
                },
                // Store full tool configuration for easier access
                tool: {
                  name: sourceNode?.node_type === BackendNodeType.START ? '' : (condition.name || edge.label || ''),
                  description: sourceNode?.node_type === BackendNodeType.START ? '' : (condition.description || ''),
                  response_type: condition.response_type || 'tuple',
                  parameters: condition.parameters || [],
                  confirmation_required: condition.confirmation_required || false,
                  type: condition.type || condition.name || 'condition', // Preserve type in tool config
                  state: {
                    ...state,
                    sourceHandle,
                    targetHandle,
                    type: condition.type || condition.name || 'condition' // Preserve type in tool state
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
  }, [id, setNodes, setEdges, realAgents]);
  
  // Handle workflow name changes with auto-save
  const handleWorkflowNameChange = useCallback((name: string) => {
    setWorkflowName(name);
    
    // Don't auto-save if we don't have a workflow ID yet
    if (!workflowId) return;
    
    // Clear any existing timeout
    if (workflowNameTimeoutRef.current) {
      clearTimeout(workflowNameTimeoutRef.current);
    }
    
    setAutoSaveIndicator('Saving...');
    
    // Set a new timeout to save name after 1 second of inactivity
    workflowNameTimeoutRef.current = setTimeout(async () => {
      try {
        await workflowService.updateWorkflow(workflowId, {
          name: name
        });
        
        setAutoSaveIndicator('Saved');
        
        // Clear indicator after 2 seconds
        setTimeout(() => {
          setAutoSaveIndicator(null);
        }, 2000);
      } catch (error) {
        console.error('Error updating workflow name:', error);
        setAutoSaveIndicator('Error saving');
        
        // Clear indicator after 2 seconds
        setTimeout(() => {
          setAutoSaveIndicator(null);
        }, 2000);
      }
    }, 1000);
  }, [workflowId]);
  
  // Handle initial greeting changes with auto-save
  const handleInitialGreetingChange = useCallback((greeting: string) => {
    setInitialGreeting(greeting);
    
    // Don't auto-save if we don't have a workflow ID yet
    if (!workflowId) return;
    
    // Clear any existing timeout
    if (initialGreetingTimeoutRef.current) {
      clearTimeout(initialGreetingTimeoutRef.current);
    }
    
    setAutoSaveIndicator('Saving...');
    
    // Set a new timeout to save greeting after 1 second of inactivity
    initialGreetingTimeoutRef.current = setTimeout(async () => {
      try {
        await workflowService.updateWorkflow(workflowId, {
          initial_greeting: greeting
        });
        
        setAutoSaveIndicator('Saved');
        
        // Clear indicator after 2 seconds
        setTimeout(() => {
          setAutoSaveIndicator(null);
        }, 2000);
      } catch (error) {
        console.error('Error updating initial greeting:', error);
        setAutoSaveIndicator('Error saving');
        
        // Clear indicator after 2 seconds
        setTimeout(() => {
          setAutoSaveIndicator(null);
        }, 2000);
      }
    }, 1000);
  }, [workflowId]);
  
  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (workflowNameTimeoutRef.current) {
        clearTimeout(workflowNameTimeoutRef.current);
      }
      if (initialGreetingTimeoutRef.current) {
        clearTimeout(initialGreetingTimeoutRef.current);
      }
      if (positionUpdateTimeoutRef.current) {
        clearTimeout(positionUpdateTimeoutRef.current);
      }
    };
  }, []);
  
  // Create new workflow when needed
  const createNewWorkflow = useCallback(async () => {
    if (workflowId) return; // Already have a workflow
    
    try {
      setAutoSaveIndicator('Creating workflow...');
      
      // Create new workflow
      const workflow = await workflowService.createWorkflow({
        name: workflowName,
        initial_greeting: initialGreeting,
        workflow_json: generateWorkflowJson(workflowName, nodes, edges, initialGreeting, realAgents)
      });
      
      setWorkflowId(workflow.id);
      
      // Make sure we have start and end nodes initialized
      const backendNodes = nodes.map(node => {
        // Determine node type for backend
        let nodeType: BackendNodeType;
        if (node.id === START_NODE_ID || node.type === 'start') {
          nodeType = BackendNodeType.START;
        } else if (node.id === END_NODE_ID || node.type === 'end') {
          nodeType = BackendNodeType.END;
        } else if (node.type === 'agent') {
          nodeType = BackendNodeType.AGENT;
        } else {
          nodeType = BackendNodeType.AGENT; // Default to agent type
        }
        
        return {
          node_type: nodeType,
          position_x: node.position.x,
          position_y: node.position.y,
          agent_id: node.type === 'agent' ? (node.data as AgentNodeData).agentId : null,
          data: {
            ...node.data,
            label: node.data.label || (nodeType === BackendNodeType.START ? 'Start' : nodeType === BackendNodeType.END ? 'End' : 'Node')
          }
        };
      });
      
      // If we don't already have start and end nodes, add them
      const hasStartNode = backendNodes.some(node => node.node_type === BackendNodeType.START);
      const hasEndNode = backendNodes.some(node => node.node_type === BackendNodeType.END);
      
      if (!hasStartNode) {
        backendNodes.push({
          node_type: BackendNodeType.START,
          position_x: 100,
          position_y: CANVAS_HEIGHT / 2,
          agent_id: null,
          data: { label: 'Start' }
        });
      }
      
      if (!hasEndNode) {
        backendNodes.push({
          node_type: BackendNodeType.END,
          position_x: CANVAS_WIDTH - 200,
          position_y: CANVAS_HEIGHT / 2,
          agent_id: null,
          data: { label: 'End' }
        });
      }
      
      // Create nodes one by one to properly map IDs
      const nodeIdMap = new Map();
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
      
      setAutoSaveIndicator('Workflow created');
      toast.success('Workflow created successfully');
      
      // Clear indicator after 2 seconds
      setTimeout(() => {
        setAutoSaveIndicator(null);
      }, 2000);
      
      // Redirect to the workflow edit page with the new ID
      router.push(`/workflows/create?id=${workflow.id}`);
    } catch (error) {
      console.error('Error creating workflow:', error);
      setAutoSaveIndicator('Error creating workflow');
      toast.error('Failed to create workflow');
      
      // Clear indicator after 2 seconds
      setTimeout(() => {
        setAutoSaveIndicator(null);
      }, 2000);
    }
  }, [workflowId, workflowName, initialGreeting, nodes, edges, realAgents, router]);
  
  // Auto-create workflow when an agent is added or dropped
  useEffect(() => {
    // If we already have a workflow ID, no need to auto-create
    if (workflowId) return;
    
    // If we have agent nodes, create the workflow
    const hasAgentNodes = nodes.some(node => node.type === 'agent');
    if (hasAgentNodes) {
      createNewWorkflow();
    }
  }, [workflowId, nodes, createNewWorkflow]);
  
  // Handle test workflow logic
  const handleTest = async () => {
    if (!workflowId) {
      // Try to create the workflow if it doesn't exist
      await createNewWorkflow();
      if (!workflowId) {
        toast.error('Please create the workflow first');
        return;
      }
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
      await createNewWorkflow();

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
    
    // Handler function for edge condition events
    const handleEdgeConditionEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.edgeId) {
        const edgeId = customEvent.detail.edgeId;
        handleAddCondition(edgeId);
      }
    };
    
    // Add event listeners
    window.addEventListener('edge:configure', handleEdgeConfigureEvent);
    window.addEventListener('edge:delete', handleEdgeDeleteEvent);
    window.addEventListener('edge:condition', handleEdgeConditionEvent);
    
    // Cleanup
    return () => {
      window.removeEventListener('edge:configure', handleEdgeConfigureEvent);
      window.removeEventListener('edge:delete', handleEdgeDeleteEvent);
      window.removeEventListener('edge:condition', handleEdgeConditionEvent);
    };
  }, [edges, handleEditEdge, handleDeleteConfirm, handleAddCondition]);
  
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
            backendEdge.state?.sourceHandle;
            
          const targetHandle = 
            edge.targetHandle || 
            edge.data?.targetHandle || 
            edge.data?.state?.targetHandle ||
            backendEdge.state?.targetHandle;
          
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
  
  const toggleAdvancedSettings = () => {
    setShowAdvanced(!showAdvanced);
  };

  // Handle saving the workflow
  const handleSaveWorkflow = async () => {
    // Only proceed if workflow ID exists
    if (!workflowId) return;
    
    try {
      setSavingStatus('saving');
      
      // Generate current workflow JSON
      const workflowJson = generateWorkflowJson(
        workflowName,
        nodes,
        edges,
        initialGreeting,
        realAgents
      );
      
      // Update the workflow in the database
      await workflowService.updateWorkflow(workflowId, {
        name: workflowName,
        initial_greeting: initialGreeting,
        workflow_json: workflowJson
      });
      
      setSavingStatus('saved');
      
      // Reset to idle after a short delay
      setTimeout(() => {
        setSavingStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error saving workflow:', error);
      setSavingStatus('error');
      
      // Reset to idle after a short delay
      setTimeout(() => {
        setSavingStatus('idle');
      }, 2000);
    }
  };

  // Handle zoom to fit the flow
  const handleZoomToFit = () => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 });
    }
  };
  
  // Handle context menu edit action
  const handleContextMenuEdit = (id: string) => {
    // Check if it's a node or an edge based on contextMenu.type
    if (contextMenu.type === 'node') {
      const node = nodes.find(node => node.id === id);
      if (node) {
        setNodeEditDialog({
          isOpen: true,
          node: node
        });
      }
    } else if (contextMenu.type === 'edge') {
      const edge = edges.find(edge => edge.id === id);
      if (edge) {
        setEdgeEditDialog({
          isOpen: true,
          edge: edge
        });
      }
    }
    
    // Close the context menu
    setContextMenu({ ...contextMenu, show: false });
  };
  
  // Handle context menu delete action
  const handleContextMenuDelete = (id: string) => {
    // Determine if we're deleting a node or an edge
    const entityType = contextMenu.type;
    const entityId = id;
    
    // Set up the confirmation dialog
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${entityType}`,
      message: `Are you sure you want to delete this ${entityType}?`,
      entityType,
      entityId
    });
    
    // Close the context menu
    setContextMenu({ ...contextMenu, show: false });
  };
  
  // Handle confirmation dialog confirm action
  const handleConfirmDialogConfirm = async () => {
    const { entityType, entityId } = confirmDialog;
    
    if (!entityId || !workflowId) {
      setConfirmDialog({ ...confirmDialog, isOpen: false });
      return;
    }
    
    try {
      if (entityType === 'node') {
        // Delete the node
        await workflowService.deleteWorkflowNode(workflowId, entityId);
        
        // Remove the node from the local state
        setNodes(nodes => nodes.filter(node => node.id !== entityId));
        
        // Also remove any connected edges
        setEdges(edges => edges.filter(edge => 
          edge.source !== entityId && edge.target !== entityId
        ));
      } else if (entityType === 'edge') {
        // For edges, we need to handle the backend ID vs frontend ID
        const edge = edges.find(e => e.id === entityId);
        if (edge) {
          const realEdgeId = edge.data?.backendId || entityId;
          
          // Delete the edge
          await workflowService.deleteWorkflowEdge(workflowId, realEdgeId);
          
          // Remove the edge from the local state
          setEdges(edges => edges.filter(edge => edge.id !== entityId));
        }
      }
      
      toast.success(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting ${entityType}:`, error);
      toast.error(`Failed to delete ${entityType}`);
    }
    
    // Close the confirmation dialog
    setConfirmDialog({ ...confirmDialog, isOpen: false });
  };
  
  // Handle node edit save
  const handleNodeEditSave = async (nodeId: string, data: any) => {
    // Find the node to update
    const nodeIndex = nodes.findIndex(node => node.id === nodeId);
    if (nodeIndex === -1) return;
    
    // Update the node locally
    const updatedNodes = [...nodes];
    updatedNodes[nodeIndex] = {
      ...updatedNodes[nodeIndex],
      data: {
        ...updatedNodes[nodeIndex].data,
        ...data
      }
    };
    
    setNodes(updatedNodes);
    
    // Update in the backend if we have a workflow ID
    if (workflowId) {
      try {
        await workflowService.updateWorkflowNode(workflowId, nodeId, {
          data: updatedNodes[nodeIndex].data
        });
      } catch (error) {
        console.error('Error updating node:', error);
        toast.error('Failed to update node');
      }
    }
    
    // Close the dialog
    setNodeEditDialog({ isOpen: false, node: null });
  };
  
  // Handle edge edit save
  const handleEdgeEditSave = async (edgeId: string, data: any) => {
    // Find the edge to update
    const edgeIndex = edges.findIndex(edge => edge.id === edgeId);
    if (edgeIndex === -1) return;
    
    // Update the edge locally
    const updatedEdges = [...edges];
    updatedEdges[edgeIndex] = {
      ...updatedEdges[edgeIndex],
      data: {
        ...updatedEdges[edgeIndex].data,
        ...data
      },
      label: data.name || data.label
    };
    
    setEdges(updatedEdges);
    
    // Update in the backend if we have a workflow ID
    if (workflowId) {
      try {
        const realEdgeId = updatedEdges[edgeIndex].data?.backendId || edgeId;
        
        // Convert to backend format
        const backendData = {
          label: data.name || data.label,
          condition: {
            name: data.name,
            description: data.description,
            response_type: data.response_type,
            parameters: data.parameters,
            confirmation_required: data.confirmation_required
          },
          state: data.state || {}
        };
        
        workflowService.updateWorkflowEdge(workflowId, realEdgeId, backendData);
      } catch (error) {
        console.error('Error updating edge:', error);
        toast.error('Failed to update edge');
      }
    }
    
    // Close the dialog
    setEdgeEditDialog({ isOpen: false, edge: null });
  };
  
  // Handle saving an edge condition
  const handleSaveEdgeCondition = async (edgeId: string, conditionData: { type: string, aiPrompt: string }) => {
    // Find the edge to update
    const edgeIndex = edges.findIndex(edge => edge.id === edgeId);
    if (edgeIndex === -1) return;
    
    // Create a label from the prompt (truncate if too long)
    const edgeLabel = conditionData.aiPrompt.length > 20 
      ? conditionData.aiPrompt.substring(0, 20) + '...' 
      : conditionData.aiPrompt;
    
    // Update the edge locally
    const updatedEdges = [...edges];
    updatedEdges[edgeIndex] = {
      ...updatedEdges[edgeIndex],
      data: {
        ...updatedEdges[edgeIndex].data,
        conditionType: conditionData.type,
        aiPrompt: conditionData.aiPrompt,
        hasCondition: true,
        // Store the condition properly so EdgeLabel can display it immediately
        condition: {
          name: 'AI Condition',
          description: conditionData.aiPrompt, // Full prompt for display
          response_type: 'ai',
          parameters: [],
          confirmation_required: false
        },
        // Also set label and name to the full prompt for immediate display
        label: conditionData.aiPrompt,
        name: conditionData.aiPrompt
      },
      // Set the edge label to the full prompt for immediate display
      label: conditionData.aiPrompt
    };
    
    setEdges(updatedEdges);
    
    // Update in the backend if we have a workflow ID
    if (workflowId) {
      try {
        const realEdgeId = updatedEdges[edgeIndex].data?.backendId || edgeId;
        
        // Convert to backend format - explicitly type as string to avoid ReactNode typing issues
        const backendData = {
          label: conditionData.aiPrompt, // Use full prompt as label
          condition: {
            name: 'AI Condition',
            description: conditionData.aiPrompt,
            response_type: 'ai',
            parameters: [],
            confirmation_required: false
          }
        };
        
        await workflowService.updateWorkflowEdge(workflowId, realEdgeId, backendData);
        toast.success('Edge condition saved successfully');
      } catch (error) {
        console.error('Error updating edge condition:', error);
        toast.error('Failed to update edge condition');
      }
    }
    
    // Close the dialog
    setEdgeConditionPopup({ isOpen: false, edge: null });
  };
  
  // Check if an edge has a condition
  const hasEdgeCondition = useCallback((edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge || !edge.data) return false;
    
    // Check if has hasCondition flag
    if (edge.data.hasCondition) return true;
    
    // Check condition in data
    if (edge.data.condition && 
        typeof edge.data.condition === 'object' && 
        'description' in edge.data.condition && 
        !!edge.data.condition.description) {
      return true;
    }
    
    return false;
  }, [edges]);
  
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  
  // Function to handle opening the Add Node popup
  const handleOpenAddNodePopup = useCallback(() => {
    // Show the popup (no longer setting position based on mouse click)
    setShowAddNodePopup(true);
  }, []);
  
  // Function to handle clicking outside the popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAddNodePopup) {
        // Check if the click was outside the popup
        const popupElement = document.getElementById('add-node-popup');
        // Also check if it's not the add node button that was clicked
        const addNodeButton = document.getElementById('add-node-button');
        
        const isOutsidePopup = popupElement && !popupElement.contains(event.target as HTMLElement);
        const isAddNodeButton = addNodeButton && (addNodeButton === event.target || addNodeButton.contains(event.target as HTMLElement));
        
        // Close the popup if click is outside and not on the add node button
        if (isOutsidePopup && !isAddNodeButton) {
          setShowAddNodePopup(false);
        }
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddNodePopup]);
  
  // Function to handle adding a new node from the popup
  const handleAddNode = async (nodeType: 'api-request' | 'end-call' | 'transfer-call') => {
    if (!reactFlowInstance || !workflowId) {
      toast.error("Cannot add node at this time");
      return;
    }
    
    // Find the end node position to place new nodes nearby
    const endNode = nodes.find(n => n.id === END_NODE_ID);
    let posX = CANVAS_WIDTH - 350; // Default x position near end node
    let posY = CANVAS_HEIGHT / 2 - 100; // Default y position above end node
    
    if (endNode) {
      posX = endNode.position.x - 200; // Position to the left of end node
      posY = endNode.position.y - 100; // Position above end node
    }
    
    try {
      let nodeData: any = {};
      let backendNodeType = BackendNodeType.END;
      let frontendNodeType = 'end';
      
      switch (nodeType) {
        case 'api-request':
          backendNodeType = BackendNodeType.AGENT; // Using AGENT type as custom
          frontendNodeType = 'custom';
          nodeData = {
            label: 'API Request',
            nodeType: 'api-request',
            endpoint: 'No URL specified',
            method: 'POST'
          };
          break;
        
        case 'end-call':
          backendNodeType = BackendNodeType.END;
          frontendNodeType = 'end';
          nodeData = { label: 'End Call' };
          break;
          
        case 'transfer-call':
          backendNodeType = BackendNodeType.AGENT; // Using AGENT type as custom
          frontendNodeType = 'custom';
          nodeData = {
            label: 'Transfer Call',
            nodeType: 'transfer-call',
            transferTo: ''
          };
          break;
      }
      
      // Create node in backend
      const newNode = await workflowService.createWorkflowNode(workflowId, {
        node_type: backendNodeType,
        position_x: posX,
        position_y: posY,
        data: nodeData
      });
      
      // Add node to the UI
      setNodes(prev => [...prev, {
        id: newNode.id,
        type: frontendNodeType,
        position: { x: posX, y: posY },
        data: nodeData
      }]);
      
      toast.success(`Added ${nodeType.replace('-', ' ')} node`);
    } catch (error) {
      console.error(`Error adding ${nodeType} node:`, error);
      toast.error(`Failed to add ${nodeType.replace('-', ' ')} node`);
    } finally {
      setShowAddNodePopup(false);
    }
  };
  
  // Handle run workflow button click
  const handleRunWorkflow = async (workflowId: string) => {
    setSavingStatus('saving');
    
    try {
      // Generate workflow JSON from the database
      const workflowJson = await workflowService.generateWorkflowJsonFromDb(workflowId);
      
      // Store the workflow JSON in session storage instead of query parameters
      storeWorkflowJson(workflowId, workflowJson);
      
      // Navigate to the run workflow page with only the workflowId
      router.push(`/runworkflow?workflowId=${workflowId}`);
    } catch (err) {
      console.error('Error preparing workflow execution:', err);
      toast.error('Failed to prepare workflow for execution');
      setSavingStatus('error');
    } finally {
      setSavingStatus('idle');
    }
  };
  
  return (
    <MainLayout>
      {/* Custom CSS for the workflow editor */}
      <style jsx global>{`
        .react-flow__controls-button {
          background: ${darkMode ? '#1e293b' : '#fafafa'};
          border-color: ${darkMode ? '#334155' : '#e2e8f0'};
          color: ${darkMode ? '#f1f5f9' : '#334155'};
        }
        
        .react-flow__controls-button:hover {
          background: ${darkMode ? '#334155' : '#f1f5f9'};
        }
        
        .react-flow__controls-button svg {
          fill: ${darkMode ? '#94a3b8' : '#64748b'};
        }
        
        .react-flow__attribution {
          background: ${darkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)'};
          color: ${darkMode ? '#94a3b8' : '#64748b'};
        }
        
        .react-flow__edge-path {
          stroke: ${darkMode ? '#94a3b8' : '#64748b'};
        }
        
        .react-flow__handle {
          background: ${darkMode ? '#60a5fa' : '#3b82f6'};
          border-color: ${darkMode ? '#1e3a8a' : '#1d4ed8'};
        }
        
        .react-flow__node {
          color: ${darkMode ? '#f8fafc' : '#0f172a'};
        }
        
        .react-flow__minimap {
          background-color: ${darkMode ? '#1e293b' : '#f8fafc'};
        }
        
        .react-flow__minimap-mask {
          fill: ${darkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(100, 116, 139, 0.1)'};
        }
        
        .react-flow__minimap-node {
          fill: ${darkMode ? '#475569' : '#94a3b8'};
          stroke: ${darkMode ? '#94a3b8' : '#475569'};
        }
        
        .react-flow__panel {
          background: ${darkMode ? '#0f172a' : '#ffffff'};
          border-color: ${darkMode ? '#334155' : '#e2e8f0'};
        }
        
        .react-flow__panel.bottom .react-flow__controls-button {
          border-bottom-color: ${darkMode ? '#334155' : '#e2e8f0'};
        }
        
        .react-flow__panel.top .react-flow__controls-button {
          border-top-color: ${darkMode ? '#334155' : '#e2e8f0'};
        }
        
        .react-flow__selection {
          background: ${darkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.08)'};
          border-color: ${darkMode ? '#3b82f6' : '#3b82f6'};
        }
        
        .react-flow__selection-rect {
          filter: ${darkMode ? 'drop-shadow(0 0 1px #93c5fd)' : 'drop-shadow(0 0 1px #3b82f6)'};
          border-color: ${darkMode ? '#3b82f6' : '#3b82f6'};
        }
      `}</style>
      
      <div className={`flex h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Left sidebar for agents */}
        <div className={`w-72 border-r overflow-y-auto ${
          darkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="p-4">
            <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Available Agents
            </h2>
            <div className={`relative mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full py-2 pl-8 pr-3 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'
                }`}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`absolute left-2.5 top-2.5 h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            
            {/* List of agents */}
            <div className="space-y-3">
              {realAgents
                .filter((agent) =>
                  searchQuery === '' ||
                  agent.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((agent) => (
                  <div
                    key={agent.id}
                    draggable
                    onDragStart={(event) => onDragStart(event, agent.id)}
                    className={`p-4 border rounded-lg cursor-move transition-colors ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {/* Agent Header */}
                    <div className={`flex items-start mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {/* Agent icon/avatar */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        darkMode ? 'bg-blue-800 text-blue-100' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="ml-3 flex-1 min-w-0">
                        <h3 className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {agent.name}
                        </h3>
                        <p className={`text-xs mt-1 line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {agent.instructions || agent.description || 'No instructions provided'}
                        </p>
                      </div>
                    </div>

                    {/* Agent Details Grid */}
                    <div className="space-y-2">
                      {/* LLM Model */}
                      <div className={`flex justify-between items-center py-1 ${
                        darkMode ? 'border-gray-600' : 'border-gray-200'
                      }`}>
                        <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          LLM Model:
                        </span>
                        <span className={`text-xs ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          {agent.llm_model || 'Not configured'}
                        </span>
                      </div>

                      {/* TTS Model - Hide when LLM is openai-realtime */}
                      {agent.llm_model !== 'openai-realtime' && (
                        <div className={`flex justify-between items-center py-1 ${
                          darkMode ? 'border-gray-600' : 'border-gray-200'
                        }`}>
                          <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            TTS:
                          </span>
                          <span className={`text-xs ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                            {agent.tts_config?.provider || (agent.voice_id ? 'Configured' : 'Not configured')}
                          </span>
                        </div>
                      )}

                      {/* Voice */}
                      <div className={`flex justify-between items-center py-1 ${
                        darkMode ? 'border-gray-600' : 'border-gray-200'
                      }`}>
                        <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Voice:
                        </span>
                        <span className={`text-xs ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          {agent.voice_id || agent.tts_config?.voice || 'Default'}
                        </span>
                      </div>

                      {/* RAG Config */}
                      <div className={`flex justify-between items-center py-1 ${
                        darkMode ? 'border-gray-600' : 'border-gray-200'
                      }`}>
                        <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          RAG:
                        </span>
                        <span className={`text-xs ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          {agent.rag_config && agent.rag_config.length > 0 
                            ? `${agent.rag_config.length} database${agent.rag_config.length > 1 ? 's' : ''}`
                            : 'Not configured'
                          }
                        </span>
                      </div>

                      {/* Tools */}
                      <div className={`flex justify-between items-center py-1 ${
                        darkMode ? 'border-gray-600' : 'border-gray-200'
                      }`}>
                        <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Tools:
                        </span>
                        <span className={`text-xs ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          {agent.tools && agent.tools.length > 0 
                            ? `${agent.tools.length} tool${agent.tools.length > 1 ? 's' : ''}`
                            : 'None'
                          }
                        </span>
                      </div>

                      {/* Collection Fields */}
                      {agent.collection_fields && agent.collection_fields.length > 0 && (
                        <div className={`flex justify-between items-center py-1 ${
                          darkMode ? 'border-gray-600' : 'border-gray-200'
                        }`}>
                          <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Fields:
                          </span>
                          <span className={`text-xs ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                            {agent.collection_fields.length} field{agent.collection_fields.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status Indicator */}
                    <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            (agent.llm_model && (agent.voice_id || agent.tts_config)) 
                              ? 'bg-green-500' 
                              : agent.llm_model 
                                ? 'bg-yellow-500' 
                                : 'bg-red-500'
                          }`}></div>
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {(agent.llm_model && (agent.voice_id || agent.tts_config)) 
                              ? 'Fully configured' 
                              : agent.llm_model 
                                ? 'Partially configured' 
                                : 'Needs configuration'
                            }
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          darkMode 
                            ? 'bg-gray-600 text-gray-300' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          Drag to add
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
        
        {/* Main workflow area */}
        <div className="flex-1 flex flex-col relative">
          {/* Workflow name and controls */}
          <div className={`border-b p-4 flex justify-between items-center ${
            darkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex flex-col w-1/2">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => handleWorkflowNameChange(e.target.value)}
                className={`text-xl font-semibold ${
                  darkMode 
                    ? 'bg-gray-800 text-white border-none focus:outline-none' 
                    : 'bg-white text-gray-900 border-none focus:outline-none'
                }`}
                placeholder="Enter workflow name"
              />
              <p className={`text-sm mt-1 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {workflowId ? `ID: ${workflowId}` : 'New workflow - Save to get an ID'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Save indicator */}
              {autoSaveIndicator && (
                <span className={`text-sm px-3 py-1 rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {autoSaveIndicator}
                </span>
              )}
              
                              {/* Run Workflow button */}
                <button
                 onClick={() => workflowId ? handleRunWorkflow(workflowId) : null}
                  className={`flex items-center px-4 py-2 rounded-md ${
                  darkMode 
                    ? 'bg-blue-700 hover:bg-blue-800 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                disabled={!workflowId || isLoading}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Run Workflow
              </button>
              
              {/* Test workflow button - Removed as requested */}
              {/* <button
                onClick={handleTest}
                className={`flex items-center px-4 py-2 rounded-md ${
                  darkMode 
                    ? 'bg-green-700 hover:bg-green-800 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
                disabled={isLoading}
              >
                <Phone className="w-4 h-4 mr-2" />
                {isLoading ? 'Starting...' : 'Start Call'}
              </button> */}
              
              {/* Save workflow button */}
              {/* <button
                onClick={handleSaveWorkflow}
                className={`flex items-center px-4 py-2 rounded-md ${
                  darkMode 
                    ? 'bg-blue-700 hover:bg-blue-800 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                disabled={savingStatus === 'saving'}
              >
                {savingStatus === 'saving' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path>
                    </svg>
                    Save Workflow
                  </>
                )}
              </button> */}
            </div>
          </div>
          
          {/* Workflow canvas */}
          <div className="flex-1 overflow-hidden relative" ref={reactFlowWrapper}>
            <ReactFlowProvider>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={setReactFlowInstance}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                onPaneClick={handlePaneClick}
                connectionLineComponent={CustomConnectionLine}
                connectionLineType={ConnectionLineType.SmoothStep}
                defaultEdgeOptions={{
                  type: 'custom',
                  style: { strokeWidth: 2 },
                  markerEnd: { type: MarkerType.ArrowClosed },
                }}
                fitView
              >
                {/* Background with dots */}
                <Background
                  gap={12}
                  size={1}
                  color={darkMode ? '#334155' : '#cbd5e1'}
                  style={{ backgroundColor: darkMode ? '#0f172a' : '#f8fafc' }}
                />
                
                {/* Controls */}
                <Controls 
                  position="bottom-right"
                  style={{
                    backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                    borderColor: darkMode ? '#334155' : '#e2e8f0'
                  }}
                />
                
                {/* Minimap */}
                <MiniMap
                  nodeStrokeWidth={3}
                  nodeStrokeColor="#fff"
                  nodeBorderRadius={2}
                  style={{
                    backgroundColor: darkMode ? '#1e293b' : '#f8fafc',
                    maskImage: darkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(100, 116, 139, 0.1)'
                  }}
                />
                
                {/* Additional controls */}
                <Panel position="top-right">
                  <div className={`p-2 rounded-md shadow ${
                    darkMode 
                      ? 'bg-gray-800 border border-gray-700' 
                      : 'bg-white border border-gray-200'
                  }`}>
                    <button
                      onClick={handleZoomToFit}
                      className={`p-2 rounded hover:bg-opacity-50 ${
                        darkMode 
                          ? 'text-white hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                    </button>
                  </div>
                </Panel>
                
                {/* Add Node button */}
                <Panel position="top-left" className="mt-2 ml-2">
                  <Button
                    id="add-node-button"
                    variant="primary" 
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700"
                    onClick={handleOpenAddNodePopup}
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> Add a Node
                  </Button>
                </Panel>
              </ReactFlow>
            </ReactFlowProvider>
            
            {/* Context menu */}
            {contextMenu.show && (
              <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                type={contextMenu.type}
                id={contextMenu.id}
                nodeType={contextMenu.nodeType}
                onEditClick={handleContextMenuEdit}
                onDeleteClick={handleContextMenuDelete}
                onAddConditionClick={contextMenu.type === 'edge' ? handleAddCondition : undefined}
                hasCondition={contextMenu.id ? hasEdgeCondition(contextMenu.id) : false}
                onClose={() => setContextMenu({ ...contextMenu, show: false })}
                darkMode={darkMode}
              />
            )}
          </div>
          
          {/* Bottom panel for initial greeting - REMOVED */}
        </div>
      </div>
      
      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={handleConfirmDialogConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        darkMode={darkMode}
      />
      
      {/* Node edit dialog */}
      {nodeEditDialog.isOpen && nodeEditDialog.node && (
        <NodeEditDialog
          isOpen={nodeEditDialog.isOpen}
          node={nodeEditDialog.node}
          onClose={() => setNodeEditDialog({ isOpen: false, node: null })}
          onSave={handleNodeEditSave}
          darkMode={darkMode}
        />
      )}
      
      {/* Edge edit dialog */}
      {edgeEditDialog.isOpen && edgeEditDialog.edge && (
        <EdgeEditDialog
          isOpen={edgeEditDialog.isOpen}
          edge={edgeEditDialog.edge}
          onClose={() => setEdgeEditDialog({ isOpen: false, edge: null })}
          onSave={handleEdgeEditSave}
          darkMode={darkMode}
        />
      )}
      
      {/* Add Node Popup */}
      {showAddNodePopup && (
        <div 
          className="fixed z-50 top-44 right-6"
        >
          <div 
            id="add-node-popup"
            className={`shadow-xl rounded-lg p-4 w-64 border ${
              darkMode 
                ? 'bg-gray-800 border-gray-700 text-white' 
                : 'bg-white border-gray-200 text-gray-800'
            }`}
            style={{ minHeight: '400px' }}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">Add a Node</h3>
              <button 
                className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                onClick={() => setShowAddNodePopup(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              <button
                className={`w-full py-2 px-3 flex items-center rounded-md text-left ${
                  darkMode 
                    ? 'hover:bg-gray-700' 
                    : 'hover:bg-blue-50'
                }`}
                onClick={() => handleAddNode('api-request')}
              >
                <div className={`w-8 h-8 flex items-center justify-center rounded-md mr-3 ${
                  darkMode ? 'bg-blue-900' : 'bg-blue-100'
                }`}>
                  <Phone className={`h-4 w-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <span>API Request</span>
              </button>
              
              <button
                className={`w-full py-2 px-3 flex items-center rounded-md text-left ${
                  darkMode 
                    ? 'hover:bg-gray-700' 
                    : 'hover:bg-blue-50'
                }`}
                onClick={() => handleAddNode('transfer-call')}
              >
                <div className={`w-8 h-8 flex items-center justify-center rounded-md mr-3 ${
                  darkMode ? 'bg-green-900' : 'bg-green-100'
                }`}>
                  <Phone className={`h-4 w-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                </div>
                <span>Transfer Call</span>
              </button>
              
              <button
                className={`w-full py-2 px-3 flex items-center rounded-md text-left ${
                  darkMode 
                    ? 'hover:bg-gray-700' 
                    : 'hover:bg-blue-50'
                }`}
                onClick={() => handleAddNode('end-call')}
              >
                <div className={`w-8 h-8 flex items-center justify-center rounded-md mr-3 ${
                  darkMode ? 'bg-red-900' : 'bg-red-100'
                }`}>
                  <Phone className={`h-4 w-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                </div>
                <span>End call</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edge condition popup */}
      <EdgeConditionPopup
        isOpen={edgeConditionPopup.isOpen}
        edge={edgeConditionPopup.edge}
        onClose={() => setEdgeConditionPopup({ isOpen: false, edge: null })}
        onSave={handleSaveEdgeCondition}
        darkMode={darkMode}
      />
    </MainLayout>
  );
};

export default CreateWorkflowPage; 