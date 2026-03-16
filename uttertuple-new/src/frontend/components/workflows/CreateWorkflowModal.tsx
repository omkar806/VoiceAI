import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, GitBranch } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import workflowService, { CreateWorkflowData } from '../../services/workflow';

interface CreateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateWorkflowModal: React.FC<CreateWorkflowModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [workflowData, setWorkflowData] = useState<CreateWorkflowData>({
    name: '',
    initial_greeting: '',
  });

  const [errors, setErrors] = useState<{
    name?: string;
    initial_greeting?: string;
  }>({});

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setWorkflowData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {
      name?: string;
      initial_greeting?: string;
    } = {};

    if (!workflowData.name.trim()) {
      newErrors.name = 'Workflow name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Show loading toast
      const loadingToastId = toast.loading('Creating workflow...', {
        style: {
          background: '#F0FDF4',
          borderColor: '#DCFCE7',
          borderLeftWidth: '4px',
        },
        icon: '⏱️'
      });
      
      // Create the workflow
      const newWorkflow = await workflowService.createWorkflow(workflowData);
      
      // Dismiss loading toast and show success toast
      toast.dismiss(loadingToastId);
      toast.success('Workflow created successfully', {
        style: {
          background: '#F0FDF4',
          color: '#15803D',
          borderColor: '#DCFCE7',
          borderLeftWidth: '4px',
        },
        icon: '✅'
      });
      
      // Close the modal
      onClose();
      
      // Redirect to workflow edit page
      router.push(`/workflows/${newWorkflow.id}/edit`);
      
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast.error('Failed to create workflow', {
        style: {
          background: '#FEF2F2',
          color: '#DC2626',
          borderColor: '#FECACA',
          borderLeftWidth: '4px',
        },
        icon: '❌'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl border border-neutral-200 transform transition-all animate-fadeIn">
        <div className="flex justify-between items-center p-5 border-b border-neutral-200">
          <div className="flex items-center">
            <div className="bg-primary-50 p-2 rounded-md mr-3">
              <GitBranch className="h-5 w-5 text-primary-600" />
            </div>
            <h3 className="text-lg font-medium text-neutral-800">Create New Workflow</h3>
          </div>
          <button 
            className="text-neutral-500 hover:text-neutral-700 transition-colors"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-5">
            <Input
              name="name"
              label="Workflow Name"
              placeholder="Enter workflow name"
              value={workflowData.name}
              onChange={handleChange}
              error={errors.name}
              fullWidth
              required
              autoFocus
            />
            
            <TextArea
              name="initial_greeting"
              label="Initial Greeting (Optional)"
              placeholder="Enter an initial greeting message for your workflow"
              value={workflowData.initial_greeting || ''}
              onChange={handleChange}
              error={errors.initial_greeting}
              helperText="This message will be displayed when the workflow starts"
              rows={3}
              fullWidth
            />
          </div>
          
          <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex justify-end space-x-3 rounded-b-lg">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
            >
              Create Workflow
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWorkflowModal; 