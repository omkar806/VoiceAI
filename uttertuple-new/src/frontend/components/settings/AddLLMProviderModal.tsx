import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Zap, Brain } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { createUserLLMProvider } from '../../services/llm';
import { toast } from 'react-hot-toast';

interface AddLLMProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingProviders?: any[];
}

const AddLLMProviderModal: React.FC<AddLLMProviderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingProviders,
}) => {
  const { darkMode } = useTheme();
  const [provider, setProvider] = useState<string>('openai');
  const [apiKey, setApiKey] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoized validation
  const isValid = useMemo(() => {
    return provider.trim() !== '' && apiKey.trim() !== '';
  }, [provider, apiKey]);

  // Check for duplicate providers
  const isDuplicate = useMemo(() => {
    if (!existingProviders || existingProviders.length === 0) return false;
    return existingProviders.some(existing => 
      existing.provider_name?.toLowerCase() === provider.toLowerCase()
    );
  }, [existingProviders, provider]);

  // Final validation including duplicate check
  const canSubmit = useMemo(() => {
    return isValid && !isDuplicate;
  }, [isValid, isDuplicate]);

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setProvider('openai');
      setApiKey('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      await createUserLLMProvider({
        provider_name: provider,
        api_key: apiKey,
      });
      
      toast.success('LLM provider added successfully! 🧠', {
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
    } catch (error) {
      console.error('Error adding LLM provider:', error);
      toast.error('Failed to add LLM provider', {
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
      setIsSubmitting(false);
    }
  }, [provider, apiKey, canSubmit, isSubmitting, darkMode, onSuccess, onClose]);

  // Handle Enter key for quick submission
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit && !isSubmitting) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit, canSubmit, isSubmitting]);

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
            if (e.target === e.currentTarget && !isSubmitting) {
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
                ? 'bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-cyan-600/10' 
                : 'bg-gradient-to-br from-blue-50/80 via-purple-50/40 to-cyan-50/80'
            }`} />
            
            {/* Header */}
            <div className={`relative px-8 py-6 border-b ${
              darkMode ? 'border-gray-700/50' : 'border-gray-200/50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl ${
                    darkMode 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'bg-blue-50 text-blue-600'
                  }`}>
                    <Brain className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-semibold ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Add LLM Provider
                    </h2>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Configure your Language Model provider
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    darkMode
                      ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-300'
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="relative px-8 py-6 space-y-6">
              {/* Provider Selection */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className={`h-4 w-4 ${
                    darkMode ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                  <label className={`text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Provider
                  </label>
                </div>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className={`w-full rounded-xl border-2 transition-all duration-200 px-4 py-3 ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500 focus:ring-blue-500/20 text-white'
                      : 'bg-gray-50/50 border-gray-300 focus:border-blue-500 focus:ring-blue-200 text-gray-900'
                  } ${provider ? (darkMode ? 'border-green-600/50' : 'border-green-500/50') : ''}`}
                  disabled={isSubmitting}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="groq">Groq</option>
                  <option value="openai-realtime">OpenAI Realtime</option>
                </select>
              </div>
              
              {/* API Key */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Zap className={`h-4 w-4 ${
                    darkMode ? 'text-purple-400' : 'text-purple-600'
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
                  placeholder="sk-..."
                  className={`w-full rounded-xl border-2 transition-all duration-200 px-4 py-3 ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-700 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder-gray-500'
                      : 'bg-gray-50/50 border-gray-300 focus:border-purple-500 focus:ring-purple-200 text-gray-900 placeholder-gray-400'
                  } ${apiKey ? (darkMode ? 'border-green-600/50' : 'border-green-500/50') : ''}`}
                  disabled={isSubmitting}
                />
              </div>
              
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
                    ⚠️ <strong>Provider already exists:</strong> {provider} is already configured. Please choose a different provider.
                  </p>
                </div>
              )}
              
              {/* Quick tip */}
              <div className={`p-4 rounded-xl ${
                darkMode 
                  ? 'bg-blue-500/10 border border-blue-500/20' 
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <p className={`text-sm ${
                  darkMode ? 'text-blue-300' : 'text-blue-700'
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
                  disabled={isSubmitting}
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
                  disabled={!canSubmit || isSubmitting}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    canSubmit && !isSubmitting
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? 'Adding...' : 'Add Provider'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(AddLLMProviderModal); 