'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NextPage } from 'next';
import { 
  Phone, 
  Plus, 
  RefreshCcw, 
  X, 
  XCircle,
  Search,
  Filter,
  Grid,
  List,
  Zap,
  Clock,
  Users,
  Activity,
  TrendingUp,
  Sparkles,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import callAgentService, { CallAgent } from '../../services/call_agent';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';
import CallAgentCard from '../../components/call-agents/CallAgentCard';
import CreateCallAgentDialog from '../../components/call-agents/CreateCallAgentDialog';
import Button from '../../components/ui/Button';

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
`;

// Fast loading skeleton components
const CallAgentSkeleton = React.memo(() => {
  const { darkMode } = useTheme();
  return (
    <div className={`p-6 rounded-2xl border animate-shimmer hover-lift gpu-accelerated ${
      darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/80 border-gray-200/50'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`h-6 rounded w-3/4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
      </div>
      <div className="space-y-3 mb-6">
        <div className={`h-4 rounded w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className={`h-4 rounded w-2/3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
      </div>
      <div className="flex items-center space-x-4 mb-4">
        <div className={`w-8 h-8 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className={`h-4 rounded w-1/3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
      </div>
      <div className="flex space-x-2">
        <div className={`h-10 rounded-xl flex-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className={`h-10 rounded-xl flex-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
      </div>
    </div>
  );
});

// Enhanced header component
const CallAgentsHeader = React.memo(({ 
  setShowCreateDialog, 
  callAgentCount, 
  activeCount 
}: { 
  setShowCreateDialog: (show: boolean) => void;
  callAgentCount: number;
  activeCount: number;
}) => {
  const { darkMode } = useTheme();
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 content-fade-in">
      <div className="mb-6 lg:mb-0">
        <div className="flex items-center space-x-4 mb-3">
          <div className={`p-3 rounded-2xl ${
            darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'
          }`}>
            <Phone size={28} />
          </div>
          <div>
            <h1 className={`text-3xl font-bold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
              Call Agents
            </h1>
            <div className="flex items-center space-x-4 mt-1">
              <div className={`flex items-center space-x-2 text-sm ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                <Activity size={16} />
                <span>{callAgentCount} agents</span>
              </div>
              <div className={`flex items-center space-x-2 text-sm ${
                darkMode ? "text-green-400" : "text-green-600"
              }`}>
                <PhoneCall size={16} />
                <span>{activeCount} active</span>
              </div>
            </div>
          </div>
        </div>
        <p className={`text-lg max-w-2xl ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
          Manage calls with workflows for inbound or outbound calling
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105 gpu-accelerated"
        >
          <div className="flex items-center space-x-2">
            <Plus size={18} />
            <span>Create Call Agent</span>
          </div>
        </button>
      </div>
    </div>
  );
});

// Enhanced search and filter component
const SearchAndFilter = React.memo(({ 
  searchTerm, 
  setSearchTerm, 
  viewMode, 
  setViewMode,
  darkMode 
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  darkMode: boolean;
}) => {
  return (
    <div className={`rounded-2xl border shadow-xl backdrop-blur-sm p-6 mb-8 content-fade-in glass-effect ${
      darkMode
        ? "bg-gray-800/50 border-gray-700/50"
        : "bg-white/80 border-gray-200/50"
    }`}>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={20} className={darkMode ? "text-gray-400" : "text-gray-500"} />
          </div>
          <input
            type="text"
            placeholder="Search call agents..."
            className={`pl-12 pr-4 py-4 w-full rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${
              darkMode
                ? "bg-gray-900/50 text-white placeholder-gray-400"
                : "bg-gray-50/50 text-gray-900 placeholder-gray-500"
            }`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-3">
          <div className={`flex rounded-xl border ${
            darkMode ? "border-gray-600 bg-gray-800/50" : "border-gray-300 bg-gray-50/50"
          }`}>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-l-xl transition-all duration-200 ${
                viewMode === 'grid'
                  ? darkMode
                    ? "bg-blue-600 text-white"
                    : "bg-blue-600 text-white"
                  : darkMode
                    ? "text-gray-400 hover:text-gray-300"
                    : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-r-xl transition-all duration-200 ${
                viewMode === 'list'
                  ? darkMode
                    ? "bg-blue-600 text-white"
                    : "bg-blue-600 text-white"
                  : darkMode
                    ? "text-gray-400 hover:text-gray-300"
                    : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

const CallAgentsPage: NextPage = () => {
  const { darkMode } = useTheme();
  const [callAgents, setCallAgents] = useState<CallAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [callAgentToDelete, setCallAgentToDelete] = useState<CallAgent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Memoized filtered call agents for performance
  const filteredCallAgents = useMemo(() => {
    if (!searchTerm) return callAgents;
    return callAgents.filter(callAgent =>
      (callAgent.workflow?.name && callAgent.workflow.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      callAgent.call_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      callAgent.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [callAgents, searchTerm]);

  // Memoized active count for performance
  const activeCount = useMemo(() => {
    return callAgents.filter(ca => ca.status === 'active').length;
  }, [callAgents]);
  
  const fetchCallAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callAgentService.getCallAgents();
      setCallAgents(data);
    } catch (err) {
      console.error('Error fetching call agents:', err);
      setError('Failed to load call agents. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Function to handle delete button click
  const handleDeleteClick = (callAgent: CallAgent, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCallAgentToDelete(callAgent);
    setShowDeleteModal(true);
  };

  // Function to confirm deletion
  const confirmDelete = async () => {
    if (!callAgentToDelete) return;
    
    try {
      await callAgentService.deleteCallAgent(callAgentToDelete.id);
      setCallAgents(prevCallAgents => prevCallAgents.filter(ca => ca.id !== callAgentToDelete.id));
      setShowDeleteModal(false);
      setCallAgentToDelete(null);
      toast.success('Call agent deleted successfully', {
        style: {
          background: darkMode ? '#1E1E1E' : '#F0FDF4',
          color: darkMode ? '#86EFAC' : '#15803D',
          borderColor: darkMode ? '#166534' : '#DCFCE7',
          borderLeftWidth: '4px',
        },
        icon: '✅'
      });
    } catch (err) {
      console.error('Error deleting call agent:', err);
      toast.error('Failed to delete call agent', {
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

  useEffect(() => {
    fetchCallAgents();
  }, [fetchCallAgents]);

  return (
    <MainLayout>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      <div className={`min-h-screen transition-colors duration-200 ${
        darkMode ? "bg-gray-900" : "bg-gray-50"
      }`}>
        <div className="max-w-7xl mx-auto p-6 space-y-8">
          <CallAgentsHeader 
            setShowCreateDialog={setShowCreateDialog}
            callAgentCount={callAgents.length}
            activeCount={activeCount}
          />
          
          <SearchAndFilter 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            viewMode={viewMode}
            setViewMode={setViewMode}
            darkMode={darkMode}
          />
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <CallAgentSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
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
                onClick={fetchCallAgents}
              >
                <div className="flex items-center space-x-3">
                  <RefreshCcw size={20} />
                  <span>Try Again</span>
                </div>
              </button>
            </div>
          ) : filteredCallAgents.length === 0 ? (
            searchTerm ? (
              <div className={`rounded-2xl border shadow-xl p-12 text-center content-fade-in glass-effect ${
                darkMode
                  ? "bg-gray-800/50 border-gray-700/50"
                  : "bg-white/80 border-gray-200/50"
              }`}>
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
                  darkMode ? "bg-gray-700/50" : "bg-gray-100"
                }`}>
                  <Search size={40} className={darkMode ? "text-gray-400" : "text-gray-500"} />
                </div>
                <h3 className={`text-2xl font-semibold mb-3 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                  No call agents found
                </h3>
                <p className={`text-lg mb-8 max-w-md mx-auto ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                  No call agents match your search for "{searchTerm}". Try adjusting your search terms.
                </p>
                <button
                  onClick={() => setSearchTerm('')}
                  className={`px-6 py-3 border-2 rounded-xl font-medium transition-all duration-200 hover-lift ${
                    darkMode
                      ? "border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                  } shadow-sm hover:shadow-md gpu-accelerated`}
                >
                  Clear Search
                </button>
          </div>
            ) : (
              <div className={`rounded-2xl border shadow-xl p-12 text-center content-fade-in glass-effect ${
            darkMode 
                  ? "bg-gray-800/50 border-gray-700/50"
                  : "bg-white/80 border-gray-200/50"
              }`}>
                <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-8 ${
                  darkMode ? "bg-blue-900/30" : "bg-blue-50"
                }`}>
                  <Phone size={48} className={darkMode ? "text-blue-400" : "text-blue-600"} />
            </div>
                <h2 className={`text-3xl font-bold mb-4 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
              Create Your First Call Agent
            </h2>
                <p className={`text-lg mb-8 max-w-2xl mx-auto ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                  You haven't created any call agents yet. Set up intelligent call agents to handle inbound or outbound calls with powerful workflows and AI automation.
            </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
              onClick={() => setShowCreateDialog(true)}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105 gpu-accelerated"
                  >
                    <div className="flex items-center space-x-3">
                      <Plus size={20} />
                      <span>Create Call Agent</span>
                    </div>
                  </button>
                </div>
          </div>
            )
        ) : (
            <div className={`${
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                : 'space-y-4'
            }`}>
              {filteredCallAgents.map((callAgent, index) => (
                <div
                  key={callAgent.id}
                  className="animate-slideInRight"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
              <CallAgentCard
                callAgent={callAgent}
                onDelete={handleDeleteClick}
              />
                </div>
            ))}
          </div>
        )}
        </div>
      </div>
        
      {/* Enhanced Delete confirmation modal */}
        {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-scaleIn">
          <div className={`rounded-2xl w-full max-w-md shadow-2xl glass-effect border ${
              darkMode 
              ? "bg-gray-800/90 border-gray-700/50" 
              : "bg-white/90 border-gray-200/50"
          }`}>
            {/* Enhanced header */}
            <div className={`flex items-center p-6 border-b ${
              darkMode ? "border-gray-700/50" : "border-gray-200/50"
            }`}>
              <div className={`p-3 rounded-xl mr-4 ${
                darkMode ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-600"
              }`}>
                <XCircle size={24} />
                </div>
              <div>
                <h3 className={`text-xl font-semibold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                  Delete Call Agent
                </h3>
                <p className={`text-sm ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                  This action cannot be undone
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className={`text-lg mb-6 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}>
                Are you sure you want to delete{' '}
                <span className={`font-semibold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                  "{callAgentToDelete?.workflow?.name || callAgentToDelete?.call_type || 'this call agent'}"
                </span>
                ?
              </p>
              
              {/* Enhanced action buttons */}
              <div className="flex space-x-4">
                <button 
                  className={`flex-1 px-6 py-3 border-2 rounded-xl font-medium transition-all duration-200 hover-lift ${
                    darkMode 
                      ? "border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                  } shadow-sm hover:shadow-md gpu-accelerated`}
                  onClick={() => {
                    setShowDeleteModal(false);
                    setCallAgentToDelete(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold transition-all duration-200 hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl transform hover:scale-105 gpu-accelerated"
                  onClick={confirmDelete}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <XCircle size={18} />
                    <span>Delete</span>
                  </div>
                </button>
              </div>
              </div>
            </div>
          </div>
        )}

      <CreateCallAgentDialog 
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={fetchCallAgents}
      />
    </MainLayout>
  );
};

export default CallAgentsPage; 