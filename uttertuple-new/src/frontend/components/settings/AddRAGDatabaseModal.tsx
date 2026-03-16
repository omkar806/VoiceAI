import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Zap, Database, Server, Shield } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { toast } from 'react-hot-toast';
import ragService, { VectorDBType } from '../../services/rag';

interface AddRAGDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingDatabases?: any[];
}

const AddRAGDatabaseModal: React.FC<AddRAGDatabaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingDatabases,
}) => {
  const { darkMode } = useTheme();
  const [selectedDBType, setSelectedDBType] = useState<string>('pinecone');
  const [apiKey, setApiKey] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [useSSL, setUseSSL] = useState(true);
  const [verifyCertificates, setVerifyCertificates] = useState(false);
  const [creatingDB, setCreatingDB] = useState(false);

  // Memoized validation
  const isValid = useMemo(() => {
    if (selectedDBType === 'pinecone') {
      return apiKey.trim() !== '';
    } else if (selectedDBType === 'chroma') {
      return host.trim() !== '' && port.trim() !== '';
    } else if (selectedDBType === 'opensearch') {
      return host.trim() !== '' && username.trim() !== '' && password.trim() !== '';
    }
    return false;
  }, [selectedDBType, apiKey, host, port, username, password]);

  // Check for duplicate database types
  const isDuplicate = useMemo(() => {
    if (!existingDatabases || existingDatabases.length === 0) return false;
    return existingDatabases.some(existing => 
      existing.db_type?.toLowerCase() === selectedDBType.toLowerCase()
    );
  }, [existingDatabases, selectedDBType]);

  // Final validation including duplicate check
  const canSubmit = useMemo(() => {
    return isValid && !isDuplicate;
  }, [isValid, isDuplicate]);

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedDBType('pinecone');
      setApiKey('');
      setHost('');
      setPort('');
      setUsername('');
      setPassword('');
      setUseSSL(true);
      setVerifyCertificates(false);
      setCreatingDB(false);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || creatingDB) return;

    setCreatingDB(true);

    try {
      let config: any = {};
      // Generate a unique name based on the provider and timestamp
      const dbName = `${selectedDBType}-${Date.now()}`;

      // Configure based on database type
      if (selectedDBType === 'pinecone') {
        config = { api_key: apiKey };
      } else if (selectedDBType === 'chroma') {
        config = {
          host,
          port: parseInt(port),
          ssl: useSSL,
        };
      } else if (selectedDBType === 'opensearch') {
        config = {
          host,
          username,
          password,
          use_ssl: useSSL,
          verify_certs: verifyCertificates,
        };
      }

      await ragService.createVectorDB({
        name: dbName,
        description: `${selectedDBType} database created at ${new Date().toLocaleString()}`,
        db_type: selectedDBType as VectorDBType,
        options: config,
      });

      toast.success('RAG database added successfully! 🗄️', {
        style: {
          background: darkMode ? '#0F172A' : '#F0FDF4',
          color: darkMode ? '#10B981' : '#059669',
          border: darkMode ? '1px solid #065F46' : '1px solid #D1FAE5',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '500',
        },
        duration: 3000,
      });
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating vector DB:', err);
      toast.error('Failed to add RAG database', {
        style: {
          background: darkMode ? '#0F172A' : '#FEF2F2',
          color: darkMode ? '#F87171' : '#DC2626',
          border: darkMode ? '1px solid #991B1B' : '1px solid #FECACA',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '500',
        },
        duration: 4000,
      });
    } finally {
      setCreatingDB(false);
    }
  }, [selectedDBType, apiKey, host, port, username, password, useSSL, verifyCertificates, canSubmit, creatingDB, darkMode, onSuccess, onClose]);

  // Handle Enter key for quick submission
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit && !creatingDB) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit, canSubmit, creatingDB]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !creatingDB) {
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.2 
            }}
            className={`relative w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden ${
              darkMode 
                ? 'bg-gray-900/95 border-gray-700/50 backdrop-blur-xl' 
                : 'bg-white/95 border-gray-200/50 backdrop-blur-xl'
            }`}
            onKeyDown={handleKeyDown}
          >
            {/* Gradient overlay for visual appeal */}
            <div className={`absolute inset-0 opacity-30 ${
              darkMode 
                ? 'bg-gradient-to-br from-green-600/10 via-blue-600/5 to-teal-600/10' 
                : 'bg-gradient-to-br from-green-50/80 via-blue-50/40 to-teal-50/80'
            }`} />
            
            {/* Header */}
            <div className={`relative px-8 py-6 border-b ${
              darkMode ? 'border-gray-700/50' : 'border-gray-200/50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl ${
                    darkMode 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-green-50 text-green-600'
                  }`}>
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-semibold ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Add RAG Database
                    </h2>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Configure your vector database
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  disabled={creatingDB}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    darkMode
                      ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-300'
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                  } ${creatingDB ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="relative px-8 py-6 space-y-6 max-h-96 overflow-y-auto">
              {/* Database Type Selection */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className={`h-4 w-4 ${
                    darkMode ? 'text-green-400' : 'text-green-600'
                  }`} />
                  <label className={`text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Database Type
                  </label>
                </div>
                <select
                  value={selectedDBType}
                  onChange={(e) => setSelectedDBType(e.target.value)}
                  className={`w-full rounded-xl border-2 transition-all duration-200 px-4 py-3 ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-700 focus:border-green-500 focus:ring-green-500/20 text-white'
                      : 'bg-gray-50/50 border-gray-300 focus:border-green-500 focus:ring-green-200 text-gray-900'
                  } ${selectedDBType ? (darkMode ? 'border-green-600/50' : 'border-green-500/50') : ''}`}
                  disabled={creatingDB}
                >
                  <option value="pinecone">Pinecone</option>
                  <option value="chroma">ChromaDB</option>
                  <option value="opensearch">OpenSearch</option>
                </select>
              </div>
              
              {/* Pinecone-specific fields */}
              {selectedDBType === 'pinecone' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <Zap className={`h-4 w-4 ${
                      darkMode ? 'text-blue-400' : 'text-blue-600'
                    }`} />
                    <label className={`text-sm font-medium ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      API Key
                    </label>
                  </div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="pc-..."
                    className={`w-full rounded-xl border-2 transition-all duration-200 px-4 py-3 ${
                      darkMode 
                        ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder-gray-500'
                        : 'bg-gray-50/50 border-gray-300 focus:border-blue-500 focus:ring-blue-200 text-gray-900 placeholder-gray-400'
                    } ${apiKey ? (darkMode ? 'border-green-600/50' : 'border-green-500/50') : ''}`}
                    disabled={creatingDB}
                  />
                </motion.div>
              )}
              
              {/* ChromaDB-specific fields */}
              {selectedDBType === 'chroma' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Host */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Server className={`h-4 w-4 ${
                        darkMode ? 'text-blue-400' : 'text-blue-600'
                      }`} />
                      <label className={`text-sm font-medium ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Host
                      </label>
                    </div>
                    <input
                      type="text"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="localhost"
                      className={`w-full rounded-xl border-2 transition-all duration-200 px-4 py-3 ${
                        darkMode 
                          ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder-gray-500'
                          : 'bg-gray-50/50 border-gray-300 focus:border-blue-500 focus:ring-blue-200 text-gray-900 placeholder-gray-400'
                      } ${host ? (darkMode ? 'border-green-600/50' : 'border-green-500/50') : ''}`}
                      disabled={creatingDB}
                    />
                  </div>
                  
                  {/* Port */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Zap className={`h-4 w-4 ${
                        darkMode ? 'text-purple-400' : 'text-purple-600'
                      }`} />
                      <label className={`text-sm font-medium ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Port
                      </label>
                    </div>
                    <input
                      type="text"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder="8000"
                      className={`w-full rounded-xl border-2 transition-all duration-200 px-4 py-3 ${
                        darkMode 
                          ? 'bg-gray-800/50 border-gray-700 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder-gray-500'
                          : 'bg-gray-50/50 border-gray-300 focus:border-purple-500 focus:ring-purple-200 text-gray-900 placeholder-gray-400'
                      } ${port ? (darkMode ? 'border-green-600/50' : 'border-green-500/50') : ''}`}
                      disabled={creatingDB}
                    />
                  </div>
                  
                  {/* SSL Toggle */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="useSSL"
                      checked={useSSL}
                      onChange={(e) => setUseSSL(e.target.checked)}
                      className={`rounded border-2 ${
                        darkMode 
                          ? 'bg-gray-800 border-gray-600 text-green-600 focus:ring-green-500/20'
                          : 'bg-white border-gray-300 text-green-600 focus:ring-green-200'
                      }`}
                      disabled={creatingDB}
                    />
                    <label htmlFor="useSSL" className={`text-sm font-medium ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Use SSL
                    </label>
                  </div>
                </motion.div>
              )}
              
              {/* OpenSearch-specific fields */}
              {selectedDBType === 'opensearch' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Host */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Server className={`h-4 w-4 ${
                        darkMode ? 'text-blue-400' : 'text-blue-600'
                      }`} />
                      <label className={`text-sm font-medium ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Host
                      </label>
                    </div>
                    <input
                      type="text"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="https://search-domain.region.es.amazonaws.com"
                      className={`w-full rounded-xl border-2 transition-all duration-200 px-4 py-3 ${
                        darkMode 
                          ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder-gray-500'
                          : 'bg-gray-50/50 border-gray-300 focus:border-blue-500 focus:ring-blue-200 text-gray-900 placeholder-gray-400'
                      } ${host ? (darkMode ? 'border-green-600/50' : 'border-green-500/50') : ''}`}
                      disabled={creatingDB}
                    />
                  </div>
                  
                  {/* Username */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Sparkles className={`h-4 w-4 ${
                        darkMode ? 'text-purple-400' : 'text-purple-600'
                      }`} />
                      <label className={`text-sm font-medium ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Username
                      </label>
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="admin"
                      className={`w-full rounded-xl border-2 transition-all duration-200 px-4 py-3 ${
                        darkMode 
                          ? 'bg-gray-800/50 border-gray-700 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder-gray-500'
                          : 'bg-gray-50/50 border-gray-300 focus:border-purple-500 focus:ring-purple-200 text-gray-900 placeholder-gray-400'
                      } ${username ? (darkMode ? 'border-green-600/50' : 'border-green-500/50') : ''}`}
                      disabled={creatingDB}
                    />
                  </div>
                  
                  {/* Password */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Shield className={`h-4 w-4 ${
                        darkMode ? 'text-orange-400' : 'text-orange-600'
                      }`} />
                      <label className={`text-sm font-medium ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Password
                      </label>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full rounded-xl border-2 transition-all duration-200 px-4 py-3 ${
                        darkMode 
                          ? 'bg-gray-800/50 border-gray-700 focus:border-orange-500 focus:ring-orange-500/20 text-white placeholder-gray-500'
                          : 'bg-gray-50/50 border-gray-300 focus:border-orange-500 focus:ring-orange-200 text-gray-900 placeholder-gray-400'
                      } ${password ? (darkMode ? 'border-green-600/50' : 'border-green-500/50') : ''}`}
                      disabled={creatingDB}
                    />
                  </div>
                  
                  {/* SSL and Certificate Options */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="useSSLOpenSearch"
                        checked={useSSL}
                        onChange={(e) => setUseSSL(e.target.checked)}
                        className={`rounded border-2 ${
                          darkMode 
                            ? 'bg-gray-800 border-gray-600 text-green-600 focus:ring-green-500/20'
                            : 'bg-white border-gray-300 text-green-600 focus:ring-green-200'
                        }`}
                        disabled={creatingDB}
                      />
                      <label htmlFor="useSSLOpenSearch" className={`text-sm font-medium ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Use SSL
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="verifyCerts"
                        checked={verifyCertificates}
                        onChange={(e) => setVerifyCertificates(e.target.checked)}
                        className={`rounded border-2 ${
                          darkMode 
                            ? 'bg-gray-800 border-gray-600 text-green-600 focus:ring-green-500/20'
                            : 'bg-white border-gray-300 text-green-600 focus:ring-green-200'
                        }`}
                        disabled={creatingDB}
                      />
                      <label htmlFor="verifyCerts" className={`text-sm font-medium ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Verify Certificates
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Duplicate warning */}
              {isDuplicate && (
                <div className={`p-4 rounded-xl ${
                  darkMode 
                    ? 'bg-red-500/10 border border-red-500/20' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm ${
                    darkMode ? 'text-red-300' : 'text-red-700'
                  }`}>
                    ⚠️ <strong>Database type already exists:</strong> {selectedDBType} is already configured. Please choose a different database type.
                  </p>
                </div>
              )}
              
              {/* Quick tip */}
              <div className={`p-4 rounded-xl ${
                darkMode 
                  ? 'bg-green-500/10 border border-green-500/20' 
                  : 'bg-green-50 border border-green-200'
              }`}>
                <p className={`text-sm ${
                  darkMode ? 'text-green-300' : 'text-green-700'
                }`}>
                  💡 <strong>Pro tip:</strong> Use <kbd className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                    darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'
                  }`}>Enter</kbd> to add quickly!
                </p>
              </div>
            </div>
            
            {/* Footer */}
            <div className={`relative px-8 py-6 border-t ${
              darkMode 
                ? 'bg-gray-800/30 border-gray-700/50' 
                : 'bg-gray-50/50 border-gray-200/50'
            }`}>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={creatingDB}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    darkMode
                      ? 'border border-gray-600 hover:bg-gray-700 text-gray-300 hover:text-white'
                      : 'border border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || creatingDB}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    canSubmit && !creatingDB
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  {creatingDB ? 'Creating...' : 'Create Database'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(AddRAGDatabaseModal); 