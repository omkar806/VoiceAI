'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit2, Save, X, Trash2, User, Database, Cpu, Volume2, Plus, Info } from 'lucide-react';
import MainLayout from '../../../components/layout/MainLayout';
import agentService, { CollectionField, RAGDatabaseConfig, Agent, TTSConfig } from '../../../services/agent';
import CollectionFieldsEditor from '../../../components/CollectionFieldsEditor';
import { useTheme } from '../../../contexts/ThemeContext';
import { getUserLLMProviders } from '../../../services/llm';
import { getUserTTSProviders } from '../../../services/tts';
import ragService, { Collection, VectorDB } from '../../../services/rag';
import { toast } from 'react-hot-toast';
import { LLMProvider } from '../../../services/llm';
import ttsService, { TTSProvider } from '../../../services/tts';

// Animation styles
const animationStyles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out forwards;
  }
`;

// Add new interface for collection data at the top with other interfaces
interface CollectionData {
  name: string;
  metadata?: {
    file_count: number;
    total_vectors: number;
    descriptions: string[];
    embedding_models: string[];
    last_updated: string | null;
  };
}

// Update the formData type definition
interface FormData {
  name: string;
  instructions: string;
  voice_id: string;
  collection_fields: CollectionField[];
  llm_provider_id?: string;
  llm_model?: string;
  llm_config?: {
    voice?: string;
    [key: string]: any;
  };
  tts_provider_id?: string;
  tts_config?: TTSConfig;
}

// Lazy-loaded form tab components
const BasicInfoTab = React.lazy(() => import('../../../components/agent-form/BasicInfoTab'));
const ModelConfigurationTab = React.lazy(() => import('../../../components/agent-form/ModelConfigurationTab'));
const RagConfigurationTab = React.lazy(() => import('../../../components/agent-form/RagConfigurationTab'));
const ToolsConfigurationTab = React.lazy(() => import('../../../components/agent-form/ToolsConfigurationTab'));

// Enhanced header component for edit mode
const EditAgentHeader = React.memo(({ agent, isEditing, currentTab, tabs, darkMode }: {
  agent: any;
  isEditing: boolean;
  currentTab: number;
  tabs: string[];
  darkMode: boolean;
}) => {
  return (
    <div className="flex items-center justify-between mb-8 content-fade-in">
      <div className="flex items-center">
        <Link href="/agents" className="mr-4">
          <button className={`p-3 rounded-xl transition-all duration-200 group ${
            darkMode 
              ? 'text-gray-400 hover:text-white hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
          } shadow-sm hover:shadow-md gpu-accelerated`}>
            <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-0.5" />
          </button>
        </Link>
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
            {isEditing ? 'Edit Agent' : agent?.name || 'Agent Details'}
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {isEditing ? 'Modify your agent configuration' : 'View and manage agent settings'}
          </p>
        </div>
      </div>
      {isEditing && (
        <div className={`px-4 py-2 rounded-full text-sm font-medium ${
          darkMode 
            ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50' 
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          Step {currentTab + 1} of {tabs.length}
        </div>
      )}
    </div>
  );
});

// Enhanced tab navigation for edit mode
const EditTabNavigation = React.memo(({ currentTab, setCurrentTab, tabs, darkMode }: {
  currentTab: number;
  setCurrentTab: (tab: number) => void;
  tabs: string[];
  darkMode: boolean;
}) => {
  return (
    <div className="mb-8 content-fade-in">
      {/* Progress bar */}
      <div className={`w-full h-1 rounded-full mb-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            darkMode ? 'bg-blue-500' : 'bg-blue-600'
          }`}
          style={{ width: `${((currentTab + 1) / tabs.length) * 100}%` }}
        />
      </div>
      
      {/* Tab buttons */}
      <div className="flex space-x-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/50 backdrop-blur-sm">
        {tabs.map((tab, index) => {
          const isActive = currentTab === index;
          const isCompleted = currentTab > index;
          const isAccessible = index <= currentTab;
          
          return (
            <button
              key={index}
              onClick={() => setCurrentTab(index)}
              disabled={!isAccessible}
              className={`relative flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 group ${
                isActive
                  ? darkMode
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : isCompleted
                    ? darkMode
                      ? 'text-green-400 hover:bg-gray-700/50'
                      : 'text-green-600 hover:bg-gray-50'
                    : isAccessible
                      ? darkMode
                        ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      : darkMode
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-gray-400 cursor-not-allowed'
              } gpu-accelerated`}
            >
              <div className="flex items-center justify-center space-x-2">
                {/* Step indicator */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : isCompleted
                      ? darkMode
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-green-500/20 text-green-600'
                      : isAccessible
                        ? darkMode
                          ? 'bg-gray-600 text-gray-300'
                          : 'bg-gray-300 text-gray-600'
                        : darkMode
                          ? 'bg-gray-700 text-gray-600'
                          : 'bg-gray-200 text-gray-400'
                }`}>
                  {isCompleted ? '✓' : index + 1}
                </div>
                
                {/* Tab label */}
                <span className="hidden sm:inline">{tab}</span>
              </div>
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute inset-0 rounded-lg ring-2 ring-blue-500/50 ring-offset-2 ring-offset-transparent" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

// Enhanced skeleton loading component
const EditTabSkeleton = React.memo(() => {
  const { darkMode } = useTheme();
  return (
    <div className="p-8 space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-4">
        <div className={`h-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg w-1/3`}></div>
        <div className={`h-12 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-xl`}></div>
      </div>
      
      {/* Content skeleton */}
      <div className="space-y-6">
        <div className="space-y-3">
          <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg w-1/4`}></div>
          <div className={`h-32 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-xl`}></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg w-1/3`}></div>
            <div className={`h-12 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-xl`}></div>
          </div>
          <div className="space-y-3">
            <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg w-1/3`}></div>
            <div className={`h-12 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-xl`}></div>
          </div>
        </div>
        
        {/* Additional skeleton elements */}
        <div className="space-y-4">
          <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg w-1/5`}></div>
          <div className={`h-24 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-xl`}></div>
        </div>
      </div>
    </div>
  );
});

const AgentDetailsPage = () => {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;
  const { darkMode } = useTheme();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    instructions: '',
    voice_id: '',
    collection_fields: []
  });
  const [conversationCount, setConversationCount] = useState(0);
  const [llmProviders, setLLMProviders] = useState<LLMProvider[]>([]);
  const [ttsProviders, setTTSProviders] = useState<TTSProvider[]>([]);
  const [vectorDbs, setVectorDbs] = useState<VectorDB[]>([]);
  const [selectedVectorDbs, setSelectedVectorDbs] = useState<string[]>([]);
  const [ragConfigs, setRagConfigs] = useState<{ dbId: string; collectionName: string }[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [newTool, setNewTool] = useState<{
    name: string;
    description: string;
    endpoint_url: string;
    method: string;
    auth_type: string;
    auth_config: Record<string, string>;
    request_schema: string;
    response_schema: string;
  }>({
    name: '',
    description: '',
    endpoint_url: '',
    method: 'GET',
    auth_type: '',
    auth_config: {},
    request_schema: '',
    response_schema: ''
  });
  const [collectionsMap, setCollectionsMap] = useState<Record<string, CollectionData[]>>({});
  const [selectedLLMProvider, setSelectedLLMProvider] = useState<string>('');
  const [selectedTTSProvider, setSelectedTTSProvider] = useState<string>('');
  const [selectedTTSProviderName, setSelectedTTSProviderName] = useState<string>('');

  // Multi-step form state
  const [currentTab, setCurrentTab] = useState(0);
  const tabs = ['Basic Information', 'Model Configuration', 'RAG Configuration', 'Tools Configuration'];

  // Validation functions for each tab
  const validateBasicInfo = () => {
    return formData.name.trim() !== '' && formData.instructions.trim() !== '';
  };

  const validateModelConfiguration = () => {
    const hasLLMProvider = formData.llm_provider_id && formData.llm_provider_id.trim() !== '';
    const hasLLMModel = formData.llm_model && formData.llm_model.trim() !== '';
    
    // For OpenAI Realtime, voice is required in llm_config
    if (formData.llm_model === 'openai-realtime') {
      const hasVoice = formData.llm_config?.voice && formData.llm_config.voice.trim() !== '';
      return hasLLMProvider && hasLLMModel && hasVoice;
    }
    
    return hasLLMProvider && hasLLMModel;
  };

  // Function to check if current tab is valid before allowing navigation
  const canNavigateToTab = (targetTab: number) => {
    // Always allow going backwards
    if (targetTab <= currentTab) {
      return true;
    }

    // Check validation for each tab before the target
    for (let i = 0; i < targetTab; i++) {
      switch (i) {
        case 0: // Basic Information
          if (!validateBasicInfo()) {
            return false;
          }
          break;
        case 1: // Model Configuration
          if (!validateModelConfiguration()) {
            return false;
          }
          break;
        // RAG and Tools are optional, so no validation needed
        case 2:
        case 3:
          break;
      }
    }
    
    return true;
  };

  // Enhanced tab navigation that validates before allowing navigation
  const handleTabNavigation = (targetTab: number) => {
    if (canNavigateToTab(targetTab)) {
      setCurrentTab(targetTab);
    } else {
      // Show error message for missing required fields
      if (targetTab > currentTab) {
        if (currentTab === 0 && !validateBasicInfo()) {
          setError('Please fill in all required fields in Basic Information (Agent Name and Instructions) before proceeding.');
        } else if (currentTab === 1 && !validateModelConfiguration()) {
          if (formData.llm_model === 'openai-realtime') {
            setError('Please select LLM Provider, Model, and Voice before proceeding.');
          } else {
            setError('Please select LLM Provider and Model before proceeding.');
          }
        }
        
        // Clear error after 5 seconds
        setTimeout(() => setError(null), 5000);
      }
    }
  };

  // Voice options - for display in view mode
  const voiceOptions = [
    { value: 'Alloy', label: 'Alloy' },
    { value: 'Arista-PlayAI', label: 'Arista-PlayAI' },
    { value: 'Adam', label: 'Adam' }
    // This is just a sample for display purposes, not needed for selection
  ];

  // OpenAI Voice options
  const openaiVoiceOptions = [
    { value: 'alloy', label: 'Alloy' },
    { value: 'ash', label: 'Ash' },
    { value: 'ballad', label: 'Ballad' },
    { value: 'coral', label: 'Coral' },
    { value: 'echo', label: 'Echo' },
    { value: 'fable', label: 'Fable' },
    { value: 'onyx', label: 'Onyx' },
    { value: 'nova', label: 'Nova' },
    { value: 'sage', label: 'Sage' },
    { value: 'shimmer', label: 'Shimmer' },
    { value: 'verse', label: 'Verse' }
  ];

  // Groq Voice options
  const groqVoiceOptions = [
    { value: 'Arista-PlayAI', label: 'Arista-PlayAI' },
    { value: 'Atlas-PlayAI', label: 'Atlas-PlayAI' },
    { value: 'Basil-PlayAI', label: 'Basil-PlayAI' },
    { value: 'Briggs-PlayAI', label: 'Briggs-PlayAI' },
    { value: 'Calum-PlayAI', label: 'Calum-PlayAI' },
    { value: 'Celeste-PlayAI', label: 'Celeste-PlayAI' },
    { value: 'Cheyenne-PlayAI', label: 'Cheyenne-PlayAI' },
    { value: 'Chip-PlayAI', label: 'Chip-PlayAI' },
    { value: 'Cillian-PlayAI', label: 'Cillian-PlayAI' },
    { value: 'Deedee-PlayAI', label: 'Deedee-PlayAI' },
    { value: 'Fritz-PlayAI', label: 'Fritz-PlayAI' },
    { value: 'Gail-PlayAI', label: 'Gail-PlayAI' },
    { value: 'Indigo-PlayAI', label: 'Indigo-PlayAI' },
    { value: 'Mamaw-PlayAI', label: 'Mamaw-PlayAI' },
    { value: 'Mason-PlayAI', label: 'Mason-PlayAI' },
    { value: 'Mikail-PlayAI', label: 'Mikail-PlayAI' },
    { value: 'Mitch-PlayAI', label: 'Mitch-PlayAI' },
    { value: 'Quinn-PlayAI', label: 'Quinn-PlayAI' },
    { value: 'Thunder-PlayAI', label: 'Thunder-PlayAI' }
  ];

  // Cartesia Voice options
  const cartesiaVoiceOptions = [
    { value: 'bf0a246a-8642-498a-9950-80c35e9276b5', label: 'Sophie', name: 'Sophie' },
    { value: '78ab82d5-25be-4f7d-82b3-7ad64e5b85b2', label: 'Savannah', name: 'Savannah' },
    { value: '6f84f4b8-58a2-430c-8c79-688dad597532', label: 'Brooke', name: 'Brooke' },
    { value: 'a8a1eb38-5f15-4c1d-8722-7ac0f329727d', label: 'Calm French Woman', name: 'Calm French Woman' },
    { value: '5c29d7e3-a133-4c7e-804a-1d9c6dea83f6', label: 'Marta', name: 'Marta' },
    { value: '3a63e2d1-1c1e-425d-8e79-5100bc910e90', label: 'Chinese Call Center Man', name: 'Chinese Call Center Man' },
    { value: 'c99d36f3-5ffd-4253-803a-535c1bc9c306', label: 'Griffin', name: 'Griffin' },
    { value: '32b3f3c5-7171-46aa-abe7-b598964aa793', label: 'Zia', name: 'Zia' },
    { value: '79743797-2087-422f-8dc7-86f9efca85f1', label: 'Mateo', name: 'Mateo' },
    { value: 'c8605446-247c-4d39-acd4-8f4c28aa363c', label: 'Wise Lady', name: 'Wise Lady' }
  ];

  // ElevenLabs Voice options
  const elevenLabsVoiceOptions = [
    { value: 'Adam', label: 'Adam' },
    { value: 'Alice', label: 'Alice' },
    { value: 'Antoni', label: 'Antoni' },
    { value: 'Aria', label: 'Aria' },
    { value: 'Arnold', label: 'Arnold' },
    { value: 'Bill', label: 'Bill' },
    { value: 'Brian', label: 'Brian' },
    { value: 'Callum', label: 'Callum' },
    { value: 'Charlie', label: 'Charlie' },
    { value: 'Charlotte', label: 'Charlotte' },
    { value: 'Chris', label: 'Chris' },
    { value: 'Clyde', label: 'Clyde' },
    { value: 'Daniel', label: 'Daniel' },
    { value: 'Dave', label: 'Dave' },
    { value: 'Domi', label: 'Domi' },
    { value: 'Dorothy', label: 'Dorothy' },
    { value: 'Drew', label: 'Drew' },
    { value: 'Elli', label: 'Elli' },
    { value: 'Emily', label: 'Emily' },
    { value: 'Eric', label: 'Eric' },
    { value: 'Ethan', label: 'Ethan' },
    { value: 'Fin', label: 'Fin' },
    { value: 'Freya', label: 'Freya' },
    { value: 'George', label: 'George' },
    { value: 'Gigi', label: 'Gigi' },
    { value: 'Giovanni', label: 'Giovanni' },
    { value: 'Glinda', label: 'Glinda' },
    { value: 'Grace', label: 'Grace' },
    { value: 'Harry', label: 'Harry' },
    { value: 'James', label: 'James' },
    { value: 'Jerremy', label: 'Jerremy' },
    { value: 'Jessica', label: 'Jessica' },
    { value: 'Jessie', label: 'Jessie' },
    { value: 'Joseph', label: 'Joseph' },
    { value: 'Josh', label: 'Josh' },
    { value: 'Laura', label: 'Laura' },
    { value: 'Liam', label: 'Liam' },
    { value: 'Lily', label: 'Lily' },
    { value: 'Matilda', label: 'Matilda' },
    { value: 'Michael', label: 'Michael' },
    { value: 'Mimi', label: 'Mimi' },
    { value: 'Nicole', label: 'Nicole' },
    { value: 'Patrick', label: 'Patrick' },
    { value: 'Paul', label: 'Paul' },
    { value: 'River', label: 'River' },
    { value: 'Roger', label: 'Roger' },
    { value: 'Sam', label: 'Sam' },
    { value: 'Sarah', label: 'Sarah' },
    { value: 'Serena', label: 'Serena' },
    { value: 'Thomas', label: 'Thomas' },
    { value: 'Will', label: 'Will' },
    { value: 'Santa Claus', label: 'Santa Claus' }
  ];

  // Kokoro Voice options
  const kokoroVoiceOptions = [
    { value: 'af_alloy', label: 'af_alloy' },
    { value: 'af_aoede', label: 'af_aoede' },
    { value: 'af_bella', label: 'af_bella' },
    { value: 'af_heart', label: 'af_heart' },
    { value: 'af_jessica', label: 'af_jessica' },
    { value: 'af_kore', label: 'af_kore' },
    { value: 'af_nicole', label: 'af_nicole' },
    { value: 'af_nova', label: 'af_nova' },
    { value: 'af_river', label: 'af_river' },
    { value: 'af_sarah', label: 'af_sarah' },
    { value: 'af_sky', label: 'af_sky' },
    { value: 'am_adam', label: 'am_adam' },
    { value: 'am_echo', label: 'am_echo' },
    { value: 'am_eric', label: 'am_eric' },
    { value: 'am_fenrir', label: 'am_fenrir' },
    { value: 'am_liam', label: 'am_liam' },
    { value: 'am_michael', label: 'am_michael' },
    { value: 'am_onyx', label: 'am_onyx' },
    { value: 'am_puck', label: 'am_puck' },
    { value: 'bf_alice', label: 'bf_alice' },
    { value: 'bf_emma', label: 'bf_emma' },
    { value: 'bf_isabella', label: 'bf_isabella' },
    { value: 'bf_lily', label: 'bf_lily' },
    { value: 'bm_daniel', label: 'bm_daniel' },
    { value: 'bm_fable', label: 'bm_fable' },
    { value: 'bm_george', label: 'bm_george' },
    { value: 'bm_lewis', label: 'bm_lewis' },
    { value: 'ff_siwis', label: 'ff_siwis' },
    { value: 'if_sara', label: 'if_sara' },
    { value: 'im_nicola', label: 'im_nicola' },
    { value: 'jf_alpha', label: 'jf_alpha' },
    { value: 'jf_gongitsune', label: 'jf_gongitsune' },
    { value: 'jf_nezumi', label: 'jf_nezumi' },
    { value: 'jf_tebukuro', label: 'jf_tebukuro' },
    { value: 'jm_kumo', label: 'jm_kumo' },
    { value: 'zf_xiaobei', label: 'zf_xiaobei' },
    { value: 'zf_xiaoni', label: 'zf_xiaoni' },
    { value: 'zf_xiaoxiao', label: 'zf_xiaoxiao' },
    { value: 'zf_xiaoyi', label: 'zf_xiaoyi' },
    { value: 'zm_yunjian', label: 'zm_yunjian' },
    { value: 'zm_yunxi', label: 'zm_yunxi' },
    { value: 'zm_yunxia', label: 'zm_yunxia' },
    { value: 'zm_yunyang', label: 'zm_yunyang' }
  ];

  // OpenAI LLM models
  const openaiLLMModels = [
    { value: 'gpt-4o', label: 'gpt-4o' },
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
    { value: 'gpt-4.1-nano', label: 'gpt-4.1-nano' },
    { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
    { value: 'gpt-4.1', label: 'gpt-4.1' },
    { value: 'chatgpt-4o-latest', label: 'chatgpt-4o-latest' },
    { value: 'o3', label: 'o3' },
    { value: 'o3-mini', label: 'o3-mini' },
    { value: 'o1', label: 'o1' },
    { value: 'o1-mini', label: 'o1-mini' },
    { value: 'openai-realtime', label: 'OpenAI Realtime' }
  ];

  // --- Add state for new RAG/Tools logic ---
  const [showToolModal, setShowToolModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!agentId) return;

        const [agentData, llmData, ttsData, ragData] = await Promise.all([
          agentService.getAgentById(agentId),
          getUserLLMProviders(),
          getUserTTSProviders(),
          ragService.getVectorDBs()
        ]);

        setAgent(agentData);
        setConversationCount(0);
        setLLMProviders(llmData);
        setTTSProviders(ttsData);
        setVectorDbs(ragData);
        
        // Set initial LLM provider
        if (agentData.llm_provider_id) {
          setSelectedLLMProvider(agentData.llm_provider_id);
        }

        // Set initial TTS provider and name
        if (agentData.tts_provider_id) {
          setSelectedTTSProvider(agentData.tts_provider_id);
          const providerData = ttsData.find((p: { id: string | undefined; }) => p.id === agentData.tts_provider_id);
          if (providerData) {
            setSelectedTTSProviderName(providerData.provider_name);
          }
        }
        
        // Set RAG configuration
        if (agentData.rag_config && agentData.rag_config.length > 0) {
          const configs = agentData.rag_config.map(config => ({
            dbId: config.id,
            collectionName: config.collection_name
          }));
          setRagConfigs(configs);
          
          // Fetch collections for each database in the RAG config
          agentData.rag_config.forEach(async (config) => {
            await fetchCollections(config.id);
          });
        }

        // Set tools
        if (agentData.tools) {
          setTools(agentData.tools);
        }

        // Determine the correct voice value based on model type
        let voiceValue = agentData.voice_id || '';
        
        // For OpenAI Realtime, get voice from llm_config
        if (agentData.llm_model === 'openai-realtime' && agentData.llm_config && agentData.llm_config.voice) {
          voiceValue = agentData.llm_config.voice;
          
          // Log voice values for debugging
          console.log('OpenAI Realtime voice detected:', voiceValue);
          console.log('Agent llm_config:', agentData.llm_config);
        }

        // Create a deep copy of llm_config to avoid reference issues
        const llmConfigCopy = agentData.llm_config ? JSON.parse(JSON.stringify(agentData.llm_config)) : {};

        setFormData({
          name: agentData.name || '',
          instructions: agentData.instructions || '',
          voice_id: voiceValue,
          collection_fields: agentData.collection_fields || [],
          llm_provider_id: agentData.llm_provider_id,
          llm_model: agentData.llm_model,
          llm_config: llmConfigCopy,
          tts_provider_id: agentData.tts_provider_id,
          tts_config: agentData.tts_config
        });
      } catch (error) {
        console.error('Error fetching agent details:', error);
        toast.error('Failed to load agent details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [agentId]);

  // Handle LLM provider change
  const handleLLMProviderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerId = e.target.value;
    setSelectedLLMProvider(providerId);
    
    setFormData(prev => ({
      ...prev,
      llm_provider_id: providerId,
      llm_model: ''  // Reset model when provider changes
    }));
  }, []);

  // Update handleInputChange to detect OpenAI Realtime model selection
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If changing the model to openai-realtime, clear TTS provider
    if (name === 'llm_model' && value === 'openai-realtime') {
      setSelectedTTSProvider('');
      setSelectedTTSProviderName('');
      
      // Get a default voice from OpenAI options
      const currentVoice = formData.voice_id || openaiVoiceOptions[0]?.value || 'alloy';
      console.log('Switching to OpenAI Realtime with voice:', currentVoice);
      
      const newFormData = {
        ...formData,
        [name]: value,
        tts_provider_id: undefined,
        tts_config: undefined,
        voice_id: currentVoice, // Set voice_id for consistency
        llm_config: {
          ...(formData.llm_config || {}),
          voice: currentVoice
        }
      };
      
      setFormData(newFormData);
      
      // Update the agent data for immediate UI feedback
      if (agent) {
        setAgent({
          ...agent,
          [name]: value,
          tts_provider_id: undefined,
          tts_config: undefined,
          voice_id: currentVoice,
          llm_config: {
            ...(agent.llm_config || {}),
            voice: currentVoice
          }
        });
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, [formData, openaiVoiceOptions, agent]);

  // Update handleCollectionFieldsChange to use useCallback
  const handleCollectionFieldsChange = useCallback((fields: CollectionField[]) => {
    setFormData(prev => ({ ...prev, collection_fields: fields }));
  }, []);

  const fetchCollections = async (dbId: string) => {
    try {
      // Fetch collections
      const collections = await ragService.listCollections(dbId);
      
      // Fetch metadata for each collection
      const collectionsWithMetadata = await Promise.all(
        collections.map(async (collection) => {
          try {
            const metadata = await ragService.getCollectionMetadata(dbId, collection.name);
            return {
              ...collection,
              metadata
            };
          } catch (error) {
            console.error(`Error fetching metadata for collection ${collection.name}:`, error);
            return collection;
          }
        })
      );
      
      setCollectionsMap(prev => ({
        ...prev,
        [dbId]: collectionsWithMetadata
      }));
      
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const handleVectorDbChange = (dbId: string) => {
    setSelectedVectorDbs(prev => {
      if (prev.includes(dbId)) {
        return prev.filter(id => id !== dbId);
      }
      return [...prev, dbId];
    });
  };

  const handleRagConfigChange = (dbId: string, field: string, value: string) => {
    // Implementation of handleRagConfigChange
  };

  const handleToolInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTool(prev => ({ ...prev, [name]: value }));
  };

  const handleAuthTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const authType = e.target.value;
    setNewTool(prev => ({
      ...prev,
      auth_type: authType,
      auth_config: {}
    }));
  };

  const handleAuthConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTool(prev => ({
      ...prev,
      auth_config: { ...prev.auth_config, [name]: value }
    }));
  };

  const handleAddTool = () => {
    setTools(prev => [...prev, { ...newTool }]);
    setNewTool({
      name: '',
      description: '',
      endpoint_url: '',
      method: 'GET',
      auth_type: '',
      auth_config: {},
      request_schema: '',
      response_schema: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Prepare RAG config data
      const ragConfig = selectedVectorDbs.map(dbId => {
        const db = vectorDbs.find(d => d.id === dbId);
        const config = ragConfigs.find(c => c.dbId === dbId);
        return {
          id: dbId,
          collection_name: config?.collectionName || '',
          embedding_model: 'text-embedding-3-small',
          description: db?.description || undefined
        };
      });

      const updateData = {
        ...formData,
        rag_config: ragConfig.length > 0 ? ragConfig : undefined,
        tools: tools.length > 0 ? tools : undefined
      };

      await agentService.updateAgent(agentId, updateData);
      
      setAgent({ ...agent, ...updateData });
      setIsEditing(false);
      setSuccess('Agent updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating agent:', err);
      setError('Failed to update agent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await agentService.deleteAgent(agentId);
      router.push('/agents');
    } catch (err) {
      console.error('Error deleting agent:', err);
      setError('Failed to delete agent. Please try again.');
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  // Helper functions to get provider info
  const getLLMProviderInfo = () => {
    if (!agent?.llm_provider_id) return null;
    return llmProviders.find(p => p.id === agent.llm_provider_id);
  };
  
  const getTTSProviderInfo = () => {
    if (!agent?.tts_provider_id) return null;
    return ttsProviders.find(p => p.id === agent.tts_provider_id);
  };
  
  const getVectorDBInfo = (dbId: string): VectorDB | undefined => {
    return vectorDbs.find((db: VectorDB) => db.id === dbId);
  };

  // Handle voice change for OpenAI Realtime model
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voice = e.target.value;
    
    // For OpenAI Realtime model, store voice in llm_config
    if (formData.llm_model === 'openai-realtime') {
      setFormData(prev => {
        // Create a new formData object with updated llm_config
        const newFormData = {
          ...prev,
          // Also set voice_id to the same value for consistency
          voice_id: voice,
          llm_config: {
            ...(prev.llm_config || {}),
            voice
          }
        };
        
        // Update the UI immediately by updating the agent data too
        if (agent) {
          setAgent({
            ...agent,
            voice_id: voice,
            llm_config: {
              ...(agent.llm_config || {}),
              voice
            }
          });
        }
        
        return newFormData;
      });
    } else {
      // For regular TTS providers, store in voice_id
      setFormData(prev => ({
        ...prev,
        voice_id: voice
      }));
      
      // Update the agent data for immediate UI feedback
      if (agent) {
        setAgent({
          ...agent,
          voice_id: voice
        });
      }
    }
  };

  // --- RAG handlers ---
  const handleAddRagConfig = async (dbId: string, collectionName: string) => {
    try {
      setLoading(true);
      // Add the new config to existing configs
      const newRagConfigs = [...ragConfigs, { dbId, collectionName }];
      setRagConfigs(newRagConfigs);
      
      // Convert to the format expected by the API
      const ragConfigArr = newRagConfigs.map(config => ({
        id: config.dbId,
        collection_name: config.collectionName,
        embedding_model: 'text-embedding-3-small'
      }));
      
      // Update the agent
      await agentService.updateAgent(agentId, { ...formData, rag_config: ragConfigArr });
      toast.success('RAG configuration added');
    } catch (err) {
      toast.error('Failed to add RAG configuration');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteRagConfig = async (index: number) => {
    try {
      setLoading(true);
      // Remove the config at the specified index
      const newRagConfigs = ragConfigs.filter((_, i) => i !== index);
      setRagConfigs(newRagConfigs);
      
      // Convert to the format expected by the API
      const ragConfigArr = newRagConfigs.map(config => ({
        id: config.dbId,
        collection_name: config.collectionName,
        embedding_model: 'text-embedding-3-small'
      }));
      
      // Update the agent
      await agentService.updateAgent(agentId, { ...formData, rag_config: ragConfigArr });
      toast.success('RAG configuration removed');
    } catch (err) {
      toast.error('Failed to remove RAG configuration');
    } finally {
      setLoading(false);
    }
  };

  // --- Tools modal handlers ---
  const handleOpenToolModal = () => setShowToolModal(true);
  const handleCloseToolModal = () => setShowToolModal(false);
  const handleAddToolModal = async () => {
    try {
      setLoading(true);
      // Use agentService.createAgentTool to add tool
      const createdTool = await agentService.createAgentTool(agentId, newTool);
      setTools([...tools, createdTool]);
      setNewTool({ name: '', description: '', endpoint_url: '', method: 'GET', auth_type: '', auth_config: {}, request_schema: '', response_schema: '' });
      setShowToolModal(false);
      toast.success('Tool added');
    } catch (err) {
      toast.error('Failed to add tool');
    } finally {
      setLoading(false);
    }
  };
  const handleRemoveTool = async (index: number) => {
    try {
      setLoading(true);
      const toolToRemove = tools[index];
      if (toolToRemove && toolToRemove.id) {
        await agentService.deleteAgentTool(agentId, toolToRemove.id);
        setTools(tools.filter((_, i) => i !== index));
        toast.success('Tool removed');
      } else {
        toast.error('Tool id not found');
      }
    } catch (err) {
      toast.error('Failed to remove tool');
    } finally {
      setLoading(false);
    }
  };

  // Make fetchCollections available as a callback for the RagConfigurationTab
  const handleFetchCollections = useCallback(async (dbId: string) => {
    try {
      await fetchCollections(dbId);
    } catch (error) {
      console.error("Error fetching collections:", error);
    }
  }, []);

  // Update the provider type in the handleTTSProviderChange function
  const handleTTSProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerId = e.target.value;
    setSelectedTTSProvider(providerId);
    
    // Find the provider data
    const providerData = ttsProviders.find((p: TTSProvider) => p.id === providerId);
    
    if (providerData) {
      // Set the provider name for voice selection
      setSelectedTTSProviderName(providerData.provider_name);
      
      let voice = '';
      if (providerData.provider_name === 'groq' && groqVoiceOptions.length > 0) {
        // For Groq, pre-select the first voice option
        voice = groqVoiceOptions[0].value;
      } else if (providerData.provider_name === 'elevenlabs' && elevenLabsVoiceOptions.length > 0) {
        // For ElevenLabs, pre-select the first voice option
        voice = elevenLabsVoiceOptions[0].value;
      } else if (providerData.provider_name === 'openai' && openaiVoiceOptions.length > 0) {
        // For OpenAI, pre-select the first voice option
        voice = openaiVoiceOptions[0].value;
      } else if (providerData.provider_name === 'cartesia' && cartesiaVoiceOptions.length > 0) {
        // For Cartesia, pre-select the first voice option
        voice = cartesiaVoiceOptions[0].value;
      }
      
      const ttsConfig: TTSConfig = {
        provider: providerData.provider_name,
        api_key: "not given",
        voice: voice
      };
      
      // Add provider-specific fields if applicable
      if (providerData.provider_name === 'groq' || providerData.provider_name === 'elevenlabs' || 
          providerData.provider_name === 'openai' || providerData.provider_name === 'cartesia') {
        // No additional fields needed for these providers
        // Just use the voice as is
      }
      
      setFormData(prev => ({
        ...prev,
        tts_provider_id: providerId,
        tts_config: ttsConfig,
        voice_id: voice
      }));
    } else {
      // Clear TTS config if no provider selected
      setSelectedTTSProviderName('');
      setFormData(prev => ({
        ...prev,
        tts_provider_id: undefined,
        tts_config: undefined,
        voice_id: ''
      }));
    }
  };

  if (loading && !agent) {
    return (
      <MainLayout>
        <div className={`${darkMode ? 'bg-gray-900' : ''} min-h-screen`}>
          <div className="max-w-4xl mx-auto p-6">
            <div className="animate-pulse">
              <div className="flex items-center mb-6">
                <div className={`w-10 h-10 ${darkMode ? 'bg-gray-700' : 'bg-neutral-200'} rounded-md mr-4`}></div>
                <div className={`h-8 ${darkMode ? 'bg-gray-700' : 'bg-neutral-200'} rounded-md w-1/3`}></div>
              </div>
              <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-neutral-200'} rounded-md w-full mb-6`}></div>
              <div className={`${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-neutral-200'
              } rounded-lg shadow-sm border p-6 mb-6`}>
                <div className={`h-6 ${darkMode ? 'bg-gray-700' : 'bg-neutral-200'} rounded-md w-1/4 mb-4`}></div>
                <div className={`h-24 ${darkMode ? 'bg-gray-700' : 'bg-neutral-200'} rounded-md mb-6`}></div>
                <div className={`h-6 ${darkMode ? 'bg-gray-700' : 'bg-neutral-200'} rounded-md w-1/4 mb-4`}></div>
                <div className={`h-12 ${darkMode ? 'bg-gray-700' : 'bg-neutral-200'} rounded-md mb-6`}></div>
                <div className={`h-6 ${darkMode ? 'bg-gray-700' : 'bg-neutral-200'} rounded-md w-1/4 mb-4`}></div>
                <div className={`h-36 ${darkMode ? 'bg-gray-700' : 'bg-neutral-200'} rounded-md`}></div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} gpu-accelerated`}>
        <div className="max-w-4xl mx-auto p-6">
          {/* Enhanced header */}
          <EditAgentHeader 
            agent={agent}
            isEditing={isEditing}
            currentTab={currentTab}
            tabs={tabs}
            darkMode={darkMode}
          />

          {/* Enhanced error message */}
          {error && (
            <div className={`mb-8 p-6 rounded-2xl border-2 flex items-start space-x-4 shadow-lg content-fade-in gpu-accelerated ${
              darkMode 
                ? 'bg-red-900/20 text-red-400 border-red-800/50 shadow-red-900/20' 
                : 'bg-red-50 text-red-700 border-red-200 shadow-red-100/50'
            }`}>
              <div className={`p-2 rounded-full ${
                darkMode ? 'bg-red-800/30' : 'bg-red-100'
              }`}>
                <X size={20} className="flex-shrink-0" />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${darkMode ? 'text-red-300' : 'text-red-800'}`}>
                  Error
                </h3>
                <p className="text-sm">{error}</p>
              </div>
              <button 
                className={`p-2 rounded-full transition-colors ${
                  darkMode 
                    ? 'text-red-400 hover:text-red-300 hover:bg-red-900/30' 
                    : 'text-red-700 hover:text-red-800 hover:bg-red-100'
                } gpu-accelerated`}
                onClick={() => setError(null)}
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Enhanced success message */}
          {success && (
            <div className={`mb-8 p-6 rounded-2xl border-2 flex items-start space-x-4 shadow-lg content-fade-in gpu-accelerated ${
              darkMode 
                ? 'bg-green-900/20 text-green-400 border-green-800/50 shadow-green-900/20' 
                : 'bg-green-50 text-green-700 border-green-200 shadow-green-100/50'
            }`}>
              <div className={`p-2 rounded-full ${
                darkMode ? 'bg-green-800/30' : 'bg-green-100'
              }`}>
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
                  Success
                </h3>
                <p className="text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* Enhanced main content container */}
          <div className={`${
            darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/80 border-gray-200/50'
          } rounded-2xl border shadow-xl backdrop-blur-sm content-fade-in gpu-accelerated overflow-hidden`}>
            {isEditing ? (
              <>
                {/* Enhanced tab navigation */}
                <EditTabNavigation 
                  currentTab={currentTab}
                  setCurrentTab={handleTabNavigation}
                  tabs={tabs}
                  darkMode={darkMode}
                />
                
                <div className="p-8 space-y-6">
                  <Suspense fallback={<EditTabSkeleton />}>
                    {/* Basic Information Tab */}
                    {currentTab === 0 && (
                      <div className="space-y-6">
                        <BasicInfoTab
                          formData={formData}
                          onInputChange={handleInputChange}
                          onCollectionFieldsChange={handleCollectionFieldsChange}
                          darkMode={darkMode}
                        />
                      </div>
                    )}

                    {/* Model Configuration Tab */}
                    {currentTab === 1 && (
                      <div className="space-y-6">
                        <ModelConfigurationTab
                          formData={formData}
                          darkMode={darkMode}
                          llmProviders={llmProviders}
                          ttsProviders={ttsProviders}
                          selectedLLMProvider={selectedLLMProvider}
                          selectedTTSProvider={selectedTTSProvider}
                          selectedTTSProviderName={selectedTTSProviderName}
                          openaiLLMModels={openaiLLMModels}
                          onLLMProviderChange={handleLLMProviderChange}
                          onTTSProviderChange={handleTTSProviderChange}
                          onInputChange={handleInputChange}
                          onVoiceChange={handleVoiceChange}
                          openaiVoiceOptions={openaiVoiceOptions}
                          groqVoiceOptions={groqVoiceOptions}
                          cartesiaVoiceOptions={cartesiaVoiceOptions}
                          elevenLabsVoiceOptions={elevenLabsVoiceOptions}
                        />
                      </div>
                    )}

                    {/* RAG Configuration Tab */}
                    {currentTab === 2 && (
                      <div className="space-y-6">
                        <RagConfigurationTab
                          vectorDbs={vectorDbs}
                          ragConfigs={ragConfigs}
                          collectionsMap={collectionsMap}
                          onAddRagConfig={handleAddRagConfig}
                          onDeleteRagConfig={handleDeleteRagConfig}
                          darkMode={darkMode}
                          onFetchCollections={handleFetchCollections}
                        />
                      </div>
                    )}

                    {/* Tools Configuration Tab */}
                    {currentTab === 3 && (
                      <div className="space-y-6">
                        <ToolsConfigurationTab
                          tools={tools}
                          showAddModal={showToolModal}
                          newTool={newTool}
                          onToolInputChange={handleToolInputChange}
                          onAuthTypeChange={handleAuthTypeChange}
                          onAuthConfigChange={handleAuthConfigChange}
                          onAddTool={handleAddToolModal}
                          onRemoveTool={handleRemoveTool}
                          onOpenAddModal={handleOpenToolModal}
                          onCloseAddModal={handleCloseToolModal}
                          darkMode={darkMode}
                        />
                      </div>
                    )}
                  </Suspense>

                  {/* Enhanced action buttons */}
                  <div className="flex justify-between items-center content-fade-in">
                    <div className="flex space-x-4">
                      {currentTab > 0 && (
                        <button
                          type="button"
                          onClick={() => handleTabNavigation(currentTab - 1)}
                          className={`px-6 py-3 border-2 rounded-xl font-medium transition-all duration-200 group ${
                            darkMode
                              ? 'border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                          } shadow-sm hover:shadow-md gpu-accelerated`}
                        >
                          <div className="flex items-center space-x-2">
                            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
                            <span>Previous</span>
                          </div>
                        </button>
                      )}
                    </div>

                    <div className="flex space-x-4 items-center">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className={`px-6 py-3 border-2 rounded-xl font-medium transition-all duration-200 ${
                          darkMode
                            ? 'border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                        } shadow-sm hover:shadow-md gpu-accelerated`}
                      >
                        Cancel
                      </button>
                      
                      {currentTab < tabs.length - 1 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleTabNavigation(currentTab + 1);
                          }}
                          className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 group shadow-lg hover:shadow-xl ${
                            darkMode
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25 hover:shadow-blue-600/40'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25 hover:shadow-blue-600/40'
                          } gpu-accelerated transform hover:scale-105`}
                        >
                          <div className="flex items-center space-x-2">
                            <span>Continue</span>
                            <ArrowLeft size={16} className="rotate-180 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={loading}
                          className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 group shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                            darkMode
                              ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white shadow-green-600/25 hover:shadow-green-600/40'
                              : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white shadow-green-600/25 hover:shadow-green-600/40'
                          } gpu-accelerated transform hover:scale-105 disabled:hover:scale-100`}
                        >
                          {loading ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                              <span>Saving Changes...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Save size={18} />
                              <span>Save Changes</span>
                            </div>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div className={`flex items-center justify-between p-6 border-b ${
                  darkMode 
                    ? 'bg-gray-700/30 border-gray-700' 
                    : 'bg-gray-50/80 border-gray-200'
                }`}>
                  <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                    <div className={`p-2 rounded-xl mr-3 ${
                      darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'
                    }`}>
                      <User size={20} />
                    </div>
                    Agent Configuration
                  </h2>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setIsEditing(true)}
                      className={`p-3 rounded-xl transition-all duration-200 group ${
                        darkMode 
                          ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-700/50 border border-gray-700 hover:border-blue-600' 
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 hover:border-blue-300'
                      } shadow-sm hover:shadow-md gpu-accelerated`}
                    >
                      <Edit2 size={18} className="transition-transform group-hover:scale-110" />
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className={`p-3 rounded-xl transition-all duration-200 group ${
                        darkMode 
                          ? 'text-gray-300 hover:text-red-400 hover:bg-gray-700/50 border border-gray-700 hover:border-red-600' 
                          : 'text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-300'
                      } shadow-sm hover:shadow-md gpu-accelerated`}
                    >
                      <Trash2 size={18} className="transition-transform group-hover:scale-110" />
                    </button>
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  {/* Instructions Section */}
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'} flex items-center`}>
                      <div className={`w-2 h-2 rounded-full mr-3 ${
                        darkMode ? 'bg-blue-400' : 'bg-blue-500'
                      }`}></div>
                      Instructions
                    </h3>
                    <div className={`${
                      darkMode 
                        ? 'bg-gray-700/50 border-gray-600/50 text-gray-200' 
                        : 'bg-gray-50/80 border-gray-200/50 text-gray-800'
                    } p-6 rounded-xl border backdrop-blur-sm whitespace-pre-wrap text-sm leading-relaxed shadow-sm`}>
                      {agent?.instructions || (
                        <span className={`italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          No instructions provided.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Data Collection Fields Section */}
                  <div className="space-y-4">
                    <h3 className={`text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'} flex items-center`}>
                      <div className={`w-2 h-2 rounded-full mr-3 ${
                        darkMode ? 'bg-indigo-400' : 'bg-indigo-500'
                      }`}></div>
                      Data Collection Fields
                    </h3>
                    <div className={`${
                      darkMode 
                        ? 'bg-gray-700/50 border-gray-600/50 text-gray-200' 
                        : 'bg-gray-50/80 border-gray-200/50 text-gray-800'
                    } p-6 rounded-xl border backdrop-blur-sm shadow-sm min-h-[80px] flex items-center`}>
                      {agent?.collection_fields && agent.collection_fields.length > 0 ? (
                        <div className="flex flex-wrap gap-3 w-full">
                          {agent.collection_fields.map((field: CollectionField, index: number) => (
                            <div key={index} className={`inline-flex items-center px-4 py-2 rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md ${
                              darkMode 
                                ? 'bg-gray-800/50 border-gray-600/50 hover:border-gray-500' 
                                : 'bg-white/80 border-gray-200/50 hover:border-gray-300'
                            } gpu-accelerated`}>
                              <span className="font-medium text-sm">{field.name}</span>
                              <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {field.type}
                              </span>
                              {field.required && (
                                <span className="ml-2 text-red-500 text-sm font-bold">*</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className={`italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          No data collection fields configured
                        </span>
                      )}
                    </div>
                  </div>

                  {/* LLM Configuration */}
                  <div className="pt-4 mt-4 border-t border-dashed border-gray-400">
                    <div className="flex items-center mb-3">
                      <Cpu size={18} className={`mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        LLM Configuration
                      </h3>
                    </div>
                    
                    {agent?.llm_provider_id ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Provider</p>
                          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {getLLMProviderInfo()?.provider_name || 'Unknown provider'}
                          </p>
                        </div>
                        <div>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Model</p>
                          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {agent?.llm_model || 'Not specified'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className={`text-sm italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        No LLM configuration specified
                      </p>
                    )}
                  </div>
                  
                  {/* Voice/TTS Configuration */}
                  <div className="pt-4 mt-4 border-t border-dashed border-gray-400">
                    <div className="flex items-center mb-3">
                      <Volume2 size={18} className={`mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        Voice Configuration
                      </h3>
                    </div>
                    
                    {/* For OpenAI Realtime, display voice from llm_config */}
                    {agent?.llm_model === 'openai-realtime' && agent?.llm_config?.voice ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Voice</p>
                          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {agent.llm_config.voice}
                          </p>
                        </div>
                      </div>
                    ) : agent?.tts_provider_id ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Provider</p>
                          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {getTTSProviderInfo()?.provider_name || 'Unknown provider'}
                          </p>
                        </div>
                        <div>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Voice</p>
                          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {agent?.voice_id || agent?.tts_config?.voice || 'Default voice'}
                          </p>
                        </div>
                      </div>
                    ) : agent?.llm_model === 'openai-realtime' ? (
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Voice</p>
                          <p className={`text-sm italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No voice selected
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className={`text-sm italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        No voice configuration specified
                      </p>
                    )}
                  </div>
                  
                  {/* RAG Configuration (view-only, non-interactive) */}
                  <div className={`border p-4 rounded-lg ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                    <h3 className={`font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>RAG Configuration</h3>
                    <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Connect your agent to vector databases for Retrieval Augmented Generation (RAG) capabilities.</p>
                    {ragConfigs.length > 0 ? (
                      <div className="space-y-4">
                        {ragConfigs.map((config, index) => {
                          const db = vectorDbs.find(d => d.id === config.dbId);
                          return (
                            <div key={`${config.dbId}-${index}`} className={`p-4 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                              <div className="font-medium mb-1">
                                {db?.name || 'Unknown Database'}
                              </div>
                              <div className="text-sm mb-1">
                                Collection: <span className="font-semibold">{config.collectionName}</span>
                              </div>
                              {collectionsMap[config.dbId] && collectionsMap[config.dbId].length > 0 && 
                                collectionsMap[config.dbId].find(c => c.name === config.collectionName)?.metadata && (
                                <div className={`mt-2 p-3 text-xs rounded ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                                  <div>Files: {collectionsMap[config.dbId].find(c => c.name === config.collectionName)?.metadata?.file_count || 0}</div>
                                  <div>Vectors: {collectionsMap[config.dbId].find(c => c.name === config.collectionName)?.metadata?.total_vectors || 0}</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No RAG configuration set.</div>
                    )}
                  </div>

                  {/* Tools Section (view-only) */}
                  <div className={`border p-4 rounded-lg mt-6 ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                    <h3 className={`font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Tools</h3>
                    {agent?.tools && agent.tools.length > 0 ? (
                      <div className="space-y-4">
                        {agent.tools.map((tool: any, idx: number) => (
                          <div key={tool.id || idx} className={`p-4 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <div className="font-semibold mb-1">{tool.name || 'No name'}</div>
                            <div className="text-sm mb-1">{tool.description || 'No description provided.'}</div>
                            <div className="text-xs text-gray-400 mb-1">{tool.endpoint_url || 'No endpoint URL'}</div>
                            <div className="text-xs text-gray-400">Method: {tool.method || 'Not specified'}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No tools configured.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delete confirmation modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${
              darkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-neutral-200'
            } rounded-lg p-6 w-full max-w-md shadow-xl border transform transition-all animate-fadeIn`}>
              <div className="mb-5 flex items-center">
                <div className={`${
                  darkMode ? 'bg-red-900/30' : 'bg-red-100'
                } p-2 rounded-full mr-3`}>
                  <Trash2 size={20} className={darkMode ? 'text-red-500' : 'text-red-600'} />
                </div>
                <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-neutral-800'}`}>
                  Delete Agent
                </h3>
              </div>
              <p className={`${darkMode ? 'text-gray-300' : 'text-neutral-600'} mb-5`}>
                Are you sure you want to delete <span className={`font-medium ${darkMode ? 'text-white' : 'text-neutral-800'}`}>
                  {agent?.name}
                </span>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button 
                  className={`px-4 py-2 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                    darkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700 focus:ring-gray-500' 
                      : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-400'
                  }`}
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className={`px-4 py-2 ${
                    darkMode 
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  } text-white rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors`}
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AgentDetailsPage;