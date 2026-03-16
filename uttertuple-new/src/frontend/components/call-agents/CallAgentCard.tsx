import React from 'react';
import { Phone, Trash2, PhoneCall, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { CallAgent } from '../../services/call_agent';
import { format } from 'date-fns';

interface CallAgentCardProps {
  callAgent: CallAgent;
  onDelete: (callAgent: CallAgent, e: React.MouseEvent) => void;
}

const CallAgentCard: React.FC<CallAgentCardProps> = ({ callAgent, onDelete }) => {
  const { darkMode } = useTheme();
  
  // Format creation date
  const createdDate = new Date(callAgent.created_at);
  const formattedDate = format(createdDate, 'MMM dd, yyyy');
  
  // Get appropriate status colors and icon (excluding pending)
  const getStatusInfo = () => {
    switch (callAgent.status) {
      case 'active':
        return {
          bgColor: darkMode ? 'bg-green-500/10' : 'bg-green-50',
          textColor: darkMode ? 'text-green-400' : 'text-green-600',
          borderColor: darkMode ? 'border-green-500/20' : 'border-green-200',
          icon: <PhoneCall size={14} className={darkMode ? 'text-green-400' : 'text-green-600'} />
        };
      case 'completed':
        return {
          bgColor: darkMode ? 'bg-gray-500/10' : 'bg-gray-50',
          textColor: darkMode ? 'text-gray-400' : 'text-gray-600',
          borderColor: darkMode ? 'border-gray-500/20' : 'border-gray-200',
          icon: <Phone size={14} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
        };
      case 'failed':
        return {
          bgColor: darkMode ? 'bg-red-500/10' : 'bg-red-50',
          textColor: darkMode ? 'text-red-400' : 'text-red-600',
          borderColor: darkMode ? 'border-red-500/20' : 'border-red-200',
          icon: <Phone size={14} className={darkMode ? 'text-red-400' : 'text-red-600'} />
        };
      default:
        return null; // Don't show status badge for pending or unknown statuses
    }
  };
  
  const statusInfo = getStatusInfo();
  const callTypeIcon = callAgent.call_type === 'inbound' ? 
    <PhoneIncoming size={14} className={darkMode ? 'text-purple-400' : 'text-purple-600'} /> : 
    <PhoneOutgoing size={14} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />;
  
  // Generate gradient colors based on workflow name
  const getGradientColors = () => {
    // Use the workflow name to generate a consistent gradient
    const hash = (callAgent.workflow?.name || 'default').split('').reduce((acc: number, char: string) => char.charCodeAt(0) + acc, 0);
    
    // Define gradient palette options
    const palettes = [
      'from-blue-500 to-indigo-600',
      'from-indigo-500 to-purple-600',
      'from-cyan-500 to-blue-600',
      'from-teal-500 to-emerald-600',
      'from-blue-500 to-cyan-600',
    ];
    
    return palettes[hash % palettes.length];
  };
  
  return (
    <div className={`relative rounded-xl border transition-all duration-200 hover:shadow-lg group ${
      darkMode 
        ? 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600/50 backdrop-blur-sm' 
        : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
    } overflow-hidden`}>
      {/* Gradient accent at top */}
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${getGradientColors()}`} />
      
      {/* Header with workflow name and phone icon */}
      <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
            }`}>
              <Phone className="h-4 w-4" />
            </div>
            <h3 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {callAgent.workflow?.name || 'Unknown Workflow'}
            </h3>
          </div>
        </div>
      </div>
      
      {/* Call Agent Details */}
      <div className="px-6 py-5 space-y-4">
        {/* Status and Call Type */}
        <div className="flex items-center gap-3">
          {/* Only show status badge if it's not pending */}
          {statusInfo && (
            <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${statusInfo.bgColor} ${statusInfo.textColor} ${statusInfo.borderColor}`}>
              {statusInfo.icon}
              <span className="ml-2 capitalize">{callAgent.status}</span>
            </div>
          )}
          
          <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${
            callAgent.call_type === 'inbound'
              ? darkMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-600 border-purple-200'
              : darkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-200'
          }`}>
            {callTypeIcon}
            <span className="ml-2 capitalize">{callAgent.call_type}</span>
          </div>
        </div>
        
        {/* Show phone numbers for outbound calls */}
        {callAgent.call_type === 'outbound' && callAgent.phone_numbers && callAgent.phone_numbers.length > 0 && (
          <div>
            <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Phone Numbers:
            </p>
            <div className="flex flex-wrap gap-2">
              {callAgent.phone_numbers.map((number, index) => (
                <span 
                  key={index}
                  className={`text-sm px-3 py-1 rounded-md font-mono ${
                    darkMode ? 'bg-gray-700/50 text-gray-300 border border-gray-600/50' : 'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}
                >
                  {number}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Created time */}
        <div className="flex items-center text-sm">
          <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
            Created {formattedDate}
          </span>
        </div>
      </div>

      {/* Delete button at bottom */}
      <div className={`border-t ${darkMode ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
        <button 
          onClick={(e) => onDelete(callAgent, e)}
          className={`w-full py-3 text-sm font-medium flex items-center justify-center transition-all duration-200 ${
            darkMode 
              ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' 
              : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
          }`}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </button>
      </div>
    </div>
  );
};

export default CallAgentCard; 