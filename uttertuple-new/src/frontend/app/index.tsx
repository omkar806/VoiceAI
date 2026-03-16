import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { motion, AnimatePresence, useInView } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../lib/auth-context";
import { Users, GitBranch, MessageSquare, FileText, Database, ArrowRight } from "lucide-react";

const Overview: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  const [tipsCompleted, setTipsCompleted] = useState(false);
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const isHeroInView = useInView(heroRef, { once: false, amount: 0.3 });
  const isFeaturesInView = useInView(featuresRef, { once: false, amount: 0.3 });
  
  // Set mounted state when component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Tips that will appear after the user spends some time on the page
  const tips = [
    "Create an agent to answer customer questions using your company knowledge base",
    "Design workflows with multiple conversational paths and connected forms",
    "Configure your favorite LLM providers and vector databases in Settings",
    "Train your agents on your documents with our RAG capabilities"
  ];

  useEffect(() => {
    if (!mounted || tipsCompleted) return;
    
    const tipTimer = setTimeout(() => {
      setShowTip(true);
      
      let tipCount = 0;
      const tipInterval = setInterval(() => {
        setShowTip(false);
        
        setTimeout(() => {
          const nextTipIndex = (currentTip + 1) % tips.length;
          setCurrentTip(nextTipIndex);
          
          tipCount++;
          if (tipCount >= tips.length - 1) {
            setTimeout(() => {
              setTipsCompleted(true);
              setShowTip(false);
            }, 8000);
            clearInterval(tipInterval);
          } else {
            setShowTip(true);
          }
        }, 500);
      }, 8000);
      
      return () => {
        clearInterval(tipInterval);
      };
    }, 5000);
    
    return () => {
      clearTimeout(tipTimer);
    };
  }, [currentTip, tipsCompleted, tips.length, mounted]);

  // Don't render content until mounted
  if (!mounted) {
    return (
      <MainLayout>
        <div className="relative overflow-hidden">
          <div className={`fixed inset-0 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`} />
          <div className="container mx-auto px-6 py-16 min-h-screen flex items-center justify-center">
            <div className="animate-pulse text-center">
              <div className={`h-12 w-48 mx-auto rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
              <div className={`h-4 w-64 mx-auto mt-6 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const featureCards = [
    {
      title: "Agents",
      description: "Create intelligent AI agents with custom capabilities and knowledge bases",
      icon: <Users className="h-12 w-12 text-blue-500" />,
      link: "/agents",
      color: "from-blue-400 to-blue-600"
    },
    {
      title: "Workflows",
      description: "Design complex conversation flows with branching paths and interactive forms",
      icon: <GitBranch className="h-12 w-12 text-purple-500" />,
      link: "/workflows",
      color: "from-purple-400 to-purple-600"
    },
    {
      title: "Settings",
      description: "Configure LLM providers, Langfuse settings, and RAG vector DB connections",
      icon: (
        <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
      ),
      link: "/settings",
      color: "from-green-400 to-green-600"
    },
    {
      title: "RAG",
      description: "Power your agents with knowledge from your own documents and data sources",
      icon: <Database className="h-12 w-12 text-amber-500" />,
      link: "/rag",
      color: "from-amber-400 to-amber-600"
    }
  ];

  // Animation variants
  const heroVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1.0] } }
  };
  const cardVariants = (i: number) => ({
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 * i, ease: [0.25, 0.1, 0.25, 1.0] } }
  });

  return (
    <MainLayout>
      <div className="relative overflow-hidden">
        <div 
          className={`fixed inset-0 ${darkMode 
            ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
            : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'
          } transition-all duration-1000 ease-in-out`} 
          style={{ zIndex: -1 }}
        />

        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: -1 }}>
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className={`absolute rounded-full ${darkMode ? 'bg-blue-500' : 'bg-blue-300'} opacity-10`}
              initial={{ 
                x: `${Math.random() * 100}%`, 
                y: `${Math.random() * 100}%`,
                scale: Math.random() * 0.5 + 0.5
              }}
              animate={{ 
                x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`], 
                y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: Math.random() * 20 + 20,
                ease: "linear",
                times: [0, 0.5, 1]
              }}
              style={{
                width: `${Math.random() * 40 + 10}px`,
                height: `${Math.random() * 40 + 10}px`,
              }}
            />
          ))}
        </div>

        <div className={`container mx-auto px-6 py-16 min-h-screen ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <AnimatePresence>
            {showTip && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", damping: 20 }}
                className={`fixed bottom-8 right-8 max-w-md p-4 rounded-xl shadow-2xl z-50 ${
                  darkMode 
                    ? 'bg-gray-800 text-white border border-gray-700' 
                    : 'bg-white text-gray-800 border border-gray-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <span className="font-medium block mb-1">Pro Tip</span>
                      {tips[currentTip]}
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowTip(false)}
                    className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hero Section */}
          <section ref={heroRef} className="mb-24 max-w-4xl mx-auto">
            <motion.div
              className="text-center"
              initial="hidden"
              animate={mounted ? "visible" : "hidden"}
              variants={heroVariants}
            >
              <h1 className={`text-5xl md:text-6xl font-bold mb-2 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}> 
                <span className="block">Welcome to</span>
                <div className="flex justify-center items-center mt-2 mb-2">
                  <span className={`text-5xl md:text-6xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Uttertuple</span>
                </div>
              </h1>
              <p className={`text-xl md:text-2xl mb-10 mt-8 leading-relaxed max-w-3xl mx-auto ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}> 
                Build, deploy, and manage intelligent conversational AI agents with a powerful platform designed for seamless interactions.
              </p>
              <div className="flex flex-wrap gap-5 justify-center">
                <div>
                  <Link 
                    href="/agents/create" 
                    className="inline-flex items-center px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium transition-all duration-300 shadow-md"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Create New Agent
                  </Link>
                </div>
                <div>
                  <Link 
                    href="/workflows" 
                    className={`inline-flex items-center px-6 py-3.5 rounded-xl ${darkMode ? 'bg-gray-800 text-blue-400 hover:bg-gray-700' : 'bg-white text-blue-600 hover:bg-gray-50'} border border-blue-500 font-medium transition-all duration-300 shadow-md`}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    Design Workflow
                  </Link>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Feature Cards */}
          <section ref={featuresRef} className="max-w-6xl mx-auto">
            <h2 
              className={`text-3xl font-bold mb-10 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Build your AI ecosystem
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featureCards.map((feature, index) => (
                <Link href={feature.link} key={index}>
                  <motion.div
                    className={`overflow-hidden relative h-full rounded-2xl ${
                      darkMode 
                        ? 'bg-gray-800 border border-gray-700' 
                        : 'bg-white border border-gray-100'
                    } shadow-lg group transition-all duration-300 p-6 cursor-pointer`}
                    initial="hidden"
                    animate={mounted ? "visible" : "hidden"}
                    variants={cardVariants(index)}
                  >
                    <div 
                      className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                    ></div>
                    <div className={`p-3 inline-flex rounded-xl mb-4 ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-50'
                    } transition-all duration-300`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                      {feature.description}
                    </p>
                    <div className="flex items-center text-blue-500 font-medium group-hover:text-blue-600 transition-all mt-auto">
                      <span>Explore</span>
                      <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
};

export default Overview; 