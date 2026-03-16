import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Zap, Plus } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';

interface WorkflowControlsProps {
  initialGreeting?: string;
  onInitialGreetingChange?: (greeting: string) => void;
  workflowName?: string;
  setWorkflowName?: (name: string) => void;
  showBackButton?: boolean;
  backUrl?: string;
  additionalActions?: React.ReactNode;
  autoSaveIndicator?: React.ReactNode;
}

const WorkflowControls: React.FC<WorkflowControlsProps> = ({
  initialGreeting = '',
  onInitialGreetingChange,
  workflowName = 'New Workflow',
  setWorkflowName,
  showBackButton = true,
  backUrl = '/workflows',
  additionalActions,
  autoSaveIndicator,
}) => {
  // Simple controls style for when used in panel
  if (initialGreeting !== undefined && onInitialGreetingChange) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-sm text-sm">
        <h3 className="font-medium mb-2">Initial Greeting</h3>
        <TextArea
          value={initialGreeting}
          onChange={(e) => onInitialGreetingChange(e.target.value)}
          placeholder="Enter the first message that starts the conversation..."
          rows={4}
          className="text-sm"
        />
        <p className="text-xs text-neutral-500 mt-1">
          This message will be displayed at the start of each conversation.
        </p>
      </div>
    );
  }

  // Full toolbar style
  return (
    <div className="p-4 border-b border-neutral-200 bg-white flex justify-between items-center">
      <div className="flex items-center">
        {showBackButton && (
          <Link href={backUrl}>
            <Button
              variant="ghost"
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Back
            </Button>
          </Link>
        )}
        <h1 className="text-xl font-bold text-neutral-800 ml-2">
          {workflowName ? workflowName : 'Create Workflow'}
        </h1>
        {autoSaveIndicator && (
          <div className="ml-2 text-sm text-neutral-500">
            {autoSaveIndicator}
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        {setWorkflowName && (
          <Input
            placeholder="Workflow Name"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="w-60"
          />
        )}
        
        {additionalActions}
      </div>
    </div>
  );
};

export const WorkflowInitialGreeting: React.FC<{
  initialGreeting: string;
  setInitialGreeting: (greeting: string) => void;
}> = ({ initialGreeting, setInitialGreeting }) => {
  return (
    <div className="p-4 border-b border-neutral-200 bg-white">
      <TextArea
        placeholder="Initial Greeting"
        value={initialGreeting}
        onChange={(e) => setInitialGreeting(e.target.value)}
        helperText="Welcome message shown at the start of the conversation"
        fullWidth
        rows={2}
      />
    </div>
  );
};

export const WorkflowAddNodeButton: React.FC<{
  onAddDecisionNode?: () => void;
  disabled?: boolean;
}> = ({ onAddDecisionNode, disabled }) => {
  return (
    <Button
      variant="outline"
      leftIcon={<Plus className="h-4 w-4" />}
      onClick={onAddDecisionNode}
      disabled={disabled}
    >
      Add Decision Node
    </Button>
  );
};

export const WorkflowTestButton: React.FC<{
  onTest?: () => void;
  disabled?: boolean;
}> = ({ onTest, disabled }) => {
  return (
    <Button
      variant="outline"
      onClick={onTest}
      disabled={disabled}
      className="border border-gray-300 hover:bg-gray-100 transition-colors text-gray-700"
    >
      Test Workflow
    </Button>
  );
};

export default WorkflowControls; 