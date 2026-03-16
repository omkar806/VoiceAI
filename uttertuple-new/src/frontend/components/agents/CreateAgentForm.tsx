import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, Info, Plus, Database } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTheme } from '../../contexts/ThemeContext';
import { CreateAgentData, CollectionField, RAGDatabaseConfig, TTSConfig } from '../../services/agent';

// Dynamically import heavy components
const CollectionFieldsEditor = dynamic(() => import('../CollectionFieldsEditor'), {
  ssr: false,
  loading: () => <div className="animate-pulse h-40 w-full bg-gray-200 dark:bg-gray-700 rounded-md"></div>
});

interface CreateAgentFormProps {
  formData: CreateAgentData;
  setFormData: React.Dispatch<React.SetStateAction<CreateAgentData>>;
  loading: boolean;
  darkMode: boolean;
  llmProviders: any[];
  ttsProviders: any[];
  vectorDbs: any[];
  selectedLLMProvider: string;
  selectedTTSProvider: string;
  selectedTTSProviderName: string;
  selectedVectorDbs: string[];
  ragConfigData: { [key: string]: { collection_name: string } };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleCollectionFieldsChange: (fields: CollectionField[]) => void;
  handleLLMProviderChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleTTSProviderChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleVoiceChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleVectorDbChange: (dbId: string) => void;
  handleRagConfigChange: (dbId: string, field: string, value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  openaiVoiceOptions: { value: string; label: string }[];
  cartesiaVoiceOptions: { value: string; label: string; name: string }[];
  kokoroVoiceOptions: { value: string; label: string }[];
  openaiLLMModels: { value: string; label: string }[];
  collectionsMap: Record<string, { name: string; metadata?: any }[]>;
  tools: any[];
  handleAddTool: () => void;
  handleRemoveTool: (index: number) => void;
  handleToolInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleAuthTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleAuthConfigChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  newTool: any;
}

const CreateAgentForm: React.FC<CreateAgentFormProps> = ({
  formData,
  setFormData,
  loading,
  darkMode,
  llmProviders,
  ttsProviders,
  vectorDbs,
  selectedLLMProvider,
  selectedTTSProvider,
  selectedTTSProviderName,
  selectedVectorDbs,
  ragConfigData,
  handleInputChange,
  handleCollectionFieldsChange,
  handleLLMProviderChange,
  handleTTSProviderChange,
  handleVoiceChange,
  handleVectorDbChange,
  handleRagConfigChange,
  handleSubmit,
  openaiVoiceOptions,
  cartesiaVoiceOptions,
  kokoroVoiceOptions,
  openaiLLMModels,
  collectionsMap,
  tools,
  handleAddTool,
  handleRemoveTool,
  handleToolInputChange,
  handleAuthTypeChange,
  handleAuthConfigChange,
  newTool
}) => {
  // Memoize voice options based on selected provider
  const voiceOptions = useMemo(() => {
    if (selectedTTSProviderName === 'cartesia') {
      return cartesiaVoiceOptions;
    } else if (selectedTTSProviderName === 'kokoro') {
      return kokoroVoiceOptions;
    }
    return openaiVoiceOptions;
  }, [selectedTTSProviderName, cartesiaVoiceOptions, kokoroVoiceOptions, openaiVoiceOptions]);

  // Memoize vector db class
  const vectorDbClass = useMemo(() => 
    `px-4 py-3 rounded-md text-sm transition-all flex items-center justify-between ${
      darkMode 
        ? 'bg-gray-800 border border-gray-700 hover:border-gray-600' 
        : 'bg-white border border-gray-200 hover:border-gray-300'
    }`,
    [darkMode]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information Section */}
      <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Basic Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Agent Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full rounded-md ${
                darkMode 
                  ? 'bg-gray-900 border-gray-700 text-white focus:border-blue-500' 
                  : 'border-gray-300 focus:border-blue-500'
              } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
              placeholder="Enter agent name"
              required
            />
          </div>
        </div>
        
        <div className="mt-6">
          <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Instructions *
          </label>
          <textarea
            name="instructions"
            value={formData.instructions}
            onChange={handleInputChange}
            rows={4}
            className={`w-full rounded-md ${
              darkMode 
                ? 'bg-gray-900 border-gray-700 text-white focus:border-blue-500' 
                : 'border-gray-300 focus:border-blue-500'
            } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
            placeholder="Provide detailed instructions for your agent..."
            required
          />
        </div>
      </div>

      {/* LLM Provider Section */}
      <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>LLM Provider</h2>
        
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Select LLM Provider
            </label>
            <select
              value={selectedLLMProvider}
              onChange={handleLLMProviderChange}
              className={`w-full rounded-md ${
                darkMode 
                  ? 'bg-gray-900 border-gray-700 text-white focus:border-blue-500' 
                  : 'border-gray-300 focus:border-blue-500'
              } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
            >
              <option value="">Select an LLM provider</option>
              {llmProviders.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.provider_name} - {provider.model_name || 'Default model'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Voice / TTS Provider Section */}
      <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Voice Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              TTS Provider 
            </label>
            <select
              value={selectedTTSProvider}
              onChange={handleTTSProviderChange}
              className={`w-full rounded-md ${
                darkMode 
                  ? 'bg-gray-900 border-gray-700 text-white focus:border-blue-500' 
                  : 'border-gray-300 focus:border-blue-500'
              } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
            >
              <option value="">No voice (text only)</option>
              {ttsProviders.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.provider_name.charAt(0).toUpperCase() + provider.provider_name.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          {selectedTTSProvider && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Voice
              </label>
              <select
                name="voice_id"
                value={formData.voice_id}
                onChange={handleVoiceChange}
                className={`w-full rounded-md ${
                  darkMode 
                    ? 'bg-gray-900 border-gray-700 text-white focus:border-blue-500' 
                    : 'border-gray-300 focus:border-blue-500'
                } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
              >
                {voiceOptions.map(voice => (
                  <option key={voice.value} value={voice.value}>
                    {voice.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      
      {/* RAG Section */}
      <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Knowledge Bases (RAG)</h2>
        </div>
        
        <div className="space-y-4">
          {vectorDbs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vectorDbs.map(db => (
                <div 
                  key={db.id}
                  className={vectorDbClass}
                  onClick={() => handleVectorDbChange(db.id)}
                >
                  <div className="flex items-center">
                    <Database className={`h-5 w-5 mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>
                      {db.name}
                    </span>
                  </div>
                  <div>
                    <input 
                      type="checkbox" 
                      checked={selectedVectorDbs.includes(db.id)}
                      onChange={() => {}} // Handled by the div click
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No vector databases configured. Go to Settings to add a vector database.
            </div>
          )}
          
          {/* Selected Vector DB Collections */}
          {selectedVectorDbs.length > 0 && (
            <div className="mt-6 space-y-6">
              {selectedVectorDbs.map(dbId => (
                <div key={dbId} className={`mt-4 p-4 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h3 className={`text-lg font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {vectorDbs.find(db => db.id === dbId)?.name} Configuration
                  </h3>
                  
                  <div className="mb-4">
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Collection
                    </label>
                    <select
                      value={ragConfigData[dbId]?.collection_name || ''}
                      onChange={(e) => handleRagConfigChange(dbId, 'collection_name', e.target.value)}
                      className={`w-full rounded-md ${
                        darkMode 
                          ? 'bg-gray-900 border-gray-700 text-white focus:border-blue-500' 
                          : 'border-gray-300 focus:border-blue-500'
                      } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                    >
                      <option value="">Select a collection</option>
                      {(collectionsMap[dbId] || []).map(collection => (
                        <option key={collection.name} value={collection.name}>
                          {collection.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Collection Fields Section */}
      <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Collection Fields</h2>
        <div className={`p-4 mb-4 rounded-md text-sm ${darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'} flex items-start`}>
          <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <p>
            Collection fields define what information your agent will collect in conversations. 
            For example, you might want to collect a customer name, email, or specific details relevant to your business.
          </p>
        </div>
        
        <CollectionFieldsEditor 
          fields={formData.collection_fields || []} 
          onChange={handleCollectionFieldsChange}
          darkMode={darkMode}
        />
      </div>
      
      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className={`px-6 py-2.5 rounded-md ${
            darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
          } text-white font-medium flex items-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Create Agent
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default React.memo(CreateAgentForm); 