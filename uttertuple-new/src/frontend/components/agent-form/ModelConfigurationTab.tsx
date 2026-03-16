import React from 'react';
import { CreateAgentData, TTSConfig } from '../../services/agent';
import { LLMProvider } from '../../services/llm';
import { TTSProvider } from '../../services/tts';

interface ModelConfigurationTabProps {
  formData: CreateAgentData;
  llmProviders: LLMProvider[];
  ttsProviders: TTSProvider[];
  selectedLLMProvider: string;
  selectedTTSProvider: string;
  selectedTTSProviderName: string;
  openaiLLMModels: { value: string; label: string }[];
  openaiVoiceOptions: { value: string; label: string }[];
  groqVoiceOptions: { value: string; label: string }[];
  elevenLabsVoiceOptions: { value: string; label: string }[];
  cartesiaVoiceOptions: { value: string; label: string }[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onLLMProviderChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onTTSProviderChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onVoiceChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  darkMode: boolean;
}

const ModelConfigurationTab: React.FC<ModelConfigurationTabProps> = ({
  formData,
  llmProviders,
  ttsProviders,
  selectedLLMProvider,
  selectedTTSProvider,
  selectedTTSProviderName,
  openaiLLMModels,
  openaiVoiceOptions,
  groqVoiceOptions,
  elevenLabsVoiceOptions,
  cartesiaVoiceOptions,
  onInputChange,
  onLLMProviderChange,
  onTTSProviderChange,
  onVoiceChange,
  darkMode
}) => {
  // Check if selected model is OpenAI-realtime
  const isOpenAIRealtime = formData.llm_model === 'openai-realtime';
  
  // Get the selected provider data
  const selectedProviderData = llmProviders.find(p => p.id === selectedLLMProvider);
  
  // Groq model options - using the exact values specified
  const groqModelOptions = [
    { value: 'gemma2-9b-it', label: 'gemma2-9b-it' },
    { value: 'llama-3.1-8b-instant', label: 'llama-3.1-8b-instant' },
    { value: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile' },
    { value: 'llama3-70b-8192', label: 'llama3-70b-8192' },
    { value: 'llama3-8b-8192', label: 'llama3-8b-8192' },
    { value: 'meta-llama/llama-4-maverick-17b-128e-instruct', label: 'meta-llama/llama-4-maverick-17b-128e-instruct' },
    { value: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'meta-llama/llama-4-scout-17b-16e-instruct' }
  ];
  
  // Ensure openaiLLMModels includes OpenAI Realtime but doesn't duplicate it
  const openaiModelsWithRealtime = openaiLLMModels.some(model => model.value === 'openai-realtime')
    ? openaiLLMModels
    : [...openaiLLMModels, { value: 'openai-realtime', label: 'OpenAI Realtime' }];

  return (
    <>
      {/* LLM Model Configuration */}
      <div className={`border p-4 rounded-lg ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-neutral-200 bg-neutral-50'}`}>
        <h3 className={`font-medium mb-4 ${darkMode ? 'text-white' : 'text-neutral-800'}`}>
          LLM Model Configuration
        </h3>
        
        <div className="mb-4">
          <label htmlFor="llm_provider_id" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}> 
            Provider <span className="text-red-500">*</span>
          </label>
          <select
            id="llm_provider_id"
            value={selectedLLMProvider}
            onChange={onLLMProviderChange}
            className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500' 
                : 'border-neutral-300 focus:ring-primary-500'
            }`}
          >
            <option value="">Select a provider</option>
            {llmProviders.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.provider_name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="llm_model" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}> 
            Model <span className="text-red-500">*</span>
          </label>
          <select
            id="llm_model"
            name="llm_model"
            value={formData.llm_model || ''}
            onChange={onInputChange}
            className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500' 
                : 'border-neutral-300 focus:ring-primary-500'
            }`}
            disabled={!selectedLLMProvider}
          >
            <option value="">Select a model</option>
            {selectedLLMProvider && selectedProviderData?.provider_name === 'openai' && (
              openaiModelsWithRealtime.map(model => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))
            )}
            {selectedLLMProvider && selectedProviderData?.provider_name === 'groq' && (
              groqModelOptions.map(model => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))
            )}
            {selectedLLMProvider && selectedProviderData?.provider_name === 'anthropic' && (
              <>
                <option value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet</option>
                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (New)</option>
                <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet (Old)</option>
               
              </>
            )}
            {selectedLLMProvider && selectedProviderData?.provider_name === 'gemini' && (
              <>
                <option value="gemini-pro">Gemini Pro</option>
                <option value="gemini-ultra">Gemini Ultra</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Voice Configuration Section */}
      {isOpenAIRealtime ? (
        <div className={`border p-4 rounded-lg mt-4 ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-neutral-200 bg-neutral-50'}`}>
          <h3 className={`font-medium mb-4 ${darkMode ? 'text-white' : 'text-neutral-800'}`}>
            Voice Configuration
          </h3>
          
          <div>
            <label htmlFor="openai_realtime_voice" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}> 
              Voice <span className="text-red-500">*</span>
            </label>
            <select
              id="openai_realtime_voice"
              name="openai_realtime_voice"
              value={formData.llm_config?.voice || formData.voice_id || ''}
              onChange={onVoiceChange}
              className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500' 
                  : 'border-neutral-300 focus:ring-primary-500'
              }`}
            >
              <option value="">Select a voice</option>
              {openaiVoiceOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className={`text-xs mt-1.5 ${darkMode ? 'text-gray-400' : 'text-neutral-500'}`}>
              Select a voice for your OpenAI Realtime agent
            </p>
          </div>
        </div>
      ) : (
        <div className={`border p-4 rounded-lg mt-4 ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-neutral-200 bg-neutral-50'}`}>
          <h3 className={`font-medium mb-4 ${darkMode ? 'text-white' : 'text-neutral-800'}`}>
            Voice Configuration
          </h3>
          
          <div className="mb-4">
            <label htmlFor="tts_provider_id" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}> 
              Provider
            </label>
            <select
              id="tts_provider_id"
              value={selectedTTSProvider}
              onChange={onTTSProviderChange}
              className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500' 
                  : 'border-neutral-300 focus:ring-primary-500'
              }`}
            >
              <option value="">Select a provider</option>
              {ttsProviders.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.provider_name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="voice_id" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}> 
              Voice
            </label>
            <select
              id="voice_id"
              name="voice_id"
              value={formData.voice_id || ''}
              onChange={onVoiceChange}
              className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500' 
                  : 'border-neutral-300 focus:ring-primary-500'
              }`}
              disabled={!selectedTTSProvider}
            >
              <option value="">Select a voice</option>
              {selectedTTSProviderName === 'groq' ? (
                groqVoiceOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              ) : selectedTTSProviderName === 'elevenlabs' ? (
                elevenLabsVoiceOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              ) : selectedTTSProviderName === 'openai' ? (
                openaiVoiceOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              ) : selectedTTSProviderName === 'cartesia' ? (
                cartesiaVoiceOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              ) : (
                <option value="">Select a provider first</option>
              )}
            </select>
            <p className={`text-xs mt-1.5 ${darkMode ? 'text-gray-400' : 'text-neutral-500'}`}>
              Select a voice for your agent to use when speaking
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ModelConfigurationTab; 