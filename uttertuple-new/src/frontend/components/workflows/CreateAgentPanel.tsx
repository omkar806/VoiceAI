'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, ArrowLeft } from 'lucide-react';
import agentService, {
  Agent,
  CreateAgentData,
  CollectionField,
} from '@/services/agent';
import { getUserLLMProviders } from '@/services/llm';
import { getUserTTSProviders } from '@/services/tts';
import ragService, { VectorDB } from '@/services/rag';
import { toast } from 'react-hot-toast';
import { LLMProvider } from '@/services/llm';
import { TTSProvider } from '@/services/tts';
import BasicInfoTab from '@/components/agent-form/BasicInfoTab';
import ModelConfigurationTab from '@/components/agent-form/ModelConfigurationTab';
import RagConfigurationTab from '@/components/agent-form/RagConfigurationTab';
import ToolsConfigurationTab from '@/components/agent-form/ToolsConfigurationTab';
import { useTheme } from '@/contexts/ThemeContext';

// Voice/model options (matching AgentEditPanel)
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
  { value: 'verse', label: 'Verse' },
];

const groqVoiceOptions = [
  { value: 'Arista-PlayAI', label: 'Arista' },
  { value: 'Atlas-PlayAI', label: 'Atlas' },
  { value: 'Basil-PlayAI', label: 'Basil' },
  { value: 'Briggs-PlayAI', label: 'Briggs' },
  { value: 'Calum-PlayAI', label: 'Calum' },
  { value: 'Celeste-PlayAI', label: 'Celeste' },
  { value: 'Cheyenne-PlayAI', label: 'Cheyenne' },
  { value: 'Chip-PlayAI', label: 'Chip' },
  { value: 'Cillian-PlayAI', label: 'Cillian' },
  { value: 'Deedee-PlayAI', label: 'Deedee' },
  { value: 'Fritz-PlayAI', label: 'Fritz' },
  { value: 'Gail-PlayAI', label: 'Gail' },
  { value: 'Indigo-PlayAI', label: 'Indigo' },
  { value: 'Mamaw-PlayAI', label: 'Mamaw' },
  { value: 'Mason-PlayAI', label: 'Mason' },
  { value: 'Mikail-PlayAI', label: 'Mikail' },
  { value: 'Mitch-PlayAI', label: 'Mitch' },
  { value: 'Quinn-PlayAI', label: 'Quinn' },
  { value: 'Thunder-PlayAI', label: 'Thunder' },
];

const elevenLabsVoiceOptions = [
  { value: 'Adam', label: 'Adam' },
  { value: 'Alice', label: 'Alice' },
  { value: 'Antoni', label: 'Antoni' },
  { value: 'Aria', label: 'Aria' },
  { value: 'Rachel', label: 'Rachel' },
  { value: 'Sam', label: 'Sam' },
  { value: 'Sarah', label: 'Sarah' },
  { value: 'Emily', label: 'Emily' },
  { value: 'Elli', label: 'Elli' },
  { value: 'Callum', label: 'Callum' },
  { value: 'George', label: 'George' },
  { value: 'Freya', label: 'Freya' },
];

const cartesiaVoiceOptions = [
  { value: 'bf0a246a-8642-498a-9950-80c35e9276b5', label: 'Sophie', name: 'Sophie' },
  { value: '78ab82d5-25be-4f7d-82b3-7ad64e5b85b2', label: 'Savannah', name: 'Savannah' },
  { value: '6f84f4b8-58a2-430c-8c79-688dad597532', label: 'Brooke', name: 'Brooke' },
  { value: 'c99d36f3-5ffd-4253-803a-535c1bc9c306', label: 'Griffin', name: 'Griffin' },
  { value: '32b3f3c5-7171-46aa-abe7-b598964aa793', label: 'Zia', name: 'Zia' },
  { value: '79743797-2087-422f-8dc7-86f9efca85f1', label: 'Mateo', name: 'Mateo' },
];

const kokoroVoiceOptions = [
  { value: 'af_alloy', label: 'af_alloy' },
  { value: 'af_heart', label: 'af_heart' },
  { value: 'af_nova', label: 'af_nova' },
  { value: 'am_adam', label: 'am_adam' },
  { value: 'am_echo', label: 'am_echo' },
  { value: 'am_liam', label: 'am_liam' },
];

const openaiLLMModels = [
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
  { value: 'gpt-4o', label: 'gpt-4o' },
  { value: 'gpt-4.1-nano', label: 'gpt-4.1-nano' },
  { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
  { value: 'gpt-4.1', label: 'gpt-4.1' },
  { value: 'o3', label: 'o3' },
  { value: 'o3-mini', label: 'o3-mini' },
  { value: 'openai-realtime', label: 'OpenAI Realtime' },
];

interface CreateAgentPanelProps {
  onClose: () => void;
  onAgentCreated?: (agent: Agent) => void;
}

const TABS = ['Basic Info', 'Model', 'RAG', 'Tools'];

const CreateAgentPanel: React.FC<CreateAgentPanelProps> = ({
  onClose,
  onAgentCreated,
}) => {
  const { darkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [llmProviders, setLLMProviders] = useState<LLMProvider[]>([]);
  const [ttsProviders, setTTSProviders] = useState<TTSProvider[]>([]);
  const [vectorDbs, setVectorDbs] = useState<VectorDB[]>([]);
  const [selectedLLMProvider, setSelectedLLMProvider] = useState('');
  const [selectedTTSProvider, setSelectedTTSProvider] = useState('');
  const [selectedTTSProviderName, setSelectedTTSProviderName] = useState('');
  const [selectedVectorDbs, setSelectedVectorDbs] = useState<string[]>([]);
  const [ragConfigs, setRagConfigs] = useState<{ dbId: string; collectionName: string }[]>([]);
  const [collectionsMap, setCollectionsMap] = useState<Record<string, { name: string; metadata?: any }[]>>({});
  const [tools, setTools] = useState<any[]>([]);

  const [formData, setFormData] = useState<CreateAgentData>({
    name: '',
    instructions: '',
    voice_id: '',
    collection_fields: [],
  });

  const fetchCollections = useCallback(async (dbId: string) => {
    try {
      const collections = await ragService.listCollections(dbId);
      const withMetadata = await Promise.all(
        collections.map(async (c) => {
          try {
            const metadata = await ragService.getCollectionMetadata(dbId, c.name);
            return { ...c, metadata };
          } catch {
            return c;
          }
        })
      );
      setCollectionsMap((prev) => ({ ...prev, [dbId]: withMetadata }));
    } catch (err) {
      console.error('Error fetching collections:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [llmData, ttsData, ragData] = await Promise.all([
          getUserLLMProviders(),
          getUserTTSProviders(),
          ragService.getVectorDBs(),
        ]);

        setLLMProviders(llmData);
        setTTSProviders(ttsData);
        setVectorDbs(ragData);

        if (llmData.length > 0) setSelectedLLMProvider(llmData[0].id);
        if (ttsData.length > 0) {
          setSelectedTTSProvider(ttsData[0].id);
          setSelectedTTSProviderName(ttsData[0].provider_name);
          const p = ttsData[0];
          let voice = '';
          if (p.provider_name === 'groq') voice = groqVoiceOptions[0]?.value || '';
          else if (p.provider_name === 'elevenlabs') voice = elevenLabsVoiceOptions[0]?.value || '';
          else if (p.provider_name === 'openai') voice = openaiVoiceOptions[0]?.value || 'alloy';
          else if (p.provider_name === 'cartesia') voice = cartesiaVoiceOptions[0]?.value || '';
          else if (p.provider_name === 'kokoro') voice = kokoroVoiceOptions[0]?.value || '';
          setFormData((prev) => ({
            ...prev,
            tts_provider_id: ttsData[0].id,
            tts_config: { provider: p.provider_name, api_key: 'not given', voice },
            voice_id: voice,
          }));
        }
      } catch (err) {
        console.error('Error loading providers:', err);
        toast.error('Failed to load providers');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'llm_model' && value === 'openai-realtime') {
      setSelectedTTSProvider('');
      setSelectedTTSProviderName('');
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        tts_provider_id: undefined,
        tts_config: undefined,
        voice_id: openaiVoiceOptions[0]?.value || 'alloy',
        llm_config: { ...(prev.llm_config || {}), voice: openaiVoiceOptions[0]?.value || 'alloy' },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleLLMProviderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedLLMProvider(id);
    setFormData((prev) => ({ ...prev, llm_provider_id: id, llm_model: '' }));
  }, []);

  const handleTTSProviderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const p = ttsProviders.find((x) => x.id === id);
    setSelectedTTSProvider(id);
    setSelectedTTSProviderName(p?.provider_name || '');

    let voice = '';
    if (p?.provider_name === 'groq') voice = groqVoiceOptions[0]?.value || '';
    else if (p?.provider_name === 'elevenlabs') voice = elevenLabsVoiceOptions[0]?.value || '';
    else if (p?.provider_name === 'openai') voice = openaiVoiceOptions[0]?.value || 'alloy';
    else if (p?.provider_name === 'cartesia') voice = cartesiaVoiceOptions[0]?.value || '';
    else if (p?.provider_name === 'kokoro') voice = kokoroVoiceOptions[0]?.value || '';

    setFormData((prev) => ({
      ...prev,
      tts_provider_id: id,
      tts_config: p ? { provider: p.provider_name, api_key: 'not given', voice } : undefined,
      voice_id: voice,
    }));
  }, [ttsProviders]);

  const handleVoiceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const voice = e.target.value;
    if (formData.llm_model === 'openai-realtime') {
      setFormData((prev) => ({
        ...prev,
        voice_id: voice,
        llm_config: { ...(prev.llm_config || {}), voice },
      }));
    } else {
      setFormData((prev) => ({ ...prev, voice_id: voice }));
    }
  }, [formData.llm_model]);

  const handleCollectionFieldsChange = useCallback((fields: CollectionField[]) => {
    setFormData((prev) => ({ ...prev, collection_fields: fields }));
  }, []);

  const handleAddRagConfig = useCallback((dbId: string, collectionName: string) => {
    setRagConfigs((prev) => [...prev, { dbId, collectionName }]);
    setSelectedVectorDbs((prev) => (prev.includes(dbId) ? prev : [...prev, dbId]));
    fetchCollections(dbId);
  }, [fetchCollections]);

  const handleDeleteRagConfig = useCallback((index: number) => {
    const config = ragConfigs[index];
    setRagConfigs((prev) => prev.filter((_, i) => i !== index));
    if (config) {
      setSelectedVectorDbs((prev) => prev.filter((id) => id !== config.dbId));
    }
  }, [ragConfigs]);

  const [showToolModal, setShowToolModal] = useState(false);
  const [newTool, setNewTool] = useState({
    name: '',
    description: '',
    endpoint_url: '',
    method: 'GET',
    auth_type: '',
    auth_config: {} as Record<string, string>,
    request_schema: '',
    response_schema: '',
  });

  const handleOpenAddModal = useCallback(() => setShowToolModal(true), []);
  const handleCloseAddModal = useCallback(() => {
    setShowToolModal(false);
    setNewTool({ name: '', description: '', endpoint_url: '', method: 'GET', auth_type: '', auth_config: {}, request_schema: '', response_schema: '' });
  }, []);

  const handleToolInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTool((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleAuthTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setNewTool((prev) => ({ ...prev, auth_type: e.target.value, auth_config: {} }));
  }, []);

  const handleAuthConfigChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTool((prev) => ({ ...prev, auth_config: { ...prev.auth_config, [name]: value } }));
  }, []);

  const handleAddToolSubmit = useCallback(() => {
    if (!newTool.name || !newTool.description) {
      toast.error('Name and description are required');
      return;
    }
    setTools((prev) => [...prev, {
      name: newTool.name,
      description: newTool.description,
      endpoint_url: newTool.endpoint_url || undefined,
      method: newTool.method || 'GET',
      auth_type: newTool.auth_type || undefined,
      auth_config: Object.keys(newTool.auth_config || {}).length ? newTool.auth_config : undefined,
      request_schema: newTool.request_schema || undefined,
      response_schema: newTool.response_schema || undefined,
    }]);
    handleCloseAddModal();
    toast.success('Tool added');
  }, [newTool, handleCloseAddModal]);

  const handleRemoveTool = useCallback((index: number) => {
    setTools((prev) => prev.filter((_, i) => i !== index));
    toast.success('Tool removed');
  }, []);

  const handleCreate = async () => {
    if (!formData.name?.trim()) {
      toast.error('Agent name is required');
      return;
    }
    if (!formData.instructions?.trim()) {
      toast.error('Instructions are required');
      return;
    }
    if (!selectedLLMProvider) {
      toast.error('Please select an LLM provider');
      return;
    }

    setSaving(true);
    try {
      const ragConfig = selectedVectorDbs.map((dbId) => {
        const db = vectorDbs.find((d) => d.id === dbId);
        const config = ragConfigs.find((c) => c.dbId === dbId);
        return {
          id: dbId,
          collection_name: config?.collectionName || '',
          embedding_model: 'text-embedding-3-small',
          description: db?.description ?? undefined,
        };
      });

      const selectedLLM = llmProviders.find((p) => p.id === selectedLLMProvider);
      const providerName = selectedLLM?.provider_name?.toLowerCase() || 'openai';

      const createData: CreateAgentData = {
        name: formData.name.trim(),
        instructions: formData.instructions.trim(),
        voice_id: formData.voice_id || undefined,
        collection_fields: formData.collection_fields || [],
        llm_provider_id: selectedLLMProvider,
        llm_model: formData.llm_model || undefined,
        llm_config: formData.llm_config ? { ...formData.llm_config, provider: providerName } : { provider: providerName },
        tts_provider_id: selectedTTSProvider || undefined,
        tts_config: formData.tts_config,
        rag_config: ragConfig.length > 0 ? ragConfig : undefined,
        tools: tools.length > 0 ? tools : undefined,
      };

      const agent = await agentService.createAgent(createData);
      onAgentCreated?.(agent);
      toast.success(`Agent "${agent.name}" created!`);
      onClose();
    } catch (err) {
      console.error('Error creating agent:', err);
      toast.error('Failed to create agent');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`w-96 h-full flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'} border-l ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-96 h-full flex flex-col overflow-hidden ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } border-l ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b shrink-0 ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Back to workflow"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Create Agent
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Add a new agent to your workflow
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`p-2 rounded-lg transition-colors ${
            darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex border-b shrink-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setCurrentTab(i)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              currentTab === i
                ? darkMode
                  ? 'text-blue-400 border-b-2 border-blue-500'
                  : 'text-blue-600 border-b-2 border-blue-500'
                : darkMode
                  ? 'text-gray-400 hover:text-gray-300'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentTab === 0 && (
          <BasicInfoTab
            formData={formData}
            onInputChange={handleInputChange}
            onCollectionFieldsChange={handleCollectionFieldsChange}
            darkMode={darkMode}
          />
        )}
        {currentTab === 1 && (
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
        )}
        {currentTab === 2 && (
          <RagConfigurationTab
            vectorDbs={vectorDbs}
            ragConfigs={ragConfigs}
            collectionsMap={collectionsMap}
            onAddRagConfig={handleAddRagConfig}
            onDeleteRagConfig={handleDeleteRagConfig}
            onFetchCollections={fetchCollections}
            darkMode={darkMode}
          />
        )}
        {currentTab === 3 && (
          <ToolsConfigurationTab
            tools={tools}
            showAddModal={showToolModal}
            newTool={newTool}
            onToolInputChange={handleToolInputChange}
            onAuthTypeChange={handleAuthTypeChange}
            onAuthConfigChange={handleAuthConfigChange}
            onAddTool={handleAddToolSubmit}
            onRemoveTool={handleRemoveTool}
            onOpenAddModal={handleOpenAddModal}
            onCloseAddModal={handleCloseAddModal}
            darkMode={darkMode}
          />
        )}
      </div>

      {/* Footer */}
      <div className={`p-4 border-t shrink-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={handleCreate}
          disabled={saving}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors ${
            darkMode
              ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
              : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
          }`}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Creating...' : 'Create Agent'}
        </button>
      </div>
    </div>
  );
};

export default CreateAgentPanel;
