import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Info, Save, Plus, Database } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import agentService, { CreateAgentData as AgentDataType, CollectionField, RAGDatabaseConfig, TTSConfig } from '../../services/agent';
import CollectionFieldsEditor from '../../components/CollectionFieldsEditor';
import { useTheme } from '../../contexts/ThemeContext';
import { getUserLLMProviders } from '../../services/llm';
import { getUserTTSProviders } from '../../services/tts';
import ragService, { Collection, VectorDB } from '../../services/rag';
import { toast } from 'react-hot-toast';
import { LLMProvider } from '../../services/llm';
import ttsService, { TTSProvider } from '../../services/tts';
import { useDarkMode } from '../../contexts/DarkModeContext';
import useToast from '../../hooks/useToast';

// Lazy-loaded form tab components
const BasicInfoTab = React.lazy(() => import('../../components/agent-form/BasicInfoTab'));
const ModelConfigurationTab = React.lazy(() => import('../../components/agent-form/ModelConfigurationTab'));
const RagConfigurationTab = React.lazy(() => import('../../components/agent-form/RagConfigurationTab'));
const ToolsConfigurationTab = React.lazy(() => import('../../components/agent-form/ToolsConfigurationTab'));

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

  // Multi-step form state
  const [currentTab, setCurrentTab] = useState(0);
  const tabs = ['Basic Information', 'Model Configuration', 'RAG Configuration', 'Tools Configuration'];

  // State for provider data
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

  // Fetch providers data on component mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const [llmData, ttsData, ragData] = await Promise.all([
          getUserLLMProviders(),
          getUserTTSProviders(),
          ragService.getVectorDBs()
        ]);
        
        setLLMProviders(llmData);
        setTTSProviders(ttsData);
        setVectorDbs(ragData);
      } catch (err) {
        console.error('Error fetching providers:', err);
        setError('Failed to load provider data');
      }
    };

    fetchProviders();
  }, []);

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
    
    // Reset model and voice when provider changes
    setFormData(prev => ({
      ...prev,
      llm_provider_id: providerId,
      llm_model: '',
      voice_id: ''
    }));
  };

  // Handle TTS provider selection
  const handleTTSProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerId = e.target.value;
    setSelectedTTSProvider(providerId);
    
    // Find the provider data
    const providerData = ttsProviders.find(p => p.id === providerId);
    
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
      } else if (providerData.provider_name === 'kokoro' && kokoroVoiceOptions.length > 0) {
        // For Kokoro, pre-select the first voice option
        voice = kokoroVoiceOptions[0].value;
      }
      
      const ttsConfig: TTSConfig = {
        provider: providerData.provider_name,
        api_key: "not given",
        voice: voice
      };
      
      // Add provider-specific fields if applicable
      if (providerData.provider_name === 'groq' || providerData.provider_name === 'elevenlabs' || 
          providerData.provider_name === 'openai' || providerData.provider_name === 'cartesia' ||
          providerData.provider_name === 'kokoro') {
        // No additional fields needed for these providers
        // Just use the voice as is
      }
      
      setFormData({
        ...formData,
        tts_provider_id: providerId,
        tts_config: ttsConfig,
        voice_id: voice
      });
    } else {
      // Clear TTS config if no provider selected
      setSelectedTTSProviderName('');
      setFormData({
        ...formData,
        tts_provider_id: undefined,
        tts_config: undefined,
        voice_id: ''
      });
    }
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
    
    try {
      setLoading(true);
      
      // Convert form data to API data structure
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
      
      // Create agent
      const createdAgent = await agentService.createAgent(agentData);
      
      // Redirect to agent page
      router.push(`/agents/${createdAgent.id}`);
    } catch (err: any) {
      console.error('Error creating agent:', err);
      setError(err.message || 'Failed to create agent');
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className={`max-w-4xl mx-auto p-6 ${darkMode ? 'bg-gray-900 min-h-screen' : ''}`}>
        <div className="flex items-center mb-6">
          <Link href="/agents">
            <button className={`mr-4 p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
              darkMode 
                ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-800 focus:ring-blue-500' 
                : 'text-neutral-600 hover:text-primary-600 hover:bg-primary-50 focus:ring-primary-400'
            }`}>
              <ArrowLeft size={20} />
            </button>
          </Link>
          <h1 className={`text-2xl font-bold flex items-center ${darkMode ? 'text-white' : 'text-neutral-800'}`}>
            <span className={`${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-primary-100 text-primary-800'} p-1 rounded-md mr-3`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor"/>
              </svg>
            </span>
            Create Agent
          </h1>
        </div>

        {error && (
          <div className={`mb-6 p-4 ${darkMode ? 'bg-red-900/20 text-red-400 border-red-800' : 'bg-red-50 text-red-700 border-red-200'} rounded-md border flex items-center shadow-sm`}>
            <span className="mr-2">⚠️</span>
            {error}
          </div>
        )}

        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-neutral-200'} rounded-lg shadow-sm border mb-6 overflow-hidden`}>
          <div className={`${darkMode ? 'bg-gray-700/30 border-gray-700' : 'bg-neutral-50 border-neutral-200'} p-4 border-b`}>
            <div className="flex items-start">
              <Info size={18} className={`${darkMode ? 'text-gray-300' : 'text-neutral-600'} mt-0.5 mr-2 flex-shrink-0`} />
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-neutral-600'}`}>
                Create a new agent by providing instructions on how it should behave and what information it should collect.
              </p>
            </div>
          </div>
          
          {/* Tab navigation */}
          <div className="px-6 border-b border-gray-700">
            <div className="flex">
              {tabs.map((tabName, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentTab(index)}
                  className={`px-6 py-3 relative ${
                    currentTab === index
                      ? (darkMode ? 'text-blue-400 font-medium' : 'text-primary-600 font-medium')
                      : (darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')
                  }`}
                >
                  {tabName}
                  {currentTab === index && (
                    <div className={`absolute bottom-0 left-0 w-full h-0.5 ${darkMode ? 'bg-blue-400' : 'bg-primary-600'}`}></div>
                  )}
                    </button>
              ))}
              </div>
            </div>

          {/* Form content - Remove the form tag around all tabs to prevent unintended submission */}
          <div className="p-6 space-y-6">
            {/* Basic Information Tab */}
            {currentTab === 0 && (
              <Suspense fallback={<div>Loading Basic Information...</div>}>
                <BasicInfoTab
                  formData={formData}
                  onInputChange={handleInputChange}
                  onCollectionFieldsChange={handleCollectionFieldsChange}
              darkMode={darkMode}
            />
              </Suspense>
            )}

            {/* Model Configuration Tab */}
            {currentTab === 1 && (
              <Suspense fallback={<div>Loading Model Configuration...</div>}>
                <ModelConfigurationTab
                  formData={formData}
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
                  onInputChange={handleInputChange}
                  onLLMProviderChange={handleLLMProviderChange}
                  onTTSProviderChange={handleTTSProviderChange}
                  onVoiceChange={handleVoiceChange}
                  darkMode={darkMode}
                />
              </Suspense>
            )}

            {/* RAG Configuration Tab */}
            {currentTab === 2 && (
              <Suspense fallback={<div>Loading RAG Configuration...</div>}>
                <RagConfigurationTab
                  vectorDbs={vectorDbs}
                  ragConfigs={ragConfigs}
                  collectionsMap={collectionsMap}
                  onAddRagConfig={handleAddRagConfig}
                  onDeleteRagConfig={handleDeleteRagConfig}
                  darkMode={darkMode}
                  onFetchCollections={handleFetchCollections}
                />
              </Suspense>
            )}
                  
            {/* Tools Configuration Tab */}
            {currentTab === 3 && (
              <Suspense fallback={<div>Loading Tools Configuration...</div>}>
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
              </Suspense>
            )}

            {/* Navigation buttons */}
            <div className={`flex justify-between pt-4 border-t mt-8 ${darkMode ? 'border-gray-700' : 'border-neutral-100'}`}>
                  <div>
                {currentTab > 0 && (
                    <button
                      type="button"
                    onClick={() => setCurrentTab(currentTab - 1)}
                    className={`px-4 py-2.5 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                      darkMode 
                        ? 'text-gray-300 border-gray-600 hover:bg-gray-700 focus:ring-gray-500' 
                        : 'text-neutral-600 border-neutral-300 hover:bg-neutral-50 focus:ring-neutral-400'
                      }`}
                    >
                    Previous
                    </button>
                )}
                  </div>
              <div className="flex space-x-3">
              <Link href="/agents">
                <button
                  type="button"
                    className={`px-4 py-2.5 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                    darkMode 
                      ? 'text-gray-300 border-gray-600 hover:bg-gray-700 focus:ring-gray-500' 
                      : 'text-neutral-600 border-neutral-300 hover:bg-neutral-50 focus:ring-neutral-400'
                  }`}
                >
                  Cancel
                </button>
              </Link>
                
                {currentTab < tabs.length - 1 ? (
              <button
                    type="button"
                    onClick={() => setCurrentTab(currentTab + 1)}
                    className={`px-4 py-2.5 text-white rounded-md focus:outline-none focus:ring-2 shadow-sm transition-all duration-200 hover:shadow ${
                      darkMode 
                        ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                        : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'
                    }`}
                  >
                    Next
                  </button>
                ) : (
                  /* Only show the final submit button on the last tab */
                  <button
                    type="button"
                    onClick={handleSubmit}
                disabled={loading}
                className={`px-4 py-2.5 text-white rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 flex items-center shadow-sm transition-all duration-200 hover:shadow ${
                  darkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                    : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-1.5" /> Create Agent
                  </>
                )}
              </button>
                )}
            </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CreateAgentPage; 