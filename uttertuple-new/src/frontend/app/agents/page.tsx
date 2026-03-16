'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NextPage } from 'next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search,
  Save,
  Trash2,
  Bot,
  Cpu,
  Mic,
  Wrench,
  Database,
  Settings2,
  Copy,
  Check,
  Loader2,
  Sparkles,
  X,
  Send,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import agentService, {
  Agent,
  CreateAgentData,
  CollectionField,
  AgentTool,
  CreateToolData,
  TTSConfig,
  RAGDatabaseConfig,
} from '../../services/agent';
import { getUserLLMProviders } from '../../services/llm';
import { getUserTTSProviders } from '../../services/tts';
import ragService, { VectorDB } from '../../services/rag';
import { LLMProvider } from '../../services/llm';
import { TTSProvider } from '../../services/tts';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';
import CollectionFieldsEditor from '../../components/CollectionFieldsEditor';
import ToolsConfigurationTab from '../../components/agent-form/ToolsConfigurationTab';
import RagConfigurationTab from '../../components/agent-form/RagConfigurationTab';
import { streamChat, ChatMessage, SSEEvent } from '../../services/aiBuilder';
import ReactMarkdown from 'react-markdown';

// ─── Voice & Model Option Arrays ────────────────────────────────────────────

const openaiLLMModels = [
  { value: 'gpt-4o', label: 'GPT 4o' },
  { value: 'gpt-4o-mini', label: 'GPT 4o Mini' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'openai-realtime', label: 'OpenAI Realtime' },
];

const groqModelOptions = [
  { value: 'gemma2-9b-it', label: 'gemma2-9b-it' },
  { value: 'llama-3.1-8b-instant', label: 'llama-3.1-8b-instant' },
  { value: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile' },
  { value: 'llama3-70b-8192', label: 'llama3-70b-8192' },
  { value: 'llama3-8b-8192', label: 'llama3-8b-8192' },
  { value: 'meta-llama/llama-4-maverick-17b-128e-instruct', label: 'llama-4-maverick-17b' },
  { value: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'llama-4-scout-17b' },
];

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
  { value: 'bf0a246a-8642-498a-9950-80c35e9276b5', label: 'Sophie' },
  { value: '78ab82d5-25be-4f7d-82b3-7ad64e5b85b2', label: 'Savannah' },
  { value: '6f84f4b8-58a2-430c-8c79-688dad597532', label: 'Brooke' },
  { value: 'c99d36f3-5ffd-4253-803a-535c1bc9c306', label: 'Griffin' },
  { value: '32b3f3c5-7171-46aa-abe7-b598964aa793', label: 'Zia' },
];

// ─── Tab definition ─────────────────────────────────────────────────────────

type TabId = 'model' | 'voice' | 'tools' | 'rag' | 'advanced';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'model', label: 'Model', icon: <Cpu size={16} /> },
  { id: 'voice', label: 'Voice', icon: <Mic size={16} /> },
  { id: 'tools', label: 'Tools', icon: <Wrench size={16} /> },
  { id: 'rag', label: 'RAG', icon: <Database size={16} /> },
  { id: 'advanced', label: 'Advanced', icon: <Settings2 size={16} /> },
];

// ─── Collection metadata type for RAG tab ───────────────────────────────────

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

// ─── Helper: derive provider summary for sidebar ────────────────────────────

function getProviderSummary(agent: Agent, llmProviders: LLMProvider[]): string {
  const parts: string[] = [];
  if (agent.llm_model) {
    if (agent.llm_provider_id) {
      const p = llmProviders.find((x) => x.id === agent.llm_provider_id);
      if (p) parts.push(p.provider_name);
    }
    parts.push(agent.llm_model);
  }
  if (agent.tts_config?.provider) parts.push(agent.tts_config.provider);
  return parts.join(' · ') || 'Not configured';
}

// ─── Helper: build form data from agent ─────────────────────────────────────

function agentToFormData(agent: Agent): CreateAgentData {
  return {
    name: agent.name,
    description: agent.description ?? '',
    instructions: agent.instructions,
    llm_provider_id: agent.llm_provider_id ?? '',
    llm_model: agent.llm_model ?? '',
    llm_config: agent.llm_config ?? {},
    voice_id: agent.voice_id ?? '',
    tts_provider_id: agent.tts_provider_id ?? '',
    tts_config: agent.tts_config ?? undefined,
    rag_config: agent.rag_config ?? [],
    collection_fields: agent.collection_fields ?? [],
  };
}

// ─── AI Builder message type ────────────────────────────────────────────────

interface BuilderMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: { name: string; status: 'running' | 'done' }[];
  agentCreated?: { agent_id: string; agent_name: string };
  isStreaming?: boolean;
}

// ─── Page Component ─────────────────────────────────────────────────────────

const AgentsPage: NextPage = () => {
  const { darkMode } = useTheme();

  // ── Agent list state ──
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Create agent state ──
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const createInputRef = useRef<HTMLInputElement>(null);

  // ── Form / editing state ──
  const [formData, setFormData] = useState<CreateAgentData>({
    name: '',
    instructions: '',
  });
  const [originalData, setOriginalData] = useState<CreateAgentData | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabId>('model');

  // ── Provider data (loaded once) ──
  const [llmProviders, setLlmProviders] = useState<LLMProvider[]>([]);
  const [ttsProviders, setTtsProviders] = useState<TTSProvider[]>([]);
  const [vectorDbs, setVectorDbs] = useState<VectorDB[]>([]);
  const [selectedLLMProvider, setSelectedLLMProvider] = useState('');
  const [selectedTTSProvider, setSelectedTTSProvider] = useState('');
  const [selectedTTSProviderName, setSelectedTTSProviderName] = useState('');

  // ── Tools state ──
  const [tools, setTools] = useState<AgentTool[]>([]);
  const [showAddToolModal, setShowAddToolModal] = useState(false);
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

  // ── RAG state ──
  const [ragConfigs, setRagConfigs] = useState<{ dbId: string; collectionName: string }[]>([]);
  const [collectionsMap, setCollectionsMap] = useState<Record<string, CollectionData[]>>({});

  // ── Copy ID state ──
  const [copiedId, setCopiedId] = useState(false);

  // ── Delete confirm ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── AI Builder panel state ──
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderMessages, setBuilderMessages] = useState<BuilderMessage[]>([]);
  const [builderChatHistory, setBuilderChatHistory] = useState<ChatMessage[]>([]);
  const [builderInput, setBuilderInput] = useState('');
  const [builderStreaming, setBuilderStreaming] = useState(false);
  const [builderLLMProvider, setBuilderLLMProvider] = useState('');
  const [builderProviderOpen, setBuilderProviderOpen] = useState(false);
  const builderEndRef = useRef<HTMLDivElement>(null);
  const builderInputRef = useRef<HTMLTextAreaElement>(null);
  const builderAbortRef = useRef<AbortController | null>(null);

  // ── Computed ──
  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [agents, selectedAgentId]
  );

  const filteredAgents = useMemo(() => {
    if (!searchTerm) return agents;
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.description && a.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [agents, searchTerm]);

  const hasChanges = useMemo(() => {
    if (!originalData) return false;
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  }, [formData, originalData]);

  // ── Load agents ──
  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await agentService.getAgents();
      setAgents(data);
      if (data.length > 0 && !selectedAgentId) {
        setSelectedAgentId(data[0].id);
      }
    } catch {
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load providers (once) ──
  const fetchProviders = useCallback(async () => {
    try {
      const [llm, tts, dbs] = await Promise.all([
        getUserLLMProviders(),
        getUserTTSProviders(),
        ragService.getVectorDBs(),
      ]);
      setLlmProviders(llm);
      setTtsProviders(tts);
      setVectorDbs(dbs);
    } catch {
      console.error('Failed to load providers');
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    fetchProviders();
  }, [fetchAgents, fetchProviders]);

  // ── When selected agent changes, populate form ──
  useEffect(() => {
    if (!selectedAgent) return;
    const fd = agentToFormData(selectedAgent);
    setFormData(fd);
    setOriginalData(JSON.parse(JSON.stringify(fd)));
    setSelectedLLMProvider(selectedAgent.llm_provider_id ?? '');
    setSelectedTTSProvider(selectedAgent.tts_provider_id ?? '');

    const ttsP = ttsProviders.find((p) => p.id === selectedAgent.tts_provider_id);
    setSelectedTTSProviderName(ttsP?.provider_name ?? '');

    setTools(selectedAgent.tools ?? []);
    setRagConfigs(
      (selectedAgent.rag_config ?? []).map((r) => ({
        dbId: r.id,
        collectionName: r.collection_name,
      }))
    );
    setShowDeleteConfirm(false);
  }, [selectedAgent, ttsProviders]);

  // ── Focus create input ──
  useEffect(() => {
    if (showCreateInput) createInputRef.current?.focus();
  }, [showCreateInput]);

  // ── Fetch collections for RAG ──
  const fetchCollections = useCallback(
    async (dbId: string) => {
      try {
        const collections = await ragService.listCollections(dbId);
        const withMeta = await Promise.all(
          collections.map(async (c: { name: string }) => {
            try {
              const meta = await ragService.getCollectionMetadata(dbId, c.name);
              return { name: c.name, metadata: meta };
            } catch {
              return { name: c.name };
            }
          })
        );
        setCollectionsMap((prev) => ({ ...prev, [dbId]: withMeta }));
      } catch {
        console.error('Failed to load collections');
      }
    },
    []
  );

  // ── Handlers ──

  const handleSelectAgent = (id: string) => {
    setSelectedAgentId(id);
    setCurrentTab('model');
  };

  const handleCreateAgent = async () => {
    const name = createName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const newAgent = await agentService.createAgent({
        name,
        instructions: 'You are a helpful assistant.',
      });
      setAgents((prev) => [newAgent, ...prev]);
      setSelectedAgentId(newAgent.id);
      setShowCreateInput(false);
      setCreateName('');
      toast.success('Agent created');
    } catch {
      toast.error('Failed to create agent');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedAgentId) return;
    setSaving(true);
    try {
      const updated = await agentService.updateAgent(selectedAgentId, {
        name: formData.name,
        description: formData.description,
        instructions: formData.instructions,
        llm_provider_id: formData.llm_provider_id || undefined,
        llm_model: formData.llm_model || undefined,
        llm_config: formData.llm_config,
        voice_id: formData.voice_id || undefined,
        tts_provider_id: formData.tts_provider_id || undefined,
        tts_config: formData.tts_config,
        collection_fields: formData.collection_fields,
      });
      setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setOriginalData(JSON.parse(JSON.stringify(agentToFormData(updated))));
      toast.success('Agent saved');
    } catch {
      toast.error('Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAgentId) return;
    try {
      await agentService.deleteAgent(selectedAgentId);
      const remaining = agents.filter((a) => a.id !== selectedAgentId);
      setAgents(remaining);
      setSelectedAgentId(remaining.length > 0 ? remaining[0].id : null);
      setShowDeleteConfirm(false);
      toast.success('Agent deleted');
    } catch {
      toast.error('Failed to delete agent');
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLLMProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerId = e.target.value;
    setSelectedLLMProvider(providerId);
    setFormData((prev) => ({ ...prev, llm_provider_id: providerId, llm_model: '' }));
  };

  const handleTTSProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerId = e.target.value;
    setSelectedTTSProvider(providerId);
    const provider = ttsProviders.find((p) => p.id === providerId);
    setSelectedTTSProviderName(provider?.provider_name ?? '');
    if (provider) {
      setFormData((prev) => ({
        ...prev,
        tts_provider_id: providerId,
        tts_config: {
          provider: provider.provider_name,
          api_key: provider.api_key,
          voice: prev.voice_id || '',
          base_url: provider.base_url,
          response_format: provider.response_format,
        },
        voice_id: '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        tts_provider_id: '',
        tts_config: undefined,
        voice_id: '',
      }));
    }
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voice = e.target.value;
    const isRealtime = formData.llm_model === 'openai-realtime';
    if (isRealtime) {
      setFormData((prev) => ({
        ...prev,
        voice_id: voice,
        llm_config: { ...prev.llm_config, voice },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        voice_id: voice,
        tts_config: prev.tts_config ? { ...prev.tts_config, voice } : undefined,
      }));
    }
  };

  // ── Tool handlers ──

  const handleToolInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewTool((prev) => ({ ...prev, [name]: value }));
  };

  const handleAuthTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNewTool((prev) => ({ ...prev, auth_type: e.target.value, auth_config: {} }));
  };

  const handleAuthConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTool((prev) => ({
      ...prev,
      auth_config: { ...prev.auth_config, [name]: value },
    }));
  };

  const handleAddTool = async () => {
    if (!selectedAgentId || !newTool.name) return;
    try {
      const created = await agentService.createAgentTool(selectedAgentId, newTool as CreateToolData);
      setTools((prev) => [...prev, created]);
      setNewTool({
        name: '',
        description: '',
        endpoint_url: '',
        method: 'GET',
        auth_type: '',
        auth_config: {},
        request_schema: '',
        response_schema: '',
      });
      setShowAddToolModal(false);
      toast.success('Tool added');
    } catch {
      toast.error('Failed to add tool');
    }
  };

  const handleRemoveTool = async (index: number) => {
    if (!selectedAgentId) return;
    const tool = tools[index];
    try {
      await agentService.deleteAgentTool(selectedAgentId, tool.id);
      setTools((prev) => prev.filter((_, i) => i !== index));
      toast.success('Tool removed');
    } catch {
      toast.error('Failed to remove tool');
    }
  };

  // ── RAG handlers ──

  const handleAddRagConfig = (dbId: string, collectionName: string) => {
    const newConfigs = [...ragConfigs, { dbId, collectionName }];
    setRagConfigs(newConfigs);
    const db = vectorDbs.find((d) => d.id === dbId);
    setFormData((prev) => ({
      ...prev,
      rag_config: [
        ...(prev.rag_config ?? []),
        {
          id: dbId,
          collection_name: collectionName,
          embedding_model: 'openai',
          description: db?.description ?? undefined,
        },
      ],
    }));
  };

  const handleDeleteRagConfig = (index: number) => {
    setRagConfigs((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      rag_config: (prev.rag_config ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleCopyId = () => {
    if (!selectedAgentId) return;
    navigator.clipboard.writeText(selectedAgentId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // ── AI Builder: auto-scroll ──
  useEffect(() => {
    if (builderOpen) builderEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [builderMessages, builderOpen]);

  useEffect(() => {
    if (builderOpen && !builderStreaming) builderInputRef.current?.focus();
  }, [builderOpen, builderStreaming]);

  useEffect(() => {
    if (builderOpen && llmProviders.length > 0 && !builderLLMProvider) {
      setBuilderLLMProvider(llmProviders[0].id);
    }
  }, [builderOpen, llmProviders, builderLLMProvider]);

  const handleBuilderSend = async () => {
    const text = builderInput.trim();
    if (!text || builderStreaming || !builderLLMProvider) return;

    const userMsg: BuilderMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setBuilderMessages((prev) => [...prev, userMsg]);
    setBuilderInput('');

    const newHistory: ChatMessage[] = [...builderChatHistory, { role: 'user', content: text }];
    setBuilderChatHistory(newHistory);

    const assistantMsg: BuilderMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: '',
      isStreaming: true,
      toolCalls: [],
    };
    setBuilderMessages((prev) => [...prev, assistantMsg]);
    setBuilderStreaming(true);

    const abortController = new AbortController();
    builderAbortRef.current = abortController;

    try {
      await streamChat(
        newHistory,
        builderLLMProvider,
        (event: SSEEvent) => {
          switch (event.type) {
            case 'message':
              setBuilderMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: event.content || '', isStreaming: false }
                    : m
                )
              );
              if (event.content) {
                setBuilderChatHistory((prev) => [
                  ...prev,
                  { role: 'assistant', content: event.content! },
                ]);
              }
              break;

            case 'tool_call':
              setBuilderMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? {
                        ...m,
                        toolCalls: [
                          ...(m.toolCalls || []),
                          { name: event.tool_name || '', status: 'running' as const },
                        ],
                      }
                    : m
                )
              );
              break;

            case 'tool_result':
              setBuilderMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? {
                        ...m,
                        toolCalls: (m.toolCalls || []).map((tc) =>
                          tc.name === event.tool_name ? { ...tc, status: 'done' as const } : tc
                        ),
                      }
                    : m
                )
              );
              break;

            case 'agent_created':
              setBuilderMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? {
                        ...m,
                        agentCreated: {
                          agent_id: event.agent_id || '',
                          agent_name: event.agent_name || '',
                        },
                      }
                    : m
                )
              );
              if (event.agent_id) {
                agentService.getAgentById(event.agent_id).then((newAgent) => {
                  setAgents((prev) => {
                    const exists = prev.some((a) => a.id === newAgent.id);
                    return exists ? prev : [newAgent, ...prev];
                  });
                  setSelectedAgentId(newAgent.id);
                }).catch(() => {
                  fetchAgents();
                });
              }
              break;

            case 'error':
              setBuilderMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: event.content || 'An error occurred.', isStreaming: false }
                    : m
                )
              );
              break;

            case 'done':
              setBuilderMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id ? { ...m, isStreaming: false } : m
                )
              );
              break;
          }
        },
        abortController.signal
      );
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setBuilderMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: 'Failed to connect to AI Builder.', isStreaming: false }
              : m
          )
        );
      }
    } finally {
      setBuilderStreaming(false);
      builderAbortRef.current = null;
    }
  };

  const handleBuilderReset = () => {
    if (builderAbortRef.current) builderAbortRef.current.abort();
    setBuilderMessages([]);
    setBuilderChatHistory([]);
    setBuilderInput('');
    setBuilderStreaming(false);
  };

  const toolDisplayNames: Record<string, string> = {
    list_llm_providers: 'Checking LLM providers',
    list_tts_providers: 'Checking TTS providers',
    list_rag_databases: 'Checking RAG databases',
    list_existing_agents: 'Listing agents',
    create_agent: 'Creating agent',
  };

  // ── Get model options for selected provider ──
  const getModelOptions = () => {
    const provider = llmProviders.find((p) => p.id === selectedLLMProvider);
    if (!provider) return [];
    switch (provider.provider_name) {
      case 'openai':
        return openaiLLMModels;
      case 'groq':
        return groqModelOptions;
      case 'anthropic':
        return [
          { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
          { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (New)' },
          { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
          { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet (Old)' },
        ];
      case 'gemini':
        return [
          { value: 'gemini-pro', label: 'Gemini Pro' },
          { value: 'gemini-ultra', label: 'Gemini Ultra' },
        ];
      default:
        return [];
    }
  };

  // ── Get voice options for selected TTS provider ──
  const getVoiceOptions = () => {
    if (formData.llm_model === 'openai-realtime') return openaiVoiceOptions;
    switch (selectedTTSProviderName) {
      case 'openai':
        return openaiVoiceOptions;
      case 'groq':
        return groqVoiceOptions;
      case 'elevenlabs':
        return elevenLabsVoiceOptions;
      case 'cartesia':
        return cartesiaVoiceOptions;
      default:
        return [];
    }
  };

  // ── Style helpers ──
  const inputCls = `w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
    darkMode
      ? 'bg-gray-800 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500'
      : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
  }`;

  const selectCls = inputCls;

  const sectionCls = `rounded-xl border p-5 ${
    darkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-white'
  }`;

  const labelCls = `block text-sm font-medium mb-1.5 ${
    darkMode ? 'text-gray-300' : 'text-gray-600'
  }`;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <div className={`flex h-[calc(100vh-64px)] ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* ── LEFT SIDEBAR ── */}
        <div
          className={`w-[280px] flex-shrink-0 border-r flex flex-col ${
            darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-4 h-14 border-b ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bot size={18} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
              <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Agents
              </span>
      </div>
      </div>

          {/* Create Agent button */}
          <div className="px-3 pt-3">
            {showCreateInput ? (
              <div className="flex gap-2">
                <input
                  ref={createInputRef}
                  type="text"
                  placeholder="Agent name..."
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateAgent();
                    if (e.key === 'Escape') {
                      setShowCreateInput(false);
                      setCreateName('');
                    }
                  }}
                  disabled={creating}
                  className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                    darkMode
                      ? 'bg-gray-800 border-gray-600 text-white focus:ring-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                  }`}
                />
                <button
                  onClick={handleCreateAgent}
                  disabled={creating || !createName.trim()}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                </button>
      </div>
            ) : (
              <button
                onClick={() => setShowCreateInput(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Create Agent
              </button>
            )}
      </div>

          {/* Search */}
          <div className="px-3 pt-3">
            <div className="relative">
              <Search
                size={16}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                  darkMode ? 'text-gray-500' : 'text-gray-400'
                }`}
              />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                  darkMode
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:ring-blue-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-blue-500'
                }`}
              />
          </div>
              </div>

          {/* Agent list */}
          <div className="flex-1 overflow-y-auto mt-2 px-2 pb-4">
            {loading ? (
              <div className="space-y-2 px-1 pt-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-14 rounded-lg animate-pulse ${
                      darkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}
                  />
                ))}
              </div>
            ) : filteredAgents.length === 0 ? (
              <div
                className={`text-center py-8 text-sm ${
                  darkMode ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                {searchTerm ? 'No agents match your search' : 'No agents yet'}
            </div>
            ) : (
              <div className="space-y-1 pt-1">
                {filteredAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAgent(agent.id)}
                    className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
                      selectedAgentId === agent.id
                        ? darkMode
                          ? 'bg-blue-600/20 border border-blue-500/40'
                          : 'bg-blue-50 border border-blue-200'
                        : darkMode
                        ? 'hover:bg-gray-800 border border-transparent'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div
                      className={`text-sm font-medium truncate ${
                        selectedAgentId === agent.id
                          ? darkMode
                            ? 'text-blue-400'
                            : 'text-blue-700'
                          : darkMode
                          ? 'text-white'
                          : 'text-gray-900'
                      }`}
                    >
                      {agent.name}
          </div>
                    <div
                      className={`text-xs truncate mt-0.5 ${
                        darkMode ? 'text-gray-500' : 'text-gray-400'
                      }`}
                    >
                      {getProviderSummary(agent, llmProviders)}
            </div>
          </button>
                ))}
      </div>
            )}
    </div>
          </div>

        {/* ── RIGHT DETAIL PANEL ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {selectedAgent ? (
            <>
              {/* Header */}
              <div
                className={`flex items-center justify-between px-6 h-14 border-b flex-shrink-0 ${
                  darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
          <input
            type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className={`text-lg font-semibold bg-transparent border-none outline-none focus:ring-0 p-0 min-w-0 ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}
                    style={{ width: `${Math.max(formData.name.length, 8)}ch` }}
                  />
                  <button
                    onClick={handleCopyId}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                      darkMode
                        ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Copy agent ID"
                  >
                    {copiedId ? <Check size={12} /> : <Copy size={12} />}
                    <span className="font-mono truncate max-w-[120px]">
                      {selectedAgent.id.slice(0, 12)}...
                    </span>
                  </button>
        </div>

                <div className="flex items-center gap-2">
                  {showDeleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                        Delete?
                      </span>
            <button
                        onClick={handleDelete}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          darkMode
                            ? 'text-gray-400 hover:bg-gray-800'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode
                          ? 'text-gray-400 hover:text-red-400 hover:bg-gray-800'
                          : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'
                      }`}
                      title="Delete agent"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      hasChanges
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  : darkMode
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {saving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Save
            </button>

                  <button
                    onClick={() => setBuilderOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-700 hover:to-blue-700 shadow-sm transition-all"
                    title="AI Agent Builder"
                  >
                    <Sparkles size={16} />
                    <span className="hidden sm:inline">AI</span>
                  </button>
                </div>
              </div>

              {/* Tab navigation */}
              <div
                className={`flex items-center gap-1 px-6 border-b flex-shrink-0 ${
                  darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
                }`}
              >
                {TABS.map((tab) => (
            <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      currentTab === tab.id
                  ? darkMode
                          ? 'border-blue-500 text-blue-400'
                          : 'border-blue-600 text-blue-600'
                  : darkMode
                        ? 'border-transparent text-gray-400 hover:text-gray-200'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
                    {tab.icon}
                    {tab.label}
            </button>
                ))}
          </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl space-y-6">
                  {/* ── MODEL TAB ── */}
                  {currentTab === 'model' && (
                    <>
                      <div className={sectionCls}>
                        <h3
                          className={`text-base font-semibold mb-4 ${
                            darkMode ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          Model
                        </h3>
                        <p
                          className={`text-sm mb-5 ${
                            darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}
                        >
                          Configure the behavior of the agent.
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-5">
                          <div>
                            <label className={labelCls}>Provider</label>
                            <select
                              value={selectedLLMProvider}
                              onChange={handleLLMProviderChange}
                              className={selectCls}
                            >
                              <option value="">Select a provider</option>
                              {llmProviders.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.provider_name}
                                </option>
                              ))}
                            </select>
        </div>
                          <div>
                            <label className={labelCls}>Model</label>
                            <select
                              name="llm_model"
                              value={formData.llm_model || ''}
                              onChange={handleInputChange}
                              className={selectCls}
                              disabled={!selectedLLMProvider}
                            >
                              <option value="">Select a model</option>
                              {getModelOptions().map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
      </div>
    </div>

                        <div>
                          <label className={labelCls}>System Prompt</label>
                          <textarea
                            name="instructions"
                            value={formData.instructions}
                            onChange={handleInputChange}
                            rows={10}
                            className={`${inputCls} resize-y min-h-[200px]`}
                            placeholder="Enter system instructions for the agent..."
                          />
                          <p
                            className={`text-xs mt-1.5 ${
                              darkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}
                          >
                            Detailed instructions for the agent to follow.
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── VOICE TAB ── */}
                  {currentTab === 'voice' && (
                    <div className={sectionCls}>
                      <h3
                        className={`text-base font-semibold mb-4 ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        Voice
                      </h3>
                      <p
                        className={`text-sm mb-5 ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        Configure the voice settings for your agent.
                      </p>

                      {formData.llm_model === 'openai-realtime' ? (
                        <div>
                          <label className={labelCls}>
                            Voice (OpenAI Realtime)
                          </label>
                          <select
                            value={formData.llm_config?.voice || formData.voice_id || ''}
                            onChange={handleVoiceChange}
                            className={selectCls}
                          >
                            <option value="">Select a voice</option>
                            {openaiVoiceOptions.map((v) => (
                              <option key={v.value} value={v.value}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                          <p
                            className={`text-xs mt-1.5 ${
                              darkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}
                          >
                            Voice for OpenAI Realtime model.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className={labelCls}>TTS Provider</label>
                            <select
                              value={selectedTTSProvider}
                              onChange={handleTTSProviderChange}
                              className={selectCls}
                            >
                              <option value="">Select a provider</option>
                              {ttsProviders.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.provider_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={labelCls}>Voice</label>
                            <select
                              value={formData.voice_id || ''}
                              onChange={handleVoiceChange}
                              className={selectCls}
                              disabled={!selectedTTSProvider}
                            >
                              <option value="">Select a voice</option>
                              {getVoiceOptions().map((v) => (
                                <option key={v.value} value={v.value}>
                                  {v.label}
                                </option>
                              ))}
                            </select>
                            <p
                              className={`text-xs mt-1.5 ${
                                darkMode ? 'text-gray-500' : 'text-gray-400'
                              }`}
                            >
                              Select a voice for your agent to use when speaking.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── TOOLS TAB ── */}
                  {currentTab === 'tools' && (
                    <ToolsConfigurationTab
                      tools={tools}
                      showAddModal={showAddToolModal}
                      newTool={newTool}
                      onToolInputChange={handleToolInputChange}
                      onAuthTypeChange={handleAuthTypeChange}
                      onAuthConfigChange={handleAuthConfigChange}
                      onAddTool={handleAddTool}
                      onRemoveTool={handleRemoveTool}
                      onOpenAddModal={() => setShowAddToolModal(true)}
                      onCloseAddModal={() => setShowAddToolModal(false)}
                      darkMode={darkMode}
                    />
                  )}

                  {/* ── RAG TAB ── */}
                  {currentTab === 'rag' && (
                    <RagConfigurationTab
                      vectorDbs={vectorDbs}
                      ragConfigs={ragConfigs}
                      collectionsMap={collectionsMap}
                      onAddRagConfig={handleAddRagConfig}
                      onDeleteRagConfig={handleDeleteRagConfig}
            darkMode={darkMode}
                      onFetchCollections={fetchCollections}
                    />
                  )}

                  {/* ── ADVANCED TAB ── */}
                  {currentTab === 'advanced' && (
                    <div className="space-y-6">
                      <div className={sectionCls}>
                        <h3
                          className={`text-base font-semibold mb-4 ${
                            darkMode ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          Description
                        </h3>
                        <textarea
                          name="description"
                          value={formData.description || ''}
                          onChange={handleInputChange}
                          rows={3}
                          className={`${inputCls} resize-y`}
                          placeholder="Optional description for this agent..."
                        />
          </div>

                      <div className={sectionCls}>
                        <h3
                          className={`text-base font-semibold mb-4 ${
                            darkMode ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          Collection Fields
                </h3>
                        <p
                          className={`text-sm mb-4 ${
                            darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}
                        >
                          Define data fields the agent should collect during conversations.
                        </p>
                        <CollectionFieldsEditor
                          fields={formData.collection_fields || []}
                          onChange={(fields: CollectionField[]) =>
                            setFormData((prev) => ({ ...prev, collection_fields: fields }))
                          }
                          darkMode={darkMode}
                        />
                </div>
            </div>
                  )}
            </div>
              </div>
            </>
          ) : (
            /* Empty state when no agent selected */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div
                  className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
                    darkMode ? 'bg-gray-800' : 'bg-gray-100'
                  }`}
                >
                  <Bot size={36} className={darkMode ? 'text-gray-600' : 'text-gray-400'} />
                </div>
                <h3
                  className={`text-xl font-semibold mb-2 ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {agents.length === 0 ? 'Create Your First Agent' : 'Select an Agent'}
              </h3>
                <p
                  className={`text-sm max-w-sm mx-auto mb-6 ${
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  {agents.length === 0
                    ? 'Get started by creating an agent using the button on the left.'
                    : 'Choose an agent from the sidebar to view and edit its configuration.'}
                </p>
                <div className="flex items-center gap-3">
                  {agents.length === 0 && (
                    <button
                      onClick={() => setShowCreateInput(true)}
                      className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Plus size={16} />
                        Create Agent
                      </div>
                    </button>
                  )}
                  <button
                    onClick={() => setBuilderOpen(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-violet-700 hover:to-blue-700 shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} />
                      Build with AI
                    </div>
                  </button>
                </div>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* ── AI BUILDER SLIDE-IN PANEL ── */}
      <AnimatePresence>
        {builderOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !builderStreaming && setBuilderOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={`fixed top-0 right-0 h-full w-[440px] max-w-[90vw] z-50 flex flex-col shadow-2xl ${
                darkMode ? 'bg-gray-900 border-l border-gray-700' : 'bg-white border-l border-gray-200'
              }`}
            >
              {/* Panel header */}
              <div
                className={`flex items-center justify-between px-5 py-4 border-b flex-shrink-0 ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20">
                    <Sparkles size={18} className={darkMode ? 'text-violet-400' : 'text-violet-600'} />
                  </div>
                  <div>
                    <h2 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      AI Agent Builder
                    </h2>
                    <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Describe your agent and I'll build it
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {builderMessages.length > 0 && (
                    <button
                      onClick={handleBuilderReset}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        darkMode
                          ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                      }`}
                      title="New conversation"
                    >
                      New chat
                    </button>
                  )}
                  <button
                    onClick={() => !builderStreaming && setBuilderOpen(false)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      darkMode
                        ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                    }`}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* LLM provider selector */}
              <div
                className={`px-5 py-3 border-b flex-shrink-0 ${
                  darkMode ? 'border-gray-800 bg-gray-900/60' : 'border-gray-100 bg-gray-50/50'
                }`}
              >
                <div className="relative">
                  <label className={`block text-[11px] font-medium mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    LLM Provider
                  </label>
                  <select
                    value={builderLLMProvider}
                    onChange={(e) => setBuilderLLMProvider(e.target.value)}
                    className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="">Select provider</option>
                    {llmProviders.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.provider_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {builderMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                        darkMode
                          ? 'bg-gradient-to-br from-violet-500/20 to-blue-500/20'
                          : 'bg-gradient-to-br from-violet-50 to-blue-50'
                      }`}
                    >
                      <Sparkles size={28} className={darkMode ? 'text-violet-400' : 'text-violet-500'} />
                    </motion.div>
                    <h3 className={`font-semibold mb-1.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      What agent would you like to build?
                    </h3>
                    <p className={`text-sm mb-6 max-w-[280px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Describe your agent's purpose and I'll configure everything automatically.
                    </p>
                    <div className="grid gap-2 w-full max-w-[300px]">
                      {[
                        'Build a customer support agent',
                        'Create an appointment booking agent',
                        'Make a sales qualification agent',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setBuilderInput(suggestion);
                            setTimeout(() => builderInputRef.current?.focus(), 50);
                          }}
                          className={`text-left px-3 py-2.5 text-xs rounded-xl border transition-all ${
                            darkMode
                              ? 'border-gray-700 text-gray-300 hover:border-violet-500/50 hover:bg-violet-500/5'
                              : 'border-gray-200 text-gray-600 hover:border-violet-300 hover:bg-violet-50/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <ArrowRight size={12} className={darkMode ? 'text-violet-400' : 'text-violet-500'} />
                            {suggestion}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {builderMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[88%] ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-2xl rounded-br-md px-4 py-2.5'
                          : `rounded-2xl rounded-bl-md px-4 py-3 ${
                              darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'
                            }`
                      }`}
                    >
                      {/* Tool calls */}
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="space-y-1.5 mb-2">
                          {msg.toolCalls.map((tc, i) => (
                            <div
                              key={i}
                              className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg ${
                                msg.role === 'user'
                                  ? 'bg-white/15'
                                  : darkMode
                                  ? 'bg-gray-700/60'
                                  : 'bg-gray-200/60'
                              }`}
                            >
                              {tc.status === 'running' ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={12} className="text-green-400" />
                              )}
                              <span>{toolDisplayNames[tc.name] || tc.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Agent created card */}
                      {msg.agentCreated && (
                        <div
                          className={`flex items-center gap-2.5 p-3 rounded-xl mb-2 ${
                            msg.role === 'user'
                              ? 'bg-white/15'
                              : darkMode
                              ? 'bg-emerald-500/10 border border-emerald-500/20'
                              : 'bg-emerald-50 border border-emerald-200'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                            <CheckCircle2 size={16} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-semibold ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                              Agent Created!
                            </div>
                            <div className={`text-xs truncate ${darkMode ? 'text-emerald-300/70' : 'text-emerald-600/70'}`}>
                              {msg.agentCreated.agent_name}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedAgentId(msg.agentCreated!.agent_id);
                              setCurrentTab('model');
                            }}
                            className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors ${
                              darkMode
                                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }`}
                          >
                            View
                          </button>
                        </div>
                      )}

                      {/* Message content */}
                      {msg.content && (
                        <div className={`text-sm leading-relaxed prose-sm ${msg.role === 'user' ? 'text-white' : ''} ${
                          darkMode && msg.role !== 'user' ? 'prose-invert' : ''
                        }`}>
                          {msg.role === 'user' ? (
                            msg.content
                          ) : (
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          )}
                        </div>
                      )}

                      {/* Streaming indicator */}
                      {msg.isStreaming && !msg.content && (!msg.toolCalls || msg.toolCalls.length === 0) && (
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  darkMode ? 'bg-gray-500' : 'bg-gray-400'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={builderEndRef} />
              </div>

              {/* Input area */}
              <div
                className={`px-5 py-4 border-t flex-shrink-0 ${
                  darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
                }`}
              >
                {!builderLLMProvider ? (
                  <div className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl ${
                    darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'
                  }`}>
                    <AlertCircle size={14} />
                    Select an LLM provider above to start building
                  </div>
                ) : (
                  <div className="relative">
                    <textarea
                      ref={builderInputRef}
                      value={builderInput}
                      onChange={(e) => setBuilderInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleBuilderSend();
                        }
                      }}
                      placeholder="Describe the agent you want to build..."
                      rows={2}
                      disabled={builderStreaming}
                      className={`w-full pl-4 pr-12 py-3 text-sm border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                    <button
                      onClick={handleBuilderSend}
                      disabled={!builderInput.trim() || builderStreaming}
                      className={`absolute right-2.5 bottom-2.5 p-2 rounded-lg transition-all ${
                        builderInput.trim() && !builderStreaming
                          ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-sm hover:shadow-md'
                          : darkMode
                          ? 'bg-gray-700 text-gray-500'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {builderStreaming ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </MainLayout>
  );
};

export default AgentsPage; 
