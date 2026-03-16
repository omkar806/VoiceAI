'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NextPage } from 'next';
import { 
  Plus, 
  Database, 
  Settings as SettingsIcon,
  RefreshCcw,
  XCircle,
  Search,
  Filter,
  Grid,
  List,
  Activity,
  TrendingUp,
  Sparkles,
  Cpu,
  MessageSquare,
  Zap,
  Brain,
  VolumeX,
  Server
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '../../components/layout/MainLayout';
import ragService, { VectorDB, VectorDBType } from '../../services/rag';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';
import ConfirmDialog from '../../components/workflows/ConfirmDialog';
import llmService, { getUserLLMProviders, deleteUserLLMProvider } from '../../services/llm';
import ttsService, { getUserTTSProviders, deleteUserTTSProvider } from '../../services/tts';
import AddLLMProviderModal from '../../components/settings/AddLLMProviderModal';
import AddTTSProviderModal from '../../components/settings/AddTTSProviderModal';
import AddRAGDatabaseModal from '../../components/settings/AddRAGDatabaseModal';

// Enhanced animation styles with GPU acceleration
const animationStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translate3d(0, 20px, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
  .animate-fadeInUp {
    animation: fadeInUp 0.4s ease-out forwards;
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translate3d(30px, 0, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
  .animate-slideInRight {
    animation: slideInRight 0.5s ease-out forwards;
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale3d(0.9, 0.9, 1);
    }
    to {
      opacity: 1;
      transform: scale3d(1, 1, 1);
    }
  }
  .animate-scaleIn {
    animation: scaleIn 0.3s ease-out forwards;
  }

  @keyframes shimmer {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: calc(200px + 100%) 0;
    }
  }
  .animate-shimmer {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    background-size: 200px 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale3d(0.95, 0.95, 1);
      box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7);
    }
    70% {
      transform: scale3d(1, 1, 1);
      box-shadow: 0 0 0 6px rgba(52, 211, 153, 0);
    }
    100% {
      transform: scale3d(0.95, 0.95, 1);
      box-shadow: 0 0 0 0 rgba(52, 211, 153, 0);
    }
  }
  
  @keyframes glowPulse {
    0% {
      box-shadow: 0 0 5px 0px rgba(52, 211, 153, 0.7);
    }
    50% {
      box-shadow: 0 0 10px 3px rgba(52, 211, 153, 0.5);
    }
    100% {
      box-shadow: 0 0 5px 0px rgba(52, 211, 153, 0.7);
    }
  }
  
  .animate-status-pulse {
    animation: pulse 2s infinite;
  }
  
  .animate-glow-pulse {
    animation: glowPulse 2s infinite;
  }

  .gpu-accelerated {
    transform: translate3d(0, 0, 0);
    backface-visibility: hidden;
    perspective: 1000px;
  }

  .content-fade-in {
    animation: fadeInUp 0.4s ease-out forwards;
  }

  .hover-lift {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }

  .glass-effect {
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .tab-glow {
    position: relative;
    overflow: hidden;
  }
  .tab-glow::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.2), transparent);
    transition: left 0.5s;
  }
  .tab-glow.active::before {
    left: 100%;
  }
`;

// Tabs for settings
type SettingsTab = 'llm' | 'tts' | 'rag';

// Fast loading skeleton components
const ProviderSkeleton = React.memo(() => {
  const { darkMode } = useTheme();
  return (
    <div className={`p-6 rounded-2xl border animate-shimmer hover-lift gpu-accelerated ${
      darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/80 border-gray-200/50'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`h-6 rounded w-3/4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className={`w-20 h-8 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
      </div>
      <div className="space-y-3 mb-4">
        <div className={`h-4 rounded w-1/2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className={`h-4 rounded w-1/3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
      </div>
      <div className="flex justify-end">
        <div className={`h-8 w-16 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
      </div>
    </div>
  );
});

// Enhanced header component
const SettingsHeader = React.memo(({ 
  activeTab,
  llmCount,
  ttsCount,
  ragCount
}: { 
  activeTab: SettingsTab;
  llmCount: number;
  ttsCount: number;
  ragCount: number;
}) => {
  const { darkMode } = useTheme();
  
  const getTabInfo = () => {
    switch (activeTab) {
      case 'llm':
        return {
          title: 'LLM Providers',
          description: 'Manage your Language Model providers and configurations',
          count: llmCount,
          icon: Brain
        };
      case 'tts':
        return {
          title: 'TTS Providers',
          description: 'Configure Text-to-Speech providers for voice synthesis',
          count: ttsCount,
          icon: VolumeX
        };
      case 'rag':
        return {
          title: 'RAG Databases',
          description: 'Set up vector databases for Retrieval Augmented Generation',
          count: ragCount,
          icon: Database
        };
    }
  };

  const tabInfo = getTabInfo();
  const IconComponent = tabInfo.icon;

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 content-fade-in">
      <div className="mb-6 lg:mb-0">
        <div className="flex items-center space-x-4 mb-3">
          <div className={`p-3 rounded-2xl ${
            darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'
          }`}>
            <SettingsIcon size={28} />
          </div>
          <div>
            <h1 className={`text-3xl font-bold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
              Settings
            </h1>
            <div className="flex items-center space-x-4 mt-1">
              <div className={`flex items-center space-x-2 text-sm ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                <IconComponent size={16} />
                <span>{tabInfo.title}</span>
              </div>
              <div className={`flex items-center space-x-2 text-sm ${
                darkMode ? "text-green-400" : "text-green-600"
              }`}>
                <Activity size={16} />
                <span>{tabInfo.count} configured</span>
              </div>
            </div>
          </div>
        </div>
        <p className={`text-lg max-w-2xl ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
          {tabInfo.description}
        </p>
      </div>
    </div>
  );
});

// Enhanced tab navigation component
const TabNavigation = React.memo(({ 
  activeTab, 
  setActiveTab, 
  darkMode 
}: {
  activeTab: SettingsTab;
  setActiveTab: (tab: SettingsTab) => void;
  darkMode: boolean;
}) => {
  const tabs = [
    { id: 'llm' as SettingsTab, label: 'LLM Providers', icon: Brain },
    { id: 'tts' as SettingsTab, label: 'TTS Providers', icon: VolumeX },
    { id: 'rag' as SettingsTab, label: 'RAG Databases', icon: Database },
  ];

  return (
    <div className={`rounded-2xl border shadow-xl backdrop-blur-sm p-2 mb-8 content-fade-in glass-effect ${
      darkMode
        ? "bg-gray-800/50 border-gray-700/50"
        : "bg-white/80 border-gray-200/50"
    }`}>
      <div className="flex space-x-1">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-4 rounded-xl font-medium transition-all duration-200 tab-glow ${
                activeTab === tab.id
                  ? darkMode
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-blue-600 text-white shadow-lg"
                  : darkMode
                    ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700/50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              } ${activeTab === tab.id ? 'active' : ''}`}
            >
              <IconComponent size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

// Enhanced provider card component
const ProviderCard = React.memo(({ 
  provider, 
  onDelete, 
  type,
  index 
}: { 
  provider: any; 
  onDelete: (id: string) => void;
  type: 'llm' | 'tts' | 'rag';
  index: number;
}) => {
  const { darkMode } = useTheme();
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getProviderIcon = () => {
    switch (type) {
      case 'llm': return Brain;
      case 'tts': return VolumeX;
      case 'rag': return Database;
    }
  };

  const IconComponent = getProviderIcon();

  return (
    <div
      className={`p-6 rounded-2xl border hover-lift gpu-accelerated content-fade-in glass-effect ${
        darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/80 border-gray-200/50'
      }`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'
          }`}>
            <IconComponent size={20} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {provider.provider_name || provider.name}
            </h3>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {type === 'rag' ? provider.db_type : 'Provider'}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
        }`}>
          Active
        </div>
      </div>
      
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Created
          </span>
          <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {formatDate(provider.created_at)}
          </span>
        </div>
        {type === 'rag' && provider.description && (
          <div className="flex items-center justify-between">
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Description
            </span>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {provider.description}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <button 
          onClick={() => onDelete(provider.id)}
          className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-medium transition-all duration-200 hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl transform hover:scale-105 gpu-accelerated"
        >
          Delete
        </button>
      </div>
    </div>
  );
});

const SettingsPage: NextPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { darkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('llm');
  const [showAddModal, setShowAddModal] = useState(false);
  const [vectorDBs, setVectorDBs] = useState<VectorDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbToDelete, setDbToDelete] = useState<VectorDB | null>(null);
  
  // Provider modals
  const [showAddLLMModal, setShowAddLLMModal] = useState(false);
  const [showAddTTSModal, setShowAddTTSModal] = useState(false);
  
  // Provider delete confirmation
  const [llmToDelete, setLlmToDelete] = useState<any | null>(null);
  const [ttsToDelete, setTtsToDelete] = useState<any | null>(null);
  
  const [llmProviders, setLLMProviders] = useState<any[]>([]);
  const [ttsProviders, setTTSProviders] = useState<any[]>([]);

  // Set active tab based on URL parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'llm' || tab === 'tts' || tab === 'rag') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Fetch vector databases
  const fetchVectorDBs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ragService.getVectorDBs();
      setVectorDBs(data);
    } catch (err) {
      console.error('Error fetching vector DBs:', err);
      setError('Failed to load vector databases');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch LLM providers
  const fetchLLMProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserLLMProviders();
      setLLMProviders(data);
    } catch (err) {
      console.error('Error fetching LLM providers:', err);
      setError('Failed to load LLM providers');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch TTS providers
  const fetchTTSProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserTTSProviders();
      setTTSProviders(data);
    } catch (err) {
      console.error('Error fetching TTS providers:', err);
      setError('Failed to load TTS providers');
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoized counts for performance
  const counts = useMemo(() => ({
    llm: llmProviders.length,
    tts: ttsProviders.length,
    rag: vectorDBs.length
  }), [llmProviders.length, ttsProviders.length, vectorDBs.length]);

  useEffect(() => {
    switch (activeTab) {
      case 'llm':
        fetchLLMProviders();
        break;
      case 'tts':
        fetchTTSProviders();
        break;
      case 'rag':
        fetchVectorDBs();
        break;
    }
  }, [activeTab, fetchLLMProviders, fetchTTSProviders, fetchVectorDBs]);

  // Handle delete functions
  const handleDeleteDB = async (id: string) => {
    const db = vectorDBs.find(db => db.id === id);
    if (db) {
      setDbToDelete(db);
    }
  };

  const confirmDelete = async () => {
    if (!dbToDelete) return;
    
    try {
      await ragService.deleteVectorDB(dbToDelete.id);
      setVectorDBs(prev => prev.filter(db => db.id !== dbToDelete.id));
      setDbToDelete(null);
      toast.success('Vector database deleted successfully', {
        style: {
          background: darkMode ? '#1E1E1E' : '#F0FDF4',
          color: darkMode ? '#86EFAC' : '#15803D',
          borderColor: darkMode ? '#166534' : '#DCFCE7',
          borderLeftWidth: '4px',
        },
        icon: '✅'
      });
    } catch (err) {
      console.error('Error deleting vector DB:', err);
      toast.error('Failed to delete vector database', {
        style: {
          background: darkMode ? '#1E1E1E' : '#FEF2F2',
          color: darkMode ? '#F87171' : '#DC2626',
          borderColor: darkMode ? '#991B1B' : '#FECACA',
          borderLeftWidth: '4px',
        },
        icon: '❌'
      });
    }
  };

  const handleDeleteLLM = async (id: string) => {
    const provider = llmProviders.find(prov => prov.id === id);
    if (provider) {
      setLlmToDelete(provider);
    }
  };

  const confirmDeleteLLM = async () => {
    if (!llmToDelete) return;
    
    try {
      await deleteUserLLMProvider(llmToDelete.id);
      setLLMProviders(prev => prev.filter(prov => prov.id !== llmToDelete.id));
      setLlmToDelete(null);
      toast.success('LLM provider deleted successfully', {
        style: {
          background: darkMode ? '#1E1E1E' : '#F0FDF4',
          color: darkMode ? '#86EFAC' : '#15803D',
          borderColor: darkMode ? '#166534' : '#DCFCE7',
          borderLeftWidth: '4px',
        },
        icon: '✅'
      });
    } catch (err) {
      console.error('Error deleting LLM provider:', err);
      toast.error('Failed to delete LLM provider', {
        style: {
          background: darkMode ? '#1E1E1E' : '#FEF2F2',
          color: darkMode ? '#F87171' : '#DC2626',
          borderColor: darkMode ? '#991B1B' : '#FECACA',
          borderLeftWidth: '4px',
        },
        icon: '❌'
      });
    }
  };

  const handleDeleteTTS = async (id: string) => {
    const provider = ttsProviders.find(prov => prov.id === id);
    if (provider) {
      setTtsToDelete(provider);
    }
  };

  const confirmDeleteTTS = async () => {
    if (!ttsToDelete) return;
    
    try {
      await deleteUserTTSProvider(ttsToDelete.id);
      setTTSProviders(prev => prev.filter(prov => prov.id !== ttsToDelete.id));
      setTtsToDelete(null);
      toast.success('TTS provider deleted successfully', {
        style: {
          background: darkMode ? '#1E1E1E' : '#F0FDF4',
          color: darkMode ? '#86EFAC' : '#15803D',
          borderColor: darkMode ? '#166534' : '#DCFCE7',
          borderLeftWidth: '4px',
        },
        icon: '✅'
      });
    } catch (err) {
      console.error('Error deleting TTS provider:', err);
      toast.error('Failed to delete TTS provider', {
        style: {
          background: darkMode ? '#1E1E1E' : '#FEF2F2',
          color: darkMode ? '#F87171' : '#DC2626',
          borderColor: darkMode ? '#991B1B' : '#FECACA',
          borderLeftWidth: '4px',
        },
        icon: '❌'
      });
    }
  };

  // Render content based on active tab
  const renderTabContent = () => {
    const currentData = activeTab === 'llm' ? llmProviders : activeTab === 'tts' ? ttsProviders : vectorDBs;
    const currentType = activeTab;

    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <ProviderSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className={`rounded-2xl border shadow-xl p-8 text-center content-fade-in glass-effect ${
          darkMode 
            ? "bg-gray-800/50 border-gray-700/50"
            : "bg-white/80 border-gray-200/50"
        }`}>
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
            darkMode ? "bg-red-900/30" : "bg-red-100"
          }`}>
            <XCircle size={40} className={darkMode ? "text-red-400" : "text-red-600"} />
          </div>
          <h3 className={`text-2xl font-semibold mb-3 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}>
            Something went wrong
          </h3>
          <p className={`text-lg mb-8 max-w-md mx-auto ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}>
            {error}
          </p>
          <button 
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105 gpu-accelerated"
            onClick={() => {
              switch (activeTab) {
                case 'llm': return fetchLLMProviders();
                case 'tts': return fetchTTSProviders();
                case 'rag': return fetchVectorDBs();
              }
            }}
          >
            <div className="flex items-center space-x-3">
              <RefreshCcw size={20} />
              <span>Try Again</span>
            </div>
          </button>
        </div>
      );
    }

    if (currentData.length === 0) {
      const getEmptyStateContent = () => {
        switch (activeTab) {
          case 'llm':
            return {
              icon: Brain,
              title: 'No LLM Providers',
              description: 'Add your first Language Model provider to start building intelligent agents.',
              buttonText: 'Add LLM Provider',
              action: () => setShowAddLLMModal(true)
            };
          case 'tts':
            return {
              icon: VolumeX,
              title: 'No TTS Providers',
              description: 'Configure Text-to-Speech providers to enable voice synthesis in your agents.',
              buttonText: 'Add TTS Provider',
              action: () => setShowAddTTSModal(true)
            };
          case 'rag':
            return {
              icon: Database,
              title: 'No RAG Databases',
              description: 'Set up vector databases to enable Retrieval Augmented Generation capabilities.',
              buttonText: 'Add RAG Database',
              action: () => setShowAddModal(true)
            };
        }
      };

      const emptyState = getEmptyStateContent();
      const IconComponent = emptyState.icon;

      return (
        <div className={`rounded-2xl border shadow-xl p-12 text-center content-fade-in glass-effect ${
          darkMode 
            ? "bg-gray-800/50 border-gray-700/50"
            : "bg-white/80 border-gray-200/50"
        }`}>
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-8 ${
            darkMode ? "bg-blue-900/30" : "bg-blue-50"
          }`}>
            <IconComponent size={48} className={darkMode ? "text-blue-400" : "text-blue-600"} />
          </div>
          <h2 className={`text-3xl font-bold mb-4 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}>
            {emptyState.title}
          </h2>
          <p className={`text-lg mb-8 max-w-2xl mx-auto ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}>
            {emptyState.description}
          </p>
          <button
            onClick={emptyState.action}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105 gpu-accelerated"
          >
            <div className="flex items-center space-x-3">
              <Plus size={20} />
              <span>{emptyState.buttonText}</span>
            </div>
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Add button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              switch (activeTab) {
                case 'llm': return setShowAddLLMModal(true);
                case 'tts': return setShowAddTTSModal(true);
                case 'rag': return setShowAddModal(true);
              }
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105 gpu-accelerated"
          >
            <div className="flex items-center space-x-2">
              <Plus size={18} />
              <span>Add {activeTab === 'llm' ? 'LLM' : activeTab === 'tts' ? 'TTS' : 'Database'}</span>
            </div>
          </button>
        </div>

        {/* Provider cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentData.map((item, index) => (
            <ProviderCard
              key={item.id}
              provider={item}
              onDelete={activeTab === 'llm' ? handleDeleteLLM : activeTab === 'tts' ? handleDeleteTTS : handleDeleteDB}
              type={currentType}
              index={index}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      <div className={`min-h-screen transition-colors duration-200 ${
        darkMode ? "bg-gray-900" : "bg-gray-50"
      }`}>
        <div className="max-w-7xl mx-auto p-6 space-y-8">
          <SettingsHeader 
            activeTab={activeTab}
            llmCount={counts.llm}
            ttsCount={counts.tts}
            ragCount={counts.rag}
          />
          
          <TabNavigation 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            darkMode={darkMode}
          />

          {renderTabContent()}
        </div>
      </div>

      {/* Modals */}
      <AddLLMProviderModal 
        isOpen={showAddLLMModal} 
        onClose={() => setShowAddLLMModal(false)} 
        onSuccess={fetchLLMProviders}
        existingProviders={llmProviders}
      />
      
      <AddTTSProviderModal 
        isOpen={showAddTTSModal} 
        onClose={() => setShowAddTTSModal(false)} 
        onSuccess={fetchTTSProviders}
        existingProviders={ttsProviders}
      />
      
      <AddRAGDatabaseModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onSuccess={fetchVectorDBs}
        existingDatabases={vectorDBs}
      />
      
      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={!!dbToDelete}
        title="Delete Vector Database"
        message={`Are you sure you want to delete the "${dbToDelete?.name}" vector database? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDbToDelete(null)}
        darkMode={darkMode}
      />

      <ConfirmDialog
        isOpen={!!llmToDelete}
        title="Delete LLM Provider"
        message={`Are you sure you want to delete the "${llmToDelete?.provider_name}" LLM provider? This action cannot be undone.`}
        onConfirm={confirmDeleteLLM}
        onCancel={() => setLlmToDelete(null)}
        darkMode={darkMode}
      />

      <ConfirmDialog
        isOpen={!!ttsToDelete}
        title="Delete TTS Provider"
        message={`Are you sure you want to delete the "${ttsToDelete?.provider_name}" TTS provider? This action cannot be undone.`}
        onConfirm={confirmDeleteTTS}
        onCancel={() => setTtsToDelete(null)}
        darkMode={darkMode}
      />
    </MainLayout>
  );
};

export default SettingsPage; 