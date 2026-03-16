import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Users, Mic, Database, Lightbulb } from 'lucide-react';
import Link from 'next/link';

interface OnboardingModalProps {
  onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  
  const steps = [
    {
      title: "Welcome to Uttertuple",
      description: "Your AI-powered voice agent platform for building intelligent conversations.",
      icon: <Lightbulb className="h-16 w-16 text-primary-500" />,
      gradient: "from-yellow-50 to-primary-50 dark:from-yellow-900/20 dark:to-primary-900/20",
      iconBg: "bg-primary-500/10 dark:bg-primary-500/20"
    },
    {
      title: "Create AI Agents",
      description: "Build AI agents with specialized knowledge and skills to handle different tasks.",
      icon: <Users className="h-16 w-16 text-blue-500" />,
      gradient: "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
      iconBg: "bg-blue-500/10 dark:bg-blue-500/20"
    },
    {
      title: "Design Voicebots",
      description: "Create interactive voice workflows by connecting agents for seamless conversations.",
      icon: <Mic className="h-16 w-16 text-purple-500" />,
      gradient: "from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
      iconBg: "bg-purple-500/10 dark:bg-purple-500/20"
    },
    {
      title: "Connect Knowledge",
      description: "Upload documents to give your agents access to specific knowledge with RAG.",
      icon: <Database className="h-16 w-16 text-green-500" />,
      gradient: "from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20",
      iconBg: "bg-green-500/10 dark:bg-green-500/20"
    }
  ];
  
  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };
  
  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden"
        style={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
      >
        {/* Progress indicator with smoother styling */}
        <div className="h-1 bg-neutral-100 dark:bg-gray-700">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(step + 1) / steps.length * 100}%` }}
            className="h-full bg-gradient-to-r from-primary-400 to-primary-600 dark:from-primary-600 dark:to-primary-400"
            transition={{ ease: "easeInOut" }}
          />
        </div>
        
        {/* Close button with refinements */}
        <motion.button 
          onClick={onClose}
          whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.05)" }}
          whileTap={{ scale: 0.95 }}
          className="absolute top-4 right-4 text-neutral-400 dark:text-gray-500 hover:text-neutral-600 dark:hover:text-gray-300 h-8 w-8 rounded-full flex items-center justify-center z-10"
        >
          <X className="h-5 w-5" />
        </motion.button>
        
        <div className="p-10 relative">
          {/* Background gradient specific to each step */}
          <div className={`absolute inset-0 bg-gradient-to-br ${steps[step].gradient} opacity-40`} />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col items-center text-center relative z-10"
            >
              {/* Enhanced icon display */}
              <motion.div 
                className={`mb-8 rounded-full p-6 ${steps[step].iconBg} shadow-lg`}
                animate={{ 
                  y: [0, -8, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut"
                }}
                style={{ boxShadow: "0 15px 30px -10px rgba(0,0,0,0.1)" }}
              >
                {steps[step].icon}
              </motion.div>
              
              <motion.h2
                animate={{ scale: [0.95, 1] }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-3xl font-bold text-neutral-800 dark:text-white mb-4 tracking-tight"
                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
              >
                {steps[step].title}
              </motion.h2>
              
              <motion.p
                animate={{ opacity: [0.8, 1] }}
                transition={{ duration: 0.5 }}
                className="text-neutral-600 dark:text-gray-300 mb-8 max-w-md text-lg leading-relaxed"
              >
                {steps[step].description}
              </motion.p>
            </motion.div>
          </AnimatePresence>
          
          {/* Enhanced navigation buttons */}
          <div className="flex justify-between mt-8 relative z-10">
            <motion.button
              onClick={prevStep}
              whileHover={{ x: -3, opacity: 1 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center text-neutral-500 dark:text-gray-400 hover:text-neutral-700 dark:hover:text-gray-300 px-3 py-2 rounded-lg ${step === 0 ? 'opacity-0 pointer-events-none' : 'opacity-70'}`}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span>Back</span>
            </motion.button>
            
            <div className="flex items-center">
              {steps.map((_, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.5 }}
                  whileTap={{ scale: 0.8 }}
                  onClick={() => setStep(index)}
                  className={`h-2 w-2 rounded-full mx-1.5 cursor-pointer transition-all duration-200 ${
                    index === step 
                      ? 'bg-primary-600 scale-125' 
                      : index < step 
                        ? 'bg-primary-300 dark:bg-primary-700' 
                        : 'bg-neutral-200 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
            
            {step < steps.length - 1 ? (
              <motion.button
                onClick={nextStep}
                whileHover={{ x: 3, backgroundColor: "rgba(59, 130, 246, 0.08)" }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center text-primary-600 dark:text-primary-400 font-medium px-3 py-2 rounded-lg"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </motion.button>
            ) : (
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.03, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                whileTap={{ scale: 0.97 }}
                className="bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 transition-all font-medium shadow-lg shadow-primary-600/20 dark:shadow-primary-900/20"
              >
                Get Started
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingModal; 