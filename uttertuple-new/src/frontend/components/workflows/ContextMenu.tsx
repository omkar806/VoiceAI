import React from 'react';
import { Edit, Trash2, CircleDot } from 'lucide-react';

interface ContextMenuProps {
  show?: boolean;
  x: number;
  y: number;
  type: 'node' | 'edge';
  id?: string;
  nodeType?: string;
  onEditClick: (id: string) => void;
  onDeleteClick: (id: string) => void;
  onAddConditionClick?: (id: string) => void;
  hasCondition?: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  show = true,
  x,
  y,
  type,
  id = '',
  nodeType,
  onEditClick,
  onDeleteClick,
  onAddConditionClick,
  hasCondition = false,
  onClose,
  darkMode = false
}) => {
  if (!show) return null;

  // Determine which options to show based on node type
  const isStartNode = nodeType === 'start' || id === 'start-node';
  const isEndNode = nodeType === 'end' || id === 'end-node';
  const isAgentNode = nodeType === 'agent';
  
  // Start node: no options should appear
  // End node: only delete option
  // Agent node: both edit and delete options
  const showEditOption = type === 'edge' || (type === 'node' && !isStartNode && !isEndNode);
  const showDeleteOption = type === 'edge' || (type === 'node' && !isStartNode);

  // Add some offsets to position the menu near the cursor but not right under it
  const menuStyle = {
    position: 'fixed' as const,
    top: `${y + 10}px`,
    left: `${x + 10}px`,
    zIndex: 1000,
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  // Stop propagation to prevent immediate close
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      style={menuStyle} 
      onClick={handleMenuClick}
      className={`rounded-md shadow-lg ${
        darkMode 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200'
      }`}
    >
      <ul className="py-1 text-sm">
        {type === 'edge' && onAddConditionClick && (
          <li>
            <button
              onClick={() => onAddConditionClick(id)}
              className={`w-full text-left px-4 py-2 flex items-center ${
                darkMode 
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <CircleDot className="h-4 w-4 mr-2" />
              {hasCondition ? 'Edit Condition' : 'Add Condition'}
            </button>
          </li>
        )}
        {showEditOption && (
        <li>
          <button
            onClick={() => onEditClick(id)}
            className={`w-full text-left px-4 py-2 flex items-center ${
              darkMode 
                ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Edit className="h-4 w-4 mr-2" />
            {isAgentNode ? 'Edit agent' : `Edit ${type}`}
          </button>
        </li>
        )}
        {showDeleteOption && (
        <li>
          <button
            onClick={() => onDeleteClick(id)}
            className={`w-full text-left px-4 py-2 flex items-center ${
              darkMode 
                ? 'text-red-400 hover:bg-red-900/30 hover:text-red-300' 
                : 'text-red-600 hover:bg-red-50 hover:text-red-700'
            }`}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete {type}
          </button>
        </li>
        )}
      </ul>
    </div>
  );
};

export default ContextMenu; 