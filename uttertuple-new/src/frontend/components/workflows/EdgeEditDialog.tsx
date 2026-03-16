import React, { useState, useEffect } from 'react';
import { Edge } from 'reactflow';
import { X, Plus, Trash } from 'lucide-react';

interface Parameter {
  name: string;
  description: string;
  type: string;
}

interface ToolCondition {
  name: string;
  description: string;
  response_type: string;
  parameters: Parameter[];
  confirmation_required: boolean;
  state?: Record<string, any>;
}

interface EdgeEditDialogProps {
  isOpen: boolean;
  edge: Edge | null;
  onClose: () => void;
  onSave: (edgeId: string, data: any) => void;
  currentCondition?: ToolCondition;
  darkMode?: boolean;
}

const EdgeEditDialog: React.FC<EdgeEditDialogProps> = ({
  isOpen,
  edge,
  onClose,
  onSave,
  currentCondition,
  darkMode = false
}) => {
  const [formData, setFormData] = useState<ToolCondition>({
    name: '',
    description: '',
    response_type: 'tuple', // Always tuple as specified
    parameters: [],
    confirmation_required: false,
    state: {}
  });

  useEffect(() => {
    if (edge && edge.data) {
      console.log("EdgeEditDialog - loading edge data:", edge.data);
      
      // Get connection points from edge or edge data
      const sourceHandle = edge.sourceHandle || edge.data.sourceHandle || edge.data.state?.sourceHandle;
      const targetHandle = edge.targetHandle || edge.data.targetHandle || edge.data.state?.targetHandle;
      
      // Initialize from edge data or current condition if provided
      let initialData: ToolCondition = {
        name: '',
        description: '',
        response_type: 'tuple',
        parameters: [],
        confirmation_required: false,
        state: {}
      };
      
      if (currentCondition) {
        // If there's a current condition (used when first creating an edge)
        initialData = {
          ...currentCondition,
          state: {
            ...(currentCondition.state || {}),
            sourceHandle,
            targetHandle
          }
        };
      } else if (edge.data.tool) {
        // If tool data is available (most cases when editing)
        initialData = {
          ...edge.data.tool,
          state: {
            ...(edge.data.tool.state || {}),
            sourceHandle,
            targetHandle
          }
        };
      } else {
        // Otherwise extract from individual fields on edge.data
        // This handles older format edges or custom formats
        const parameters = Array.isArray(edge.data.parameters) 
          ? edge.data.parameters 
          : [];
          
        initialData = {
          name: edge.data.name || edge.data.label || '',
          description: edge.data.description || '',
          response_type: edge.data.response_type || 'tuple',
          parameters: parameters,
          confirmation_required: Boolean(edge.data.confirmation_required),
          state: {
            ...(typeof edge.data.state === 'object' ? edge.data.state : {}),
            sourceHandle,
            targetHandle
          }
        };
      }
      
      // Check for backend condition data format
      // Backend format might store data in condition property
      if (edge.data.condition && typeof edge.data.condition === 'object') {
        const condition = edge.data.condition;
        initialData = {
          ...initialData,
          name: initialData.name || condition.name || '',
          description: initialData.description || condition.description || '', 
          response_type: initialData.response_type || condition.response_type || 'tuple',
          parameters: initialData.parameters.length ? initialData.parameters : (condition.parameters || []),
          confirmation_required: initialData.confirmation_required || Boolean(condition.confirmation_required)
        };
      }
      
      console.log("EdgeEditDialog - initialData prepared:", initialData);
      setFormData(initialData);
    }
  }, [edge, currentCondition]);

  if (!isOpen || !edge) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleAddParameter = () => {
    setFormData((prev) => ({
      ...prev,
      parameters: [
        ...prev.parameters,
        { name: '', description: '', type: 'string' },
      ],
    }));
  };

  const handleRemoveParameter = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index),
    }));
  };

  const handleParameterChange = (index: number, field: keyof Parameter, value: string) => {
    setFormData((prev) => {
      const updatedParams = [...prev.parameters];
      updatedParams[index] = { ...updatedParams[index], [field]: value };
      return {
        ...prev,
        parameters: updatedParams,
      };
    });
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      // Get existing connection points
      const sourceHandle = formData.state?.sourceHandle;
      const targetHandle = formData.state?.targetHandle;
      
      // Try to parse as JSON
      const stateJson = e.target.value ? JSON.parse(e.target.value) : {};
      
      // Preserve connection points
      setFormData((prev) => ({
        ...prev,
        state: {
          ...stateJson,
          sourceHandle,
          targetHandle
        }
      }));
    } catch (error) {
      // If invalid JSON, store as a string to preserve user input
      // But still keep the connection points
      const sourceHandle = formData.state?.sourceHandle;
      const targetHandle = formData.state?.targetHandle;
      
      setFormData((prev) => ({
        ...prev,
        state: { 
          _raw: e.target.value,
          sourceHandle,
          targetHandle
        }
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      alert("Tool name is required");
      return;
    }
    
    if (!formData.description.trim()) {
      alert("Description is required");
      return;
    }
    
    // Validate parameters
    const invalidParams = formData.parameters.filter(p => !p.name.trim() || !p.description.trim());
    if (invalidParams.length > 0) {
      alert("All parameters must have a name and description");
      return;
    }
    
    // Get connection points from current state
    const sourceHandle = formData.state?.sourceHandle;
    const targetHandle = formData.state?.targetHandle;
    
    // Clean up state data if needed
    let stateData = { ...(formData.state || {}) };
    if (stateData._raw) {
      try {
        // Parse raw JSON but preserve connection points
        const parsedState = JSON.parse(stateData._raw);
        stateData = {
          ...parsedState,
          sourceHandle,
          targetHandle
        };
      } catch (e) {
        // If can't parse, use only connection points
        stateData = { 
          sourceHandle, 
          targetHandle 
        };
      }
      // Remove _raw property
      delete stateData._raw;
    }
    
    // Save all form data directly to edge
    onSave(edge.id, { 
      // Basic properties
      name: formData.name,
      label: formData.name,
      description: formData.description,
      response_type: formData.response_type,
      parameters: formData.parameters,
      confirmation_required: formData.confirmation_required,
      // Connection points
      sourceHandle,
      targetHandle,
      // State data
      state: stateData,
      // Store complete tool configuration
      tool: {
        name: formData.name,
        description: formData.description,
        response_type: formData.response_type,
        parameters: formData.parameters,
        confirmation_required: formData.confirmation_required,
        state: stateData,
        sourceHandle,
        targetHandle
      }
    });
  };

  const getStateJsonString = () => {
    if (!formData.state) return '';
    if (formData.state._raw) return formData.state._raw;
    
    // Create a copy of the state without connection points
    const stateCopy = { ...formData.state };
    
    // Remove connection points from UI display
    if (stateCopy.sourceHandle) delete stateCopy.sourceHandle;
    if (stateCopy.targetHandle) delete stateCopy.targetHandle;
    
    // Only return empty braces if there's nothing else in the state
    if (Object.keys(stateCopy).length === 0) return '{}';
    
    return JSON.stringify(stateCopy, null, 2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div 
        className={`w-full max-w-2xl p-6 rounded-lg shadow-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Edit Edge Connection
          </h3>
          <button 
            onClick={onClose}
            className={`rounded-full p-1 transition-colors ${
              darkMode 
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label 
              htmlFor="edge-label" 
              className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Connection Label
            </label>
            <input
              id="edge-label"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="E.g., Transfer to sales, End call, etc."
            />
          </div>
          
          <div className="mb-6">
            <label 
              htmlFor="description" 
              className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
              } min-h-[80px]`}
              placeholder="Explain when this transition should be used"
            />
          </div>
          
          <div className="mb-6">
            <label 
              className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Response Type
            </label>
            <div className={`px-3 py-2 border rounded-md ${
              darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'
            }`}>
              tuple
            </div>
            <p className={`text-xs text-gray-500 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              The response type is fixed to 'tuple' for transition tools
            </p>
          </div>
          
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="confirmation_required"
              name="confirmation_required"
              checked={formData.confirmation_required}
              onChange={handleCheckboxChange}
              className={`h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}
            />
            <label htmlFor="confirmation_required" className={`ml-2 block text-sm text-gray-700 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Require confirmation before transitioning
            </label>
          </div>
          
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Parameters
              </h4>
              <button
                type="button"
                onClick={handleAddParameter}
                className={`text-sm flex items-center ${
                  darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Parameter
              </button>
            </div>
            
            {formData.parameters.length === 0 && (
              <div className={`text-sm italic mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No parameters added yet. Parameters allow you to pass additional information during the transition.
              </div>
            )}
            
            {formData.parameters.map((param, index) => (
              <div 
                key={index} 
                className={`p-4 mb-3 rounded-md border ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h5 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Parameter {index + 1}
                  </h5>
                  <button
                    type="button"
                    onClick={() => handleRemoveParameter(index)}
                    className={`p-1 rounded-full ${
                      darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-500 hover:bg-red-50'
                    }`}
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label 
                      className={`block text-xs font-medium mb-1 ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      value={param.name}
                      onChange={(e) => handleParameterChange(index, 'name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      placeholder="e.g., account_number"
                    />
                  </div>
                  
                  <div>
                    <label 
                      className={`block text-xs font-medium mb-1 ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      Type
                    </label>
                    <select
                      value={param.type}
                      onChange={(e) => handleParameterChange(index, 'type', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="array">Array</option>
                      <option value="object">Object</option>
                    </select>
                  </div>
                  
                  <div>
                    <label 
                      className={`block text-xs font-medium mb-1 ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      Description
                    </label>
                    <input
                      type="text"
                      value={param.description}
                      onChange={(e) => handleParameterChange(index, 'description', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      placeholder="Describe what this parameter is for"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mb-6">
            <label 
              htmlFor="state" 
              className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Edge State (JSON)
            </label>
            <textarea
              id="state"
              name="state"
              value={getStateJsonString()}
              onChange={handleStateChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
              } min-h-[100px] font-mono text-sm`}
              placeholder='{"key": "value"}'
            />
            <p className={`text-xs text-gray-500 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Optional JSON state data for this edge. This will be saved with the workflow.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-md transition-colors ${
                darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-white rounded-md transition-colors ${
                darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EdgeEditDialog; 