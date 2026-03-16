import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Phone, Plus, X, Sparkles, Zap, PhoneCall } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import workflowService, { Workflow } from '../../services/workflow';
import callAgentService, { CreateCallAgentData } from '../../services/call_agent';
import { toast } from 'react-hot-toast';

interface CreateCallAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateCallAgentDialog: React.FC<CreateCallAgentDialogProps> = ({ isOpen, onClose, onCreated }) => {
  const { darkMode } = useTheme();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  // Form state
  const [workflowId, setWorkflowId] = useState('');
  const [callType, setCallType] = useState('inbound');
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(['']);

  // Options for form fields
  const callTypeOptions = [
    { label: 'Inbound', value: 'inbound' },
    { label: 'Outbound', value: 'outbound' }
  ];

  const workflowOptions = workflows.map(workflow => ({
    label: workflow.name,
    value: workflow.id
  }));

  // Load workflows on open
  useEffect(() => {
    if (isOpen) {
      fetchWorkflows();
    }
  }, [isOpen]);

  // Reset form state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setWorkflowId('');
      setCallType('inbound');
      setPhoneNumbers(['']);
      setHasSubmitted(false);
      setIsCreating(false);
    }
  }, [isOpen]);

  // Memoized validation
  const isValid = useMemo(() => {
    if (!workflowId) return false;
    if (callType === 'outbound') {
      return phoneNumbers.some(num => num.trim() !== '');
    }
    return true;
  }, [workflowId, callType, phoneNumbers]);

  // Fetch workflows
  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const data = await workflowService.getWorkflows();
      setWorkflows(data);
      if (data.length > 0) {
        setWorkflowId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast.error('Failed to load workflows', {
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
      setLoading(false);
    }
  };

  // Add phone number field
  const addPhoneNumber = useCallback(() => {
    setPhoneNumbers(prev => [...prev, '']);
  }, []);

  // Remove phone number field
  const removePhoneNumber = useCallback((index: number) => {
    setPhoneNumbers(prev => {
      const newPhoneNumbers = [...prev];
      newPhoneNumbers.splice(index, 1);
      return newPhoneNumbers.length ? newPhoneNumbers : [''];
    });
  }, []);

  // Update phone number field
  const updatePhoneNumber = useCallback((index: number, value: string) => {
    setPhoneNumbers(prev => {
      const newPhoneNumbers = [...prev];
      newPhoneNumbers[index] = value;
      return newPhoneNumbers;
    });
  }, []);

  // Create call agent
  const handleCreateCallAgent = useCallback(async () => {
    if (!isValid || isCreating || hasSubmitted) return;

    setIsCreating(true);
    setHasSubmitted(true);

    try {
      const callAgentData: CreateCallAgentData = {
        workflow_id: workflowId,
        call_type: callType,
        phone_numbers: callType === 'outbound' ? phoneNumbers.filter(num => num.trim() !== '') : null
      };

      await callAgentService.createCallAgent(callAgentData);
      
      toast.success('Call agent created successfully! 📞', {
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
      
      onClose();
      onCreated();
    } catch (error) {
      console.error('Error creating call agent:', error);
      toast.error('Failed to create call agent', {
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
      setHasSubmitted(false);
    } finally {
      setIsCreating(false);
    }
  }, [workflowId, callType, phoneNumbers, isValid, isCreating, hasSubmitted, darkMode, onClose, onCreated]);

  // Handle Enter key for quick submission
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && !isCreating) {
      e.preventDefault();
      handleCreateCallAgent();
    }
  }, [handleCreateCallAgent, isValid, isCreating]);

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
            if (e.target === e.currentTarget && !isCreating) {
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
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-semibold ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Create Call Agent
                    </h2>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Set up your call agent for inbound or outbound calls
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  disabled={isCreating}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    darkMode
                      ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-300'
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                  } ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="relative px-8 py-6 space-y-6">
              {/* Workflow Selection */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className={`h-4 w-4 ${
                    darkMode ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                  <label className={`text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Select Workflow
                  </label>
                </div>
                <Select
                  value={workflowId}
                  onChange={setWorkflowId}
                  options={workflowOptions}
                  className={`w-full rounded-xl border-2 transition-all duration-200 ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500 focus:ring-blue-500/20 text-white'
                      : 'bg-gray-50/50 border-gray-300 focus:border-blue-500 focus:ring-blue-200 text-gray-900'
                  } ${workflowId ? (darkMode ? 'border-green-600/50' : 'border-green-500/50') : ''}`}
                  disabled={loading || workflows.length === 0}
                />
                {workflows.length === 0 && !loading && (
                  <p className={`text-xs ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                    ⚠️ You need to create a workflow first before creating a call agent.
                  </p>
                )}
              </div>
              
              {/* Call Type Selection */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <PhoneCall className={`h-4 w-4 ${
                    darkMode ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                  <label className={`text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Call Type
                  </label>
                </div>
                <Select
                  value={callType}
                  onChange={setCallType}
                  options={callTypeOptions}
                  className={`w-full rounded-xl border-2 transition-all duration-200 ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-700 focus:border-purple-500 focus:ring-purple-500/20 text-white'
                      : 'bg-gray-50/50 border-gray-300 focus:border-purple-500 focus:ring-purple-200 text-gray-900'
                  }`}
                />
              </div>
              
              {/* Phone Numbers for Outbound */}
              {callType === 'outbound' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap className={`h-4 w-4 ${
                        darkMode ? 'text-green-400' : 'text-green-600'
                      }`} />
                      <label className={`text-sm font-medium ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Phone Numbers
                      </label>
                    </div>
                    <button
                      onClick={addPhoneNumber}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        darkMode
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                          : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                      }`}
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Number</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {phoneNumbers.map((number, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-2"
                        >
                          <Input
                            value={number}
                            onChange={(e) => updatePhoneNumber(index, e.target.value)}
                            placeholder="e.g., +1234567890"
                            className={`flex-1 rounded-xl border-2 transition-all duration-200 ${
                              darkMode 
                                ? 'bg-gray-800/50 border-gray-700 focus:border-green-500 focus:ring-green-500/20 text-white placeholder-gray-500'
                                : 'bg-gray-50/50 border-gray-300 focus:border-green-500 focus:ring-green-200 text-gray-900 placeholder-gray-400'
                            }`}
                          />
                          {phoneNumbers.length > 1 && (
                            <button
                              onClick={() => removePhoneNumber(index)}
                              className={`p-2 rounded-lg transition-all duration-200 ${
                                darkMode 
                                  ? 'hover:bg-red-500/20 text-red-400 hover:text-red-300' 
                                  : 'hover:bg-red-50 text-red-500 hover:text-red-600'
                              }`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
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
                  }`}>Enter</kbd> to create quickly!
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
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isCreating}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    darkMode
                      ? 'border-gray-600 hover:bg-gray-700 text-gray-300 hover:text-white'
                      : 'border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCallAgent}
                  disabled={!isValid || isCreating || workflows.length === 0}
                  isLoading={isCreating}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    isValid && !isCreating && workflows.length > 0
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                  leftIcon={!isCreating ? <Phone className="h-4 w-4" /> : undefined}
                >
                  {isCreating ? 'Creating...' : 'Create Call Agent'}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(CreateCallAgentDialog); 