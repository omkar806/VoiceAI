import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Edit, Trash2, Zap, ChevronRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

// Voice options mapping - for displaying voice names
const voiceOptions = [
  { value: 'bf0a246a-8642-498a-9950-80c35e9276b5', label: 'Sophie' },
  { value: '78ab82d5-25be-4f7d-82b3-7ad64e5b85b2', label: 'Savannah' },
  { value: '6f84f4b8-58a2-430c-8c79-688dad597532', label: 'Brooke' },
  { value: 'a8a1eb38-5f15-4c1d-8722-7ac0f329727d', label: 'Calm French Woman' },
  { value: '5c29d7e3-a133-4c7e-804a-1d9c6dea83f6', label: 'Marta' },
  { value: '3a63e2d1-1c1e-425d-8e79-5100bc910e90', label: 'Chinese Call Center Man' },
  { value: 'c99d36f3-5ffd-4253-803a-535c1bc9c306', label: 'Griffin' },
  { value: '32b3f3c5-7171-46aa-abe7-b598964aa793', label: 'Zia' },
  { value: '79743797-2087-422f-8dc7-86f9efca85f1', label: 'Mateo' },
  { value: 'c8605446-247c-4d39-acd4-8f4c28aa363c', label: 'Wise Lady' }
];

interface AgentCardProps {
  agent: any; // Using any for now as the Agent type might vary
  onDelete: (agent: any) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onDelete }) => {
  const { darkMode } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showFullInstructions, setShowFullInstructions] = useState(false);
  const instructionsRef = useRef<HTMLParagraphElement>(null);
  const [isInstructionsTruncated, setIsInstructionsTruncated] = useState(false);

  // Get voice label if available
  const voiceLabel = agent.voice_id 
    ? voiceOptions.find(option => option.value === agent.voice_id)?.label || 'Custom Voice'
    : null;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Check if instructions text is truncated
  useEffect(() => {
    if (instructionsRef.current && agent.instructions) {
      setIsInstructionsTruncated(
        instructionsRef.current.scrollHeight > instructionsRef.current.clientHeight
      );
    }
  }, [agent.instructions]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = () => {
    onDelete(agent);
    setShowDeleteConfirmation(false);
  };

  // Generate a background gradient based on agent name
  const getGradientColors = () => {
    // Use the agent name to generate a consistent gradient
    const hash = agent.name.split('').reduce((acc: number, char: string) => char.charCodeAt(0) + acc, 0);
    
    // Define gradient palette options
    const palettes = [
      ['from-blue-500 to-indigo-600', 'rgba(59, 130, 246, 0.8)', 'rgba(79, 70, 229, 0.9)'],
      ['from-indigo-500 to-purple-600', 'rgba(99, 102, 241, 0.8)', 'rgba(124, 58, 237, 0.9)'],
      ['from-cyan-500 to-blue-600', 'rgba(6, 182, 212, 0.8)', 'rgba(37, 99, 235, 0.9)'],
      ['from-teal-500 to-emerald-600', 'rgba(20, 184, 166, 0.8)', 'rgba(5, 150, 105, 0.9)'],
      ['from-blue-500 to-cyan-600', 'rgba(59, 130, 246, 0.8)', 'rgba(8, 145, 178, 0.9)'],
    ];
    
    return palettes[hash % palettes.length];
  };
  
  const [gradientClass, startColor, endColor] = getGradientColors();

  // Use this function to navigate to the agent details page
  const handleCardClick = () => {
    router.push(`/agents/${agent.id}`);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{
          y: -5,
          transition: { duration: 0.3, ease: 'easeOut' }
        }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        className={`relative overflow-hidden rounded-xl shadow-sm transition-all duration-300 cursor-pointer ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'
        } ${hovered ? 'shadow-md' : ''}`}
        onClick={handleCardClick}
      >
        {/* Gradient accent at top */}
        <div 
          className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${gradientClass}`}
        />
        
        {/* Subtle glow effect */}
        <div 
          className="absolute -top-10 -right-10 w-20 h-20 rounded-full opacity-10 blur-xl"
          style={{ 
            background: `radial-gradient(circle, ${startColor} 0%, ${endColor} 100%)`,
            filter: 'blur(25px)',
          }}
        />

        <div className="p-5 relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-3">
              {/* Agent avatar with gradient */}
              <div 
                className={`flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center bg-gradient-to-br ${gradientClass}`}
              >
                <span className="text-white font-bold text-lg">
                  {agent.name.charAt(0).toUpperCase()}
                </span>
              </div>
              
              <h3 
                className={`text-lg font-semibold tracking-wide overflow-hidden truncate ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                {agent.name}
              </h3>
            </div>
            
            {agent.llm_model && (
              <span 
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300 ring-1 ring-gray-600' 
                    : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
                }`}
              >
                {agent.llm_model}
              </span>
            )}
          </div>
          
          {agent.description && (
            <p className={`text-sm mb-4 line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {agent.description}
            </p>
          )}
          
          <div className="space-y-4">
            {agent.instructions && (
              <div>
                <p className={`text-xs uppercase font-medium tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Instructions
                </p>
                <div className="relative">
                  <p 
                    ref={instructionsRef}
                    className={`text-sm mt-1 line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    {agent.instructions}
                  </p>
                  
                  {isInstructionsTruncated && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setShowFullInstructions(true);
                      }}
                      className={`text-xs mt-1 ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                    >
                      Read more
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {agent.collection_fields && agent.collection_fields.length > 0 && (
              <div>
                <p className={`text-xs uppercase font-medium tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Data Collection
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {agent.collection_fields.slice(0, 3).map((field: any, index: number) => (
                    <span 
                      key={index} 
                      className={`px-2 py-1 text-xs rounded-md flex items-center ${
                        darkMode 
                          ? 'bg-gray-700 text-gray-300 ring-1 ring-gray-600' 
                          : 'bg-gray-50 text-gray-700 ring-1 ring-gray-200'
                      }`}
                    >
                      {field.name}
                    </span>
                  ))}
                  
                  {agent.collection_fields.length > 3 && (
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      +{agent.collection_fields.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Voice info */}
          {voiceLabel && (
            <div className="mt-4 flex items-center">
              <Zap className="w-3 h-3 text-green-500 mr-1.5" />
              <span className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                <span className="font-medium">Voice:</span> {voiceLabel}
              </span>
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div 
          className={`flex border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Link 
            href={`/agents/${agent.id}`} 
            className={`flex-1 text-center py-3 text-sm font-medium flex items-center justify-center ${
              darkMode 
                ? 'text-blue-400 hover:bg-blue-900/20' 
                : 'text-blue-600 hover:bg-blue-50'
            } transition-colors`}
          >
            <Edit className="w-4 h-4 mr-1.5" />
            Edit
          </Link>
          <div 
            className={`w-px h-10 self-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
          ></div>
          <button 
            onClick={handleDeleteClick}
            className={`flex-1 text-center py-3 text-sm font-medium flex items-center justify-center ${
              darkMode 
                ? 'text-gray-300 hover:bg-gray-700/50' 
                : 'text-gray-600 hover:bg-gray-50'
            } transition-colors`}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </button>
        </div>
      </motion.div>

      {/* Full instructions modal */}
      {showFullInstructions && mounted && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
            onClick={() => setShowFullInstructions(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-xl rounded-xl shadow-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Instructions for {agent.name}
              </h3>
              <div className={`whitespace-pre-wrap text-sm overflow-y-auto max-h-96 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {agent.instructions}
              </div>
              <button 
                className={`mt-4 px-4 py-2 rounded-md text-sm font-medium ${
                  darkMode 
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
                onClick={() => setShowFullInstructions(false)}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirmation && mounted && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
            onClick={() => setShowDeleteConfirmation(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-md rounded-xl shadow-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start mb-4">
                <div className={`rounded-full p-2 mr-3 ${darkMode ? 'bg-red-900/20 text-red-500' : 'bg-red-100 text-red-600'}`}>
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Delete Agent
                  </h3>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Are you sure you want to delete the agent <span className="font-semibold">{agent.name}</span>? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    darkMode 
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                  onClick={() => setShowDeleteConfirmation(false)}
                >
                  Cancel
                </button>
                <button
                  className={`px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700`}
                  onClick={confirmDelete}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default AgentCard; 