import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import workflowService, { NodeType } from '../../services/workflow';
import { toast } from 'react-hot-toast';
import { GitBranch, Plus, X, Sparkles, Zap } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// Constants for canvas dimensions
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 900;

interface CreateWorkflowDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateWorkflowDialog: React.FC<CreateWorkflowDialogProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [workflowName, setWorkflowName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Reset form state when dialog opens/closes - optimized with useMemo
  React.useEffect(() => {
    if (!isOpen) {
      setWorkflowName('');
      setDescription('');
      setIsCreating(false);
    }
  }, [isOpen]);

  // Memoized validation
  const isValid = useMemo(() => workflowName.trim().length > 0, [workflowName]);

  const handleCreateWorkflow = useCallback(async () => {
    if (!isValid || isCreating) return;

    setIsCreating(true);

    try {
      // Create the workflow with the form data
      const workflow = await workflowService.createWorkflow({
        name: workflowName.trim(),
        description: description.trim(),
        default_context: {},
        workflow_json: {
          voices: {},
          agents: {},
          starting_agent: "",
          greeting: ""
        }
      });

      // Create start and end nodes in parallel for better performance
      await Promise.all([
        workflowService.createWorkflowNode(workflow.id, {
          node_type: NodeType.START,
          position_x: 100,
          position_y: CANVAS_HEIGHT / 2,
          data: { label: 'Start' }
        }),
        workflowService.createWorkflowNode(workflow.id, {
          node_type: NodeType.END,
          position_x: CANVAS_WIDTH - 200,
          position_y: CANVAS_HEIGHT / 2,
          data: { label: 'End' }
        })
      ]);

      toast.success('Workflow created successfully! 🎉', {
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
      
      // Navigate to the workflow page
      router.push(`/workflows/${workflow.id}`);
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast.error('Failed to create workflow', {
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
      setIsCreating(false);
    }
  }, [workflowName, description, isValid, isCreating, router, onClose, darkMode]);

  // Handle Enter key for quick submission
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && !isCreating) {
      e.preventDefault();
      handleCreateWorkflow();
    }
  }, [handleCreateWorkflow, isValid, isCreating]);

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
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-semibold ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Create New Workflow
                    </h2>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Define your multi-agent conversation flow
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
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className={`h-4 w-4 ${
                    darkMode ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                  <label className={`text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Workflow Name
                  </label>
                </div>
                <Input
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="e.g., Customer Support Flow"
                  className={`w-full rounded-xl border-2 transition-all duration-200 ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-700 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder-gray-500'
                      : 'bg-gray-50/50 border-gray-300 focus:border-blue-500 focus:ring-blue-200 text-gray-900 placeholder-gray-400'
                  } ${isValid ? (darkMode ? 'border-green-600/50' : 'border-green-500/50') : ''}`}
                  autoFocus
                  disabled={isCreating}
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Zap className={`h-4 w-4 ${
                    darkMode ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                  <label className={`text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Description <span className="text-gray-500">(optional)</span>
                  </label>
                </div>
                <TextArea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this workflow does..."
                  rows={3}
                  className={`w-full rounded-xl border-2 transition-all duration-200 resize-none ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-700 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder-gray-500'
                      : 'bg-gray-50/50 border-gray-300 focus:border-purple-500 focus:ring-purple-200 text-gray-900 placeholder-gray-400'
                  }`}
                  disabled={isCreating}
                />
              </div>
              
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
                  onClick={handleCreateWorkflow}
                  disabled={!isValid || isCreating}
                  isLoading={isCreating}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    isValid && !isCreating
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                  leftIcon={!isCreating ? <Plus className="h-4 w-4" /> : undefined}
                >
                  {isCreating ? 'Creating...' : 'Create Workflow'}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(CreateWorkflowDialog); 