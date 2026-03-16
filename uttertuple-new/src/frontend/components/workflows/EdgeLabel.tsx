import React, { useState } from 'react';
import { EdgeLabelRenderer, EdgeProps, getBezierPath, MarkerType, useReactFlow } from 'reactflow';
import { BaseEdgeData, ConditionalEdgeData } from '../../types/workflow';
import { Edit, Trash, CircleDot } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// Basic edge with label
export const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<BaseEdgeData>) => {
  const { setEdges } = useReactFlow();
  const { darkMode } = useTheme();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  
  const [showOptions, setShowOptions] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Function to handle click on the transition button
  const handleTransitionClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShowOptions(true);
  };
  
  // Function to handle edit option click
  const handleEditClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShowOptions(false);
    
    // Dispatch a custom event to be caught by the parent component
    const customEvent = new CustomEvent('edge:configure', { 
      detail: { edgeId: id }
    });
    window.dispatchEvent(customEvent);
  };
  
  // Function to handle delete option click
  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShowOptions(false);
    
    // Dispatch a custom event to delete the edge
    const customEvent = new CustomEvent('edge:delete', { 
      detail: { edgeId: id }
    });
    window.dispatchEvent(customEvent);
  };
  
  // Close options when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setShowOptions(false);
    if (showOptions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showOptions]);
  
  // Handle mouse events for instant tooltip
  const handleMouseEnter = () => {
    if (data?.label && data.label.length > 15) {
      setShowTooltip(true);
    }
  };
  
  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const edgeColor = darkMode ? '#94a3b8' : '#64748b'; // Tailwind slate-400 in dark mode or slate-500 in light

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        strokeWidth={1.5}
        stroke={edgeColor}
      />

      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: '#f0f9ff',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: 12,
              fontWeight: 500,
              pointerEvents: 'all',
              border: '1px solid #bae6fd',
            }}
            className="nodrag nopan text-sky-800 hover:bg-sky-100 cursor-pointer relative"
            onClick={handleTransitionClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {data.label.length > 15 ? data.label.substring(0, 15) + '...' : data.label}
            
            {/* Custom instant tooltip */}
            {showTooltip && (
              <div 
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded shadow-lg z-50 pointer-events-none"
                style={{ 
                  maxWidth: '400px',
                  minWidth: '200px',
                  wordWrap: 'break-word',
                  whiteSpace: 'normal'
                }}
          >
            {data.label}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Transition label - always visible */}
      {!data?.label && (
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            className="flex items-center justify-center px-2 py-1 bg-white text-xs font-medium text-blue-600 border border-blue-200 rounded-full shadow-sm hover:bg-blue-50 transition-colors"
            title="Configure transition"
            onClick={handleTransitionClick}
          >
            Transition
          </button>
          
          {/* Popup options menu */}
          {showOptions && (
            <div 
              className="absolute mt-1 z-10 bg-white rounded-md shadow-lg border border-gray-200 py-1 min-w-[120px] left-1/2 -translate-x-1/2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="flex items-center w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                onClick={handleEditClick}
              >
                <Edit size={14} className="mr-2" />
                Edit
              </button>

              <button
                className="flex items-center w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-gray-100"
                onClick={handleDeleteClick}
              >
                <Trash size={14} className="mr-2" />
                Delete
              </button>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
      )}
    </>
  );
};

// Edge with probability or condition
export const ConditionalEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<ConditionalEdgeData>) => {
  const { setEdges } = useReactFlow();
  const { darkMode } = useTheme();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Check if this is a start node edge (should show no label/condition)
  const isStartNodeEdge = data?.sourceNodeType === 'start' || data?.sourceName === 'Start';
  
  // Check if this is an end node edge (should show condition)
  const isEndNodeEdge = data?.targetNodeType === 'end' || data?.targetName === 'End';

  // Safely extract label as a string to avoid rendering objects
  let label = '';
  if (data && !isStartNodeEdge) { // Don't show any label for start node edges
    if (typeof data.label === 'string' && data.label) {
      // Use label if it's a string
      label = data.label;
    } else if (data.name && typeof data.name === 'string') {
      // Use name if available
      label = data.name;
    } else if (data.condition) {
      if (typeof data.condition === 'string') {
        // If condition is a string, use it directly
        label = data.condition;
      } else if (data.condition && typeof data.condition === 'object') {
        // For condition objects, try to get description first, then name
        if ('description' in data.condition && data.condition.description) {
          label = String(data.condition.description);
        } else if ('name' in data.condition && data.condition.name) {
          label = String(data.condition.name);
        }
      }
    } else if (data.probability) {
      // Use probability as a percentage if available
      label = `${Math.round(data.probability * 100)}%`;
    }
  }
  
  // Truncate label for display to prevent UI breaking (keep first 15 characters)
  const displayLabel = label.length > 15 ? label.substring(0, 15) + '...' : label;
  
  const [showOptions, setShowOptions] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Check if this edge has a condition
  const hasCondition = data?.hasCondition || 
    (data?.condition && 
     typeof data.condition === 'object' && 
     'description' in data.condition && 
     !!data.condition.description);
  
  // Function to handle click on the transition button
  const handleTransitionClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShowOptions(true);
  };
  
  // Function to handle edit option click
  const handleEditClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShowOptions(false);
    
    // Dispatch a custom event to be caught by the parent component
    const customEvent = new CustomEvent('edge:configure', { 
      detail: { edgeId: id }
    });
    window.dispatchEvent(customEvent);
  };
  
  // Function to handle add/edit condition option click
  const handleConditionClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShowOptions(false);
    
    // Dispatch a custom event for condition editing
    const customEvent = new CustomEvent('edge:condition', { 
      detail: { edgeId: id }
    });
    window.dispatchEvent(customEvent);
  };
  
  // Function to handle delete option click
  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShowOptions(false);
    
    // Dispatch a custom event to delete the edge
    const customEvent = new CustomEvent('edge:delete', { 
      detail: { edgeId: id }
    });
    window.dispatchEvent(customEvent);
  };
  
  // Close options when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setShowOptions(false);
    if (showOptions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showOptions]);
  
  // Handle mouse events for instant tooltip
  const handleMouseEnter = () => {
    if (label.length > 15) {
      setShowTooltip(true);
    }
  };
  
  const handleMouseLeave = () => {
    setShowTooltip(false);
  };
  
  // Define different styles based on the edge type
  const getStyle = () => {
    if (data?.type === 'success') {
      return {
        background: '#dcfce7',
        border: '1px solid #86efac',
        color: '#166534',
      };
    } else if (data?.type === 'failure') {
      return {
        background: '#fee2e2',
        border: '1px solid #fca5a5',
        color: '#991b1b',
      };
    } else if (data?.type === 'default') {
      return {
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        color: '#0c4a6e',
      };
    }
    
    // Default style
    return {
      background: '#f5f5f4',
      border: '1px solid #d6d3d1',
      color: '#44403c',
    };
  };

  const edgeColor = darkMode ? '#94a3b8' : '#64748b'; // Tailwind slate-400 in dark mode or slate-500 in light

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        style={{ 
          strokeWidth: data?.strokeWidth || 1.5,
          stroke: edgeColor 
        }}
      />

      {/* Show label only if it exists and this is not a start node edge */}
      {label && !isStartNodeEdge && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: 12,
              fontWeight: 500,
              pointerEvents: 'all',
              ...getStyle()
            }}
            className="nodrag nopan hover:brightness-95 cursor-pointer relative"
            onClick={handleTransitionClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {displayLabel}
            
            {/* Custom instant tooltip */}
            {showTooltip && (
              <div 
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded shadow-lg z-50 pointer-events-none"
                style={{ 
                  maxWidth: '400px',
                  minWidth: '200px',
                  wordWrap: 'break-word',
                  whiteSpace: 'normal'
                }}
          >
            {label}
              </div>
            )}
            
            {/* Popup options menu */}
            {showOptions && (
              <div 
                className="absolute mt-1 z-10 bg-white rounded-md shadow-lg border border-gray-200 py-1 min-w-[120px] left-1/2 -translate-x-1/2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="flex items-center w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                  onClick={handleConditionClick}
                >
                  <CircleDot size={14} className="mr-2" />
                  {hasCondition ? 'Edit Condition' : 'Add Condition'}
                </button>

                <button
                  className="flex items-center w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-gray-100"
                  onClick={handleDeleteClick}
                >
                  <Trash size={14} className="mr-2" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
      
      {/* Show Start label for start node edges */}
      {isStartNodeEdge && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: 12,
              fontWeight: 500,
              pointerEvents: 'all',
              background: '#dcfce7',
              border: '1px solid #86efac',
              color: '#166534',
            }}
            className="nodrag nopan hover:brightness-95 cursor-pointer relative"
            onClick={handleTransitionClick}
          >
            Start
            
            {/* Popup options menu - only Delete for start edges */}
            {showOptions && (
              <div 
                className="absolute mt-1 z-10 bg-white rounded-md shadow-lg border border-gray-200 py-1 min-w-[120px] left-1/2 -translate-x-1/2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="flex items-center w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-gray-100"
                  onClick={handleDeleteClick}
                >
                  <Trash size={14} className="mr-2" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
      
      {/* Show transition button for non-start edges that don't have a label */}
      {!label && !isStartNodeEdge && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan relative"
          >
            <button
              className="flex items-center justify-center px-2 py-1 bg-white text-xs font-medium text-blue-600 border border-blue-200 rounded-full shadow-sm hover:bg-blue-50 transition-colors"
              title="Configure transition"
              onClick={handleTransitionClick}
            >
              Transition
            </button>
            
            {/* Popup options menu */}
            {showOptions && (
              <div 
                className="absolute mt-1 z-10 bg-white rounded-md shadow-lg border border-gray-200 py-1 min-w-[120px] left-1/2 -translate-x-1/2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="flex items-center w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                  onClick={handleConditionClick}
                >
                  <CircleDot size={14} className="mr-2" />
                  {hasCondition ? 'Edit Condition' : 'Add Condition'}
                </button>

                <button
                  className="flex items-center w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-gray-100"
                  onClick={handleDeleteClick}
                >
                  <Trash size={14} className="mr-2" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

// Export edge types object for ReactFlow
export const edgeTypes = {
  custom: CustomEdge,
  conditional: ConditionalEdge,
}; 




