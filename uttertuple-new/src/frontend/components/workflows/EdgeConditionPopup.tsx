import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Edge } from 'reactflow';

interface EdgeConditionPopupProps {
  isOpen: boolean;
  edge: Edge | null;
  onClose: () => void;
  onSave: (edgeId: string, condition: EdgeConditionData) => void;
  darkMode?: boolean;
}

interface EdgeConditionData {
  type: string;
  aiPrompt: string;
}

const EdgeConditionPopup: React.FC<EdgeConditionPopupProps> = ({
  isOpen,
  edge,
  onClose,
  onSave,
  darkMode = false
}) => {
  const [conditionType, setConditionType] = useState<string>('AI');
  const [aiPrompt, setAiPrompt] = useState<string>('');

  useEffect(() => {
    if (edge && edge.data) {
      // Initialize from edge data if available
      setConditionType(edge.data.conditionType || 'AI');
      setAiPrompt(edge.data.aiPrompt || '');
    }
  }, [edge]);

  if (!isOpen || !edge) return null;

  const handleSave = () => {
    // Save the condition data to the edge
    onSave(edge.id, {
      type: conditionType,
      aiPrompt
    });
    onClose();
  };

  return (
    <div 
      className="fixed z-50 top-44 right-6"
    >
      <div 
        id="edge-condition-popup"
        className={`shadow-xl rounded-lg p-4 w-64 border ${
          darkMode 
            ? 'bg-gray-800 border-gray-700 text-white' 
            : 'bg-white border-gray-200 text-gray-800'
        }`}
        style={{ minHeight: '400px' }}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium">Condition</h3>
          <button 
            className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label 
              className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Condition Type
            </label>
            <select
              value={conditionType}
              onChange={(e) => setConditionType(e.target.value)}
              className={`w-full p-2 rounded-md border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="AI">AI</option>
            </select>
          </div>

          <div>
            <label 
              className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              AI Condition
            </label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Go down this path if the user is in a good mood and they're willing to buy"
              rows={10}
              className={`w-full p-2 rounded-md border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              className={`px-4 py-2 rounded-md ${
                darkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              Save Condition
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EdgeConditionPopup; 