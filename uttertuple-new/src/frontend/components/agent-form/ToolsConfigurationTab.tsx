import React from 'react';
import { Plus, X } from 'lucide-react';

interface ToolsConfigurationTabProps {
  tools: any[];
  showAddModal: boolean;
  newTool: {
    name: string;
    description: string;
    endpoint_url: string;
    method: string;
    auth_type: string;
    auth_config: Record<string, string>;
    request_schema: string;
    response_schema: string;
  };
  onToolInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onAuthTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onAuthConfigChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddTool: () => void;
  onRemoveTool: (index: number) => void;
  onOpenAddModal: () => void;
  onCloseAddModal: () => void;
  darkMode: boolean;
}

const ToolsConfigurationTab: React.FC<ToolsConfigurationTabProps> = ({
  tools,
  showAddModal,
  newTool,
  onToolInputChange,
  onAuthTypeChange,
  onAuthConfigChange,
  onAddTool,
  onRemoveTool,
  onOpenAddModal,
  onCloseAddModal,
  darkMode
}) => {
  return (
    <div className={`border p-4 rounded-lg ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-neutral-200 bg-neutral-50'}`}>
      <h3 className={`font-medium mb-4 ${darkMode ? 'text-white' : 'text-neutral-800'}`}>
        Tools Configuration
      </h3>
      
      <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-neutral-600'}`}>
        Add tools to enhance the capabilities of your agent.
      </p>
      
      {/* List of added tools */}
      {tools.length > 0 ? (
        <div className="space-y-4 mb-6">
          <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}>Added Tools</h4>
          {tools.map((tool, index) => (
            <div key={tool.id || index} className={`p-4 rounded-md flex items-center justify-between ${darkMode ? 'bg-gray-700' : 'bg-neutral-100'}`}>
              <div>
                <div className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-800'}`}>{tool.name}</div>
                <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-neutral-600'}`}>{tool.description}</div>
                <div className={`mt-2 text-xs ${darkMode ? 'text-gray-400' : 'text-neutral-500'}`}>{tool.method} | {tool.endpoint_url}</div>
              </div>
              <button type="button" onClick={() => onRemoveTool(index)} className="ml-4 px-3 py-2 text-red-500 rounded-md flex items-center hover:bg-red-50 dark:hover:bg-red-900/20">Remove</button>
            </div>
          ))}
        </div>
      ) : (
        <div className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-neutral-500'}`}>No tools configured.</div>
      )}
      
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onOpenAddModal}
          className={`px-4 py-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-primary-600 hover:bg-primary-700'} text-white rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 flex items-center ${darkMode ? 'focus:ring-blue-500' : 'focus:ring-primary-500'}`}
        >
          <Plus size={16} className="mr-1.5" /> Add Tool
        </button>
      </div>
      
      {/* Modal for adding a tool */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className={`w-full max-w-lg p-6 rounded-lg border shadow-lg relative ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-neutral-200'}`}> 
            <button onClick={onCloseAddModal} className="absolute top-3 right-3 text-gray-400 hover:text-red-500"><X size={20} /></button>
            <h4 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-neutral-800'}`}>Add New Tool</h4>
            <div className="space-y-4">
              {/* Tool inputs */}
              <div>
                <label htmlFor="tool_name" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}>
                  Tool Name
                </label>
                <input
                  type="text"
                  id="tool_name"
                  name="name"
                  value={newTool.name}
                  onChange={onToolInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
                    darkMode 
                      ? 'bg-gray-600 border-gray-500 text-white focus:ring-blue-500' 
                      : 'border-neutral-300 focus:ring-primary-500'
                  }`}
                  placeholder="Google Search"
                />
              </div>
              
              <div>
                <label htmlFor="tool_description" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}>
                  Description
                </label>
                <textarea
                  id="tool_description"
                  name="description"
                  value={newTool.description}
                  onChange={onToolInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
                    darkMode 
                      ? 'bg-gray-600 border-gray-500 text-white focus:ring-blue-500' 
                      : 'border-neutral-300 focus:ring-primary-500'
                  }`}
                  rows={2}
                  placeholder="Search for information on the web"
                />
              </div>
              
              <div>
                <label htmlFor="tool_endpoint_url" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}>
                  Endpoint URL
                </label>
                <input
                  type="text"
                  id="tool_endpoint_url"
                  name="endpoint_url"
                  value={newTool.endpoint_url}
                  onChange={onToolInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
                    darkMode 
                      ? 'bg-gray-600 border-gray-500 text-white focus:ring-blue-500' 
                      : 'border-neutral-300 focus:ring-primary-500'
                  }`}
                  placeholder="https://api.example.com/search"
                />
              </div>
              
              <div>
                <label htmlFor="tool_method" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}>
                  HTTP Method
                </label>
                <select
                  id="tool_method"
                  name="method"
                  value={newTool.method}
                  onChange={onToolInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
                    darkMode 
                      ? 'bg-gray-600 border-gray-500 text-white focus:ring-blue-500' 
                      : 'border-neutral-300 focus:ring-primary-500'
                  }`}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="tool_auth_type" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}>
                  Authentication Type
                </label>
                <select
                  id="tool_auth_type"
                  name="auth_type"
                  value={newTool.auth_type}
                  onChange={onAuthTypeChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
                    darkMode 
                      ? 'bg-gray-600 border-gray-500 text-white focus:ring-blue-500' 
                      : 'border-neutral-300 focus:ring-primary-500'
                  }`}
                >
                  <option value="">None</option>
                  <option value="api_key">API Key</option>
                  <option value="bearer_token">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                </select>
              </div>
              
              {/* Auth Specific Fields */}
              {newTool.auth_type === 'api_key' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="auth_key_name" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}>
                      Key Name
                    </label>
                    <input
                      type="text"
                      id="auth_key_name"
                      name="key_name"
                      value={newTool.auth_config.key_name || ''}
                      onChange={onAuthConfigChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
                        darkMode 
                          ? 'bg-gray-600 border-gray-500 text-white focus:ring-blue-500' 
                          : 'border-neutral-300 focus:ring-primary-500'
                      }`}
                      placeholder="X-API-Key"
                    />
                  </div>
                  <div>
                    <label htmlFor="auth_key_value" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}>
                      Key Value
                    </label>
                    <input
                      type="text"
                      id="auth_key_value"
                      name="key_value"
                      value={newTool.auth_config.key_value || ''}
                      onChange={onAuthConfigChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
                        darkMode 
                          ? 'bg-gray-600 border-gray-500 text-white focus:ring-blue-500' 
                          : 'border-neutral-300 focus:ring-primary-500'
                      }`}
                      placeholder="your-api-key"
                    />
                  </div>
                </div>
              )}
              
              {newTool.auth_type === 'bearer_token' && (
                <div>
                  <label htmlFor="auth_token" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}>
                    Token
                  </label>
                  <input
                    type="text"
                    id="auth_token"
                    name="token"
                    value={newTool.auth_config.token || ''}
                    onChange={onAuthConfigChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
                      darkMode 
                        ? 'bg-gray-600 border-gray-500 text-white focus:ring-blue-500' 
                        : 'border-neutral-300 focus:ring-primary-500'
                    }`}
                    placeholder="your-bearer-token"
                  />
                </div>
              )}
              
              {newTool.auth_type === 'basic' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="auth_username" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}>
                      Username
                    </label>
                    <input
                      type="text"
                      id="auth_username"
                      name="username"
                      value={newTool.auth_config.username || ''}
                      onChange={onAuthConfigChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
                        darkMode 
                          ? 'bg-gray-600 border-gray-500 text-white focus:ring-blue-500' 
                          : 'border-neutral-300 focus:ring-primary-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label htmlFor="auth_password" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}>
                      Password
                    </label>
                    <input
                      type="password"
                      id="auth_password"
                      name="password"
                      value={newTool.auth_config.password || ''}
                      onChange={onAuthConfigChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
                        darkMode 
                          ? 'bg-gray-600 border-gray-500 text-white focus:ring-blue-500' 
                          : 'border-neutral-300 focus:ring-primary-500'
                      }`}
                    />
                  </div>
                </div>
              )}
              
              {/* Request Schema */}
              <div>
                <label htmlFor="tool_request_schema" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}>
                  Request Schema
                </label>
                <textarea
                  id="tool_request_schema"
                  name="request_schema"
                  value={newTool.request_schema}
                  onChange={onToolInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
                    darkMode 
                      ? 'bg-gray-600 border-gray-500 text-white focus:ring-blue-500' 
                      : 'border-neutral-300 focus:ring-primary-500'
                  }`}
                  rows={4}
                  placeholder="{}"
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-neutral-500'}`}>
                  JSON schema for the request body
                </p>
              </div>
              
              {/* Response Schema */}
              <div>
                <label htmlFor="tool_response_schema" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}>
                  Response Schema
                </label>
                <textarea
                  id="tool_response_schema"
                  name="response_schema"
                  value={newTool.response_schema}
                  onChange={onToolInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
                    darkMode 
                      ? 'bg-gray-600 border-gray-500 text-white focus:ring-blue-500' 
                      : 'border-neutral-300 focus:ring-primary-500'
                  }`}
                  rows={4}
                  placeholder="{}"
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-neutral-500'}`}>
                  JSON schema for the expected response
                </p>
              </div>
              
              {/* Add Tool Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onAddTool}
                  className={`px-4 py-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-primary-600 hover:bg-primary-700'} text-white rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 flex items-center ${
                    darkMode ? 'focus:ring-blue-500' : 'focus:ring-primary-500'
                  }`}
                >
                  <Plus size={16} className="mr-1.5" /> Add Tool
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsConfigurationTab; 