'use client';
import React, { useState, useEffect, useCallback, Suspense, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Info, Save, Plus, Database, X } from 'lucide-react';
import MainLayout from '../../../components/layout/MainLayout';
import agentService, { CreateAgentData as AgentDataType, CollectionField, RAGDatabaseConfig, TTSConfig } from '../../../services/agent';
import CollectionFieldsEditor from '../../../components/CollectionFieldsEditor';
import { useTheme } from '../../../contexts/ThemeContext';
import { getUserLLMProviders } from '../../../services/llm';
import { getUserTTSProviders } from '../../../services/tts';
import ragService, { Collection, VectorDB } from '../../../services/rag';
import { toast } from 'react-hot-toast';
import { LLMProvider } from '../../../services/llm';
import ttsService, { TTSProvider } from '../../../services/tts';
import { useDarkMode } from '../../../contexts/DarkModeContext';
import useToast from '../../../hooks/useToast';

// Lazy-loaded form tab components with fast loading fallbacks
const BasicInfoTab = React.lazy(() => import('../../../components/agent-form/BasicInfoTab'));
const ModelConfigurationTab = React.lazy(() => import('../../../components/agent-form/ModelConfigurationTab'));
const RagConfigurationTab = React.lazy(() => import('../../../components/agent-form/RagConfigurationTab'));
const ToolsConfigurationTab = React.lazy(() => import('../../../components/agent-form/ToolsConfigurationTab'));

// Fast loading skeleton components
const TabSkeleton = React.memo(() => {
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

// Fast header component that renders immediately
const CreateAgentHeader = React.memo(({ currentTab, tabs }: { currentTab: number; tabs: string[] }) => {
  const { darkMode } = useTheme();
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
            Create New Agent
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Build an intelligent agent with custom capabilities
          </p>
        </div>
      </div>
      <div className={`px-4 py-2 rounded-full text-sm font-medium ${
        darkMode 
          ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50' 
          : 'bg-blue-50 text-blue-700 border border-blue-200'
      }`}>
        Step {currentTab + 1} of {tabs.length}
      </div>
    </div>
  );
});

// Fast tab navigation that renders immediately
const TabNavigation = React.memo(({ currentTab, setCurrentTab, tabs }: {
  currentTab: number;
  setCurrentTab: (tab: number) => void;
  tabs: string[];
}) => {
  const { darkMode } = useTheme();
  
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

// Add new interface for collection data
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

// Update the form data interface with a different name to avoid conflict
interface FormAgentData {
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
  rag_configs?: RAGDatabaseConfig[];
  tools?: any[];
}

const CreateAgentPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormAgentData>({
    name: '',
    instructions: '',
    voice_id: '',
    collection_fields: []
  });
  const { darkMode } = useTheme();
  const [isPending, startTransition] = useTransition();

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

  // State for provider data - start with empty arrays for instant UI
  const [llmProviders, setLLMProviders] = useState<any[]>([]);
  const [ttsProviders, setTTSProviders] = useState<any[]>([]);
  const [vectorDbs, setVectorDbs] = useState<any[]>([]);
  const [selectedVectorDbs, setSelectedVectorDbs] = useState<string[]>([]);
  const [selectedLLMProvider, setSelectedLLMProvider] = useState<string>('');
  const [selectedTTSProvider, setSelectedTTSProvider] = useState<string>('');
  const [selectedTTSProviderName, setSelectedTTSProviderName] = useState<string>('');
  const [ragConfigData, setRagConfigData] = useState<{ [key: string]: { collection_name: string } }>({});

  // Add state for tools configuration
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

  // Update the state type
  const [collectionsMap, setCollectionsMap] = useState<Record<string, CollectionData[]>>({});

  // Add state for file counts
  const [collectionFileCounts, setCollectionFileCounts] = useState<Record<string, Record<string, number>>>({});

  // --- Add state for new RAG/Tools logic ---
  const [ragConfigs, setRagConfigs] = useState<{ dbId: string; collectionName: string }[]>([]);
  const [showToolModal, setShowToolModal] = useState(false);

  // Data loading state
  const [dataLoaded, setDataLoaded] = useState(false);

  // Voice options arrays (keeping the same as before)
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

  // Optimized data fetching - load asynchronously after UI renders
  const fetchProviders = useCallback(async () => {
    try {
      const [llmData, ttsData, vectorData] = await Promise.all([
        getUserLLMProviders(),
        getUserTTSProviders(),
        ragService.getVectorDBs()
      ]);
      
      startTransition(() => {
        setLLMProviders(llmData);
        setTTSProviders(ttsData);
        setVectorDbs(vectorData);
        setDataLoaded(true);
      });
    } catch (error) {
      console.error('Error fetching providers:', error);
      setError('Failed to load provider data. Some features may be limited.');
    }
  }, []);

  // Load data after component mounts (non-blocking)
  useEffect(() => {
    // Small delay to ensure UI renders first
    const timer = setTimeout(() => {
      fetchProviders();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [fetchProviders]);

  // Handle form input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If changing the model to openai-realtime, clear TTS provider
    if (name === 'llm_model' && value === 'openai-realtime') {
      setSelectedTTSProvider('');
      setSelectedTTSProviderName('');
      setFormData(prev => ({
        ...prev,
        [name]: value,
        tts_provider_id: undefined,
        tts_config: undefined
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  // Handle collection fields changes
  const handleCollectionFieldsChange = useCallback((fields: CollectionField[]) => {
    setFormData(prev => ({ ...prev, collection_fields: fields }));
  }, []);

  // Handle LLM provider selection
  const handleLLMProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerId = e.target.value;
    setSelectedLLMProvider(providerId);
    setFormData(prev => ({
      ...prev,
      llm_provider_id: providerId,
      llm_model: '', // Reset model when provider changes
      llm_config: {}
    }));
  };

  // Handle TTS provider selection
  const handleTTSProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerId = e.target.value;
    const provider = ttsProviders.find(p => p.id === providerId);
    setSelectedTTSProvider(providerId);
    setSelectedTTSProviderName(provider?.provider_name || '');
    setFormData(prev => ({
      ...prev,
      tts_provider_id: providerId,
      voice_id: '', // Reset voice when provider changes
      tts_config: undefined
    }));
  };

  // Handle voice selection
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voiceId = e.target.value;
    
    // Check if the model is OpenAI-realtime
    const isOpenAIRealtime = formData.llm_model === 'openai-realtime';
    
    if (isOpenAIRealtime) {
      // For OpenAI-realtime, update voice_id and store in llm_config
      setFormData(prev => ({
        ...prev,
        voice_id: voiceId,
        llm_config: {
          ...prev.llm_config,
          voice: voiceId
        }
      }));
        } else {
      // For regular TTS providers, update voice_id and TTS config
      setFormData(prev => ({
        ...prev,
        voice_id: voiceId,
        tts_config: prev.tts_config ? {
          ...prev.tts_config,
            voice: voiceId
        } : undefined
      }));
        }
  };

  // Update the fetchCollections function
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

  // Update handleVectorDbChange to initialize without embedding_model
  const handleVectorDbChange = (dbId: string) => {
    const newSelected = [...selectedVectorDbs];
    const index = newSelected.indexOf(dbId);
    
    if (index === -1) {
      newSelected.push(dbId);
      
      // Initialize the RAG config for this DB (without embedding_model)
      setRagConfigData(prev => ({
        ...prev,
        [dbId]: {
          collection_name: ''
        }
      }));
      
      // Fetch collections for this database
      fetchCollections(dbId);
    } else {
      newSelected.splice(index, 1);
      
      // Remove this DB from the RAG config
      const newRagConfig = { ...ragConfigData };
      delete newRagConfig[dbId];
      setRagConfigData(newRagConfig);
    }
    
    setSelectedVectorDbs(newSelected);
  };

  // Handle RAG config changes
  const handleRagConfigChange = (dbId: string, field: string, value: string) => {
    setRagConfigData(prev => ({
      ...prev,
      [dbId]: {
        ...prev[dbId],
        [field]: value
      }
    }));
  };

  // --- RAG handlers ---
  const handleAddRagConfig = (dbId: string, collectionName: string) => {
    setRagConfigs(prev => [...prev, { dbId, collectionName }]);
  };
  
  const handleDeleteRagConfig = (index: number) => {
    setRagConfigs(prev => prev.filter((_, i) => i !== index));
  };

  // Handle new tool input changes
  const handleToolInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTool(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle auth type change
  const handleAuthTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const authType = e.target.value;
    
    // Reset auth config when changing auth type
    setNewTool(prev => ({
      ...prev,
      auth_type: authType,
      auth_config: {}
    }));
  };

  // Handle auth config changes
  const handleAuthConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTool(prev => ({
      ...prev,
      auth_config: {
        ...prev.auth_config,
        [name]: value
      }
    }));
  };

  // --- Tools modal handlers ---
  const handleOpenToolModal = () => setShowToolModal(true);
  const handleCloseToolModal = () => setShowToolModal(false);
  const handleAddToolModal = () => {
    setTools(prev => [...prev, { ...newTool, id: `temp-${Date.now()}` }]);
    setNewTool({ name: '', description: '', endpoint_url: '', method: 'GET', auth_type: '', auth_config: {}, request_schema: '', response_schema: '' });
    setShowToolModal(false);
  };
  const handleRemoveTool = (index: number) => {
    setTools(prev => prev.filter((_, i) => i !== index));
  };

  // Make fetchCollections available as a callback for the RagConfigurationTab
  const handleFetchCollections = useCallback(async (dbId: string) => {
    try {
      await fetchCollections(dbId);
    } catch (error) {
      console.error("Error fetching collections:", error);
    }
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submission triggered, current tab:', currentTab);
    setLoading(true);
    setError(null);

    try {
      const agentData: AgentDataType = {
        name: formData.name,
        instructions: formData.instructions,
        voice_id: formData.voice_id,
        collection_fields: formData.collection_fields,
        llm_provider_id: formData.llm_provider_id,
        llm_model: formData.llm_model,
        llm_config: formData.llm_config,
        tts_provider_id: formData.tts_provider_id,
        tts_config: formData.tts_config,
        rag_config: ragConfigs.map(config => ({
          id: config.dbId,
          collection_name: config.collectionName,
          embedding_model: 'text-embedding-3-small'
        })),
        tools: tools
      };

      const newAgent = await agentService.createAgent(agentData);
      router.push('/agents');
    } catch (err: any) {
      console.error('Error creating agent:', err);
      setError(err.response?.data?.detail || 'Failed to create agent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} gpu-accelerated`}>
        <div className="max-w-4xl mx-auto p-6">
          {/* Header renders immediately */}
          <CreateAgentHeader currentTab={currentTab} tabs={tabs} />

          {/* Tab navigation renders immediately */}
          <TabNavigation 
            currentTab={currentTab}
            setCurrentTab={handleTabNavigation}
            tabs={tabs}
          />

          {/* Error message */}
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
                  Error Creating Agent
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

          {/* Form content with lazy loading */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className={`${
              darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/80 border-gray-200/50'
            } rounded-2xl border shadow-xl backdrop-blur-sm content-fade-in gpu-accelerated overflow-hidden`}>
              
              <Suspense fallback={<TabSkeleton />}>
                {currentTab === 0 && (
                  <div className="p-8 space-y-6">
                    <BasicInfoTab
                      formData={formData}
                      onInputChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                        const { name, value } = e.target;
                        setFormData(prev => ({ ...prev, [name]: value }));
                      }}
                      onCollectionFieldsChange={(fields: CollectionField[]) => {
                        setFormData(prev => ({ ...prev, collection_fields: fields }));
                      }}
                      darkMode={darkMode}
                    />
                  </div>
                )}
                
                {currentTab === 1 && (
                  <div className="p-8 space-y-6">
                    <ModelConfigurationTab
                      formData={formData}
                      onInputChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
                        const { name, value } = e.target;
                        setFormData(prev => ({ ...prev, [name]: value }));
                      }}
                      llmProviders={llmProviders}
                      ttsProviders={ttsProviders}
                      selectedLLMProvider={selectedLLMProvider}
                      selectedTTSProvider={selectedTTSProvider}
                      selectedTTSProviderName={selectedTTSProviderName}
                      openaiLLMModels={openaiLLMModels}
                      openaiVoiceOptions={openaiVoiceOptions}
                      groqVoiceOptions={groqVoiceOptions}
                      elevenLabsVoiceOptions={elevenLabsVoiceOptions}
                      cartesiaVoiceOptions={cartesiaVoiceOptions}
                      onLLMProviderChange={handleLLMProviderChange}
                      onTTSProviderChange={handleTTSProviderChange}
                      onVoiceChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        setFormData(prev => ({ ...prev, voice_id: e.target.value }));
                      }}
                      darkMode={darkMode}
                    />
                  </div>
                )}
                
                {currentTab === 2 && (
                  <div className="p-8 space-y-6">
                    <RagConfigurationTab
                      vectorDbs={vectorDbs}
                      ragConfigs={ragConfigs}
                      collectionsMap={collectionsMap}
                      onAddRagConfig={(dbId: string, collectionName: string) => {
                        setRagConfigs(prev => [...prev, { dbId, collectionName }]);
                      }}
                      onDeleteRagConfig={(index: number) => {
                        setRagConfigs(prev => prev.filter((_, i) => i !== index));
                      }}
                      onFetchCollections={async (dbId: string) => {
                        try {
                          const collections = await ragService.listCollections(dbId);
                          setCollectionsMap(prev => ({ ...prev, [dbId]: collections }));
                        } catch (error) {
                          console.error('Error fetching collections:', error);
                        }
                      }}
                      darkMode={darkMode}
                    />
                  </div>
                )}
                
                {currentTab === 3 && (
                  <div className="p-8 space-y-6">
                    <ToolsConfigurationTab
                      tools={tools}
                      newTool={newTool}
                      showAddModal={showToolModal}
                      onToolInputChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
                        const { name, value } = e.target;
                        setNewTool(prev => ({ ...prev, [name]: value }));
                      }}
                      onAuthTypeChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        setNewTool(prev => ({ ...prev, auth_type: e.target.value, auth_config: {} }));
                      }}
                      onAuthConfigChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const { name, value } = e.target;
                        setNewTool(prev => ({
                          ...prev,
                          auth_config: { ...prev.auth_config, [name]: value }
                        }));
                      }}
                      onAddTool={() => {
                        setTools(prev => [...prev, newTool]);
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
                        setShowToolModal(false);
                      }}
                      onRemoveTool={(index: number) => {
                        setTools(prev => prev.filter((_, i) => i !== index));
                      }}
                      onOpenAddModal={() => setShowToolModal(true)}
                      onCloseAddModal={() => setShowToolModal(false)}
                      darkMode={darkMode}
                    />
                  </div>
                )}
              </Suspense>
            </div>

            {/* Enhanced Action buttons */}
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
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className={`text-xs px-3 py-1 rounded-full ${
                    darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                  }`}>
                    Tab: {currentTab}/{tabs.length - 1} | Show Next: {currentTab < tabs.length - 1 ? 'true' : 'false'}
                  </div>
                )}
                {currentTab < tabs.length - 1 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Next button clicked, current tab:', currentTab, 'moving to:', currentTab + 1);
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
                    type="submit"
                    disabled={loading || !validateBasicInfo() || !validateModelConfiguration()}
                    className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 group shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                      darkMode
                        ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white shadow-green-600/25 hover:shadow-green-600/40'
                        : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white shadow-green-600/25 hover:shadow-green-600/40'
                    } gpu-accelerated transform hover:scale-105 disabled:hover:scale-100`}
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Creating Agent...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Save size={18} />
                        <span>Create Agent</span>
                      </div>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
};

export default React.memo(CreateAgentPage);