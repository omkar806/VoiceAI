import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, Mic, GitBranch, Database, FileText } from 'lucide-react';

const EmptyState: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="col-span-1 lg:col-span-2 flex flex-col items-center justify-center py-12 text-center bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl border border-neutral-200/80 dark:border-gray-700/50 shadow-sm px-4"
      >
        <div className="relative mb-8">
          {/* Animated glow effect */}
          <motion.div 
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.6, 0.8, 0.6]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 4,
              repeatType: "reverse"
            }}
            className="absolute inset-0 bg-gradient-to-br from-primary-100 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-full h-32 w-32 -z-10"
            style={{ filter: "blur(10px)" }}
          />
          
          {/* Secondary pulse */}
          <motion.div 
            animate={{ 
              scale: [0.8, 1.1, 0.8],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 6,
              repeatType: "reverse",
              delay: 0.5
            }}
            className="absolute inset-0 bg-primary-100/30 dark:bg-primary-900/20 rounded-full h-32 w-32 -z-20"
            style={{ filter: "blur(20px)" }}
          />
          
          {/* Icon container with refined styling */}
          <motion.div 
            whileHover={{ y: -5, boxShadow: "0 15px 30px -10px rgba(0,0,0,0.1)" }}
            transition={{ duration: 0.2 }}
            className="h-32 w-32 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-neutral-200/50 dark:border-gray-700/50 flex items-center justify-center shadow-md"
            style={{ boxShadow: "0 10px 30px -15px rgba(0,0,0,0.2)" }}
          >
            <Mic className="h-12 w-12 text-primary-500 dark:text-primary-400" />
          </motion.div>
        </div>
        
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-2xl font-semibold text-neutral-800 dark:text-white mb-3"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
        >
          Start your journey
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-neutral-500 dark:text-gray-400 mb-8 max-w-md leading-relaxed"
        >
          Build your first AI agent or create a voicebot workflow to unlock the full potential of Uttertuple.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link href="/agents/create">
            <motion.button 
              whileHover={{ 
                scale: 1.03, 
                boxShadow: "0 10px 30px -10px rgba(0,0,0,0.25)" 
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="flex items-center px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 dark:shadow-primary-900/30"
            >
              <Users className="h-5 w-5 mr-2" />
              Create an Agent
            </motion.button>
          </Link>
          <Link href="/workflows/new/create">
            <motion.button 
              whileHover={{ 
                scale: 1.03, 
                boxShadow: "0 10px 30px -10px rgba(0,0,0,0.15)",
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="flex items-center px-6 py-2.5 bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 rounded-lg hover:bg-primary-50 dark:hover:bg-gray-700/80 transition-colors shadow-md"
            >
              <Mic className="h-5 w-5 mr-2" />
              Design a Voicebot
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>
      
      {/* Feature cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl border border-neutral-200/80 dark:border-gray-700/50 p-6 shadow-sm"
      >
        <div className="flex items-center mb-4">
          <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-white">AI Agents</h3>
            <p className="text-neutral-500 dark:text-gray-400 text-sm">Build intelligent agents with specialized skills</p>
          </div>
        </div>
        <ul className="ml-4 text-neutral-600 dark:text-gray-300 space-y-2 text-sm">
          <li className="flex items-start">
            <div className="text-green-500 dark:text-green-400 mr-2 mt-1">•</div>
            <span>Create task-specific agents with custom knowledge</span>
          </li>
          <li className="flex items-start">
            <div className="text-green-500 dark:text-green-400 mr-2 mt-1">•</div>
            <span>Connect to external tools and APIs</span>
          </li>
          <li className="flex items-start">
            <div className="text-green-500 dark:text-green-400 mr-2 mt-1">•</div>
            <span>Monitor performance and optimize responses</span>
          </li>
        </ul>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl border border-neutral-200/80 dark:border-gray-700/50 p-6 shadow-sm"
      >
        <div className="flex items-center mb-4">
          <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mr-3">
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-white">Voicebots</h3>
            <p className="text-neutral-500 dark:text-gray-400 text-sm">Design natural voice conversations</p>
          </div>
        </div>
        <ul className="ml-4 text-neutral-600 dark:text-gray-300 space-y-2 text-sm">
          <li className="flex items-start">
            <div className="text-green-500 dark:text-green-400 mr-2 mt-1">•</div>
            <span>Create voice-enabled conversation flows</span>
          </li>
          <li className="flex items-start">
            <div className="text-green-500 dark:text-green-400 mr-2 mt-1">•</div>
            <span>Design multi-turn conversations with branching</span>
          </li>
          <li className="flex items-start">
            <div className="text-green-500 dark:text-green-400 mr-2 mt-1">•</div>
            <span>Deploy voice agents across multiple channels</span>
          </li>
        </ul>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl border border-neutral-200/80 dark:border-gray-700/50 p-6 shadow-sm"
      >
        <div className="flex items-center mb-4">
          <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mr-3">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-white">RAG System</h3>
            <p className="text-neutral-500 dark:text-gray-400 text-sm">Enhance AI with your custom knowledge</p>
          </div>
        </div>
        <ul className="ml-4 text-neutral-600 dark:text-gray-300 space-y-2 text-sm">
          <li className="flex items-start">
            <div className="text-green-500 dark:text-green-400 mr-2 mt-1">•</div>
            <span>Upload documents to create knowledge bases</span>
          </li>
          <li className="flex items-start">
            <div className="text-green-500 dark:text-green-400 mr-2 mt-1">•</div>
            <span>Connect knowledge to agents for accurate responses</span>
          </li>
          <li className="flex items-start">
            <div className="text-green-500 dark:text-green-400 mr-2 mt-1">•</div>
            <span>Index and search data in real-time</span>
          </li>
        </ul>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl border border-neutral-200/80 dark:border-gray-700/50 p-6 shadow-sm"
      >
        <div className="flex items-center mb-4">
          <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 mr-3">
            <GitBranch className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-white">Multi-Agent Workflows</h3>
            <p className="text-neutral-500 dark:text-gray-400 text-sm">Create complex AI systems</p>
          </div>
        </div>
        <ul className="ml-4 text-neutral-600 dark:text-gray-300 space-y-2 text-sm">
          <li className="flex items-start">
            <div className="text-green-500 dark:text-green-400 mr-2 mt-1">•</div>
            <span>Combine multiple agents in powerful workflows</span>
          </li>
          <li className="flex items-start">
            <div className="text-green-500 dark:text-green-400 mr-2 mt-1">•</div>
            <span>Design visual flows with the drag-and-drop editor</span>
          </li>
          <li className="flex items-start">
            <div className="text-green-500 dark:text-green-400 mr-2 mt-1">•</div>
            <span>Test and deploy workflows with one click</span>
          </li>
        </ul>
      </motion.div>
    </div>
  );
};

export default EmptyState; 