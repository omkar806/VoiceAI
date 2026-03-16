import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Zap, VolumeX } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { createUserTTSProvider } from '../../services/tts';
import { toast } from 'react-hot-toast';

interface AddTTSProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingProviders?: any[];
}

const AddTTSProviderModal: React.FC<AddTTSProviderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingProviders,
}) => {
  const { darkMode } = useTheme();
  const [provider, setProvider] = useState<string>('openai');
  const [apiKey, setApiKey] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [responseFormat, setResponseFormat] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoized validation
  const isValid = useMemo(() => {
    if (!provider || !apiKey) return false;
    if (provider === 'kokoro' && (!baseUrl || !responseFormat)) return false;
    return true;
  }, [provider, apiKey, baseUrl, responseFormat]);

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
      setBaseUrl('');
      setResponseFormat('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const data: any = {
        provider_name: provider,
        api_key: apiKey,
      };
      
      // Add kokoro-specific fields if needed
      if (provider === 'kokoro') {
        data.base_url = baseUrl;
        data.response_format = responseFormat;
      }
      
      await createUserTTSProvider(data);
      
      toast.success('TTS provider added successfully! 🔊', {
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
      console.error('Error adding TTS provider:', error);
      toast.error('Failed to add TTS provider', {
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
  }, [provider, apiKey, baseUrl, responseFormat, canSubmit, isSubmitting, darkMode, onSuccess, onClose]);

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
                ? 'bg-gradient-to-br from-purple-600/10 via-pink-600/5 to-blue-600/10' 
                : 'bg-gradient-to-br from-purple-50/80 via-pink-50/40 to-blue-50/80'
            }`} />
            
            {/* Header */}
            <div className={`relative px-8 py-6 border-b ${
              darkMode ? 'border-gray-700/50' : 'border-gray-200/50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl ${
                    darkMode 
                      ? 'bg-purple-500/20 text-purple-400' 
                      : 'bg-purple-50 text-purple-600'
                  }`}>
                    <VolumeX className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-semibold ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Add TTS Provider
                    </h2>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Configure your Text-to-Speech provider
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
                    darkMode ? 'text-purple-400' : 'text-purple-600'
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
                      ? 'bg-gray-800/50 border-gray-700 focus:border-purple-500 focus:ring-purple-500/20 text-white'
                      : 'bg-gray-50/50 border-gray-300 focus:border-purple-500 focus:ring-purple-200 text-gray-900'
                  } ${provider ? (darkMode ? 'border-green-600/50' : 'border-green-500/50') : ''}`}
                  disabled={isSubmitting}
                >
                  <option value="openai">OpenAI</option>
                  <option value="cartesia">Cartesia</option>
                  <option value="groq">Groq</option>
                  <option value="elevenlabs">ElevenLabs</option>
                </select>
              </div>
              
              {/* API Key */}
              <div className="space-y-3">
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
                  placeholder="sk-..."
                  className={`w-full rounded-xl border-2 transition-all duration-200 px-4 py-3 ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder-gray-500'
                      : 'bg-gray-50/50 border-gray-300 focus:border-blue-500 focus:ring-blue-200 text-gray-900 placeholder-gray-400'
                  } ${apiKey ? (darkMode ? 'border-green-600/50' : 'border-green-500/50') : ''}`}
                  disabled={isSubmitting}
                />
              </div>
              
              {/* Kokoro-specific fields */}
              {provider === 'kokoro' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Base URL */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Sparkles className={`h-4 w-4 ${
                        darkMode ? 'text-green-400' : 'text-green-600'
                      }`} />
                      <label className={`text-sm font-medium ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Base URL
                      </label>
                    </div>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://api.kokoro.ai/v1"
                      className={`w-full rounded-xl border-2 transition-all duration-200 px-4 py-3 ${
                        darkMode 
                          ? 'bg-gray-800/50 border-gray-700 focus:border-green-500 focus:ring-green-500/20 text-white placeholder-gray-500'
                          : 'bg-gray-50/50 border-gray-300 focus:border-green-500 focus:ring-green-200 text-gray-900 placeholder-gray-400'
                      } ${baseUrl ? (darkMode ? 'border-green-600/50' : 'border-green-500/50') : ''}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  {/* Response Format */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Zap className={`h-4 w-4 ${
                        darkMode ? 'text-orange-400' : 'text-orange-600'
                      }`} />
                      <label className={`text-sm font-medium ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Response Format
                      </label>
                    </div>
                    <input
                      type="text"
                      value={responseFormat}
                      onChange={(e) => setResponseFormat(e.target.value)}
                      placeholder="mp3"
                      className={`w-full rounded-xl border-2 transition-all duration-200 px-4 py-3 ${
                        darkMode 
                          ? 'bg-gray-800/50 border-gray-700 focus:border-orange-500 focus:ring-orange-500/20 text-white placeholder-gray-500'
                          : 'bg-gray-50/50 border-gray-300 focus:border-orange-500 focus:ring-orange-200 text-gray-900 placeholder-gray-400'
                      } ${responseFormat ? (darkMode ? 'border-green-600/50' : 'border-green-500/50') : ''}`}
                      disabled={isSubmitting}
                    />
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
                    ⚠️ <strong>Provider already exists:</strong> {provider} is already configured. Please choose a different provider.
                  </p>
                </div>
              )}
              
              {/* Quick tip */}
              <div className={`p-4 rounded-xl ${
                darkMode 
                  ? 'bg-purple-500/10 border border-purple-500/20' 
                  : 'bg-purple-50 border border-purple-200'
              }`}>
                <p className={`text-sm ${
                  darkMode ? 'text-purple-300' : 'text-purple-700'
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
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
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

export default React.memo(AddTTSProviderModal); 