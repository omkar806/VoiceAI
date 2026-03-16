'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Users, 
  GitBranch, 
  Database, 
  MessageSquare, 
  FileText, 
  Settings, 
  Building2,
  Activity,
  Phone,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Zap,
  Brain,
  Server,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { safeStorage } from '@/lib/safeStorage';
import React from 'react';

// Enhanced animation styles with GPU acceleration
const animationStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translate3d(0, 20px, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
  .animate-fadeInUp {
    animation: fadeInUp 0.4s ease-out forwards;
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translate3d(-20px, 0, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }
  .animate-slideInLeft {
    animation: slideInLeft 0.3s ease-out forwards;
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale3d(0.9, 0.9, 1);
    }
    to {
      opacity: 1;
      transform: scale3d(1, 1, 1);
    }
  }
  .animate-scaleIn {
    animation: scaleIn 0.3s ease-out forwards;
  }

  @keyframes shimmer {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: calc(200px + 100%) 0;
    }
  }
  .animate-shimmer {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    background-size: 200px 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes glow {
    0% {
      box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
    }
    50% {
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
    }
    100% {
      box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
    }
  }
  .animate-glow {
    animation: glow 2s infinite;
  }

  .gpu-accelerated {
    transform: translate3d(0, 0, 0);
    backface-visibility: hidden;
    perspective: 1000px;
  }

  .hover-lift {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .hover-lift:hover {
    transform: translateY(-1px);
  }

  .glass-effect {
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .nav-item-glow {
    position: relative;
    overflow: hidden;
  }
  .nav-item-glow::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.1), transparent);
    transition: left 0.5s;
  }
  .nav-item-glow:hover::before {
    left: 100%;
  }

  .category-divider {
    position: relative;
  }
  .category-divider::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 20px;
    height: 1px;
    background: linear-gradient(90deg, currentColor, transparent);
    transform: translateY(-50%);
  }
`;

interface SidebarProps {
  onExpandChange?: (isExpanded: boolean) => void;
}

export default React.memo(function Sidebar({ onExpandChange }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { darkMode } = useTheme();
  
  // Initialize from localStorage with improved logic
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = safeStorage.getItem('sidebarExpanded');
      if (saved !== null) {
        return JSON.parse(saved);
      }
      return window.innerWidth >= 1024; // Changed to lg breakpoint
    }
    return true;
  });

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    build: true,
    manage: true
  });

  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  const toggleSidebar = useCallback(() => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    safeStorage.setItem('sidebarExpanded', JSON.stringify(newState));
  }, [isExpanded]);
  
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  }, []);
  
  const isActive = useCallback((path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  }, [pathname]);

  // Check if any item in a category is active
  const isCategoryActive = useCallback((items: any[]) => {
    return items.some(item => isActive(item.path));
  }, [isActive]);

  // Enhanced responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsExpanded(false);
        safeStorage.setItem('sidebarExpanded', 'false');
      }
    };

    if (safeStorage.getItem('sidebarExpanded') === null) {
      handleResize();
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Notify parent component when sidebar expansion state changes
  useEffect(() => {
    if (onExpandChange) {
      onExpandChange(isExpanded);
    }
  }, [isExpanded, onExpandChange]);

  // Prefetch workflows route for instant load when user clicks Workflows
  useEffect(() => {
    router.prefetch('/workflows');
  }, [router]);

  // Enhanced navigation items with better icons and descriptions
  const standaloneItems = useMemo(() => [
    {
      name: "Overview",
      path: "/overview",
      icon: Home,
      description: "Dashboard and analytics"
    }
  ], []);

  // BUILD category with enhanced icons
  const buildItems = useMemo(() => [
    {
      name: "AI Builder",
      path: "/ai-builder",
      icon: Sparkles,
      description: "Build agents & workflows with AI"
    },
    {
      name: "Agents",
      path: "/agents",
      icon: Brain,
      description: "AI agents and assistants"
    },
    {
      name: "RAG",
      path: "/rag",
      icon: Database,
      description: "Knowledge base and retrieval"
    },
    {
      name: "Workflows",
      path: "/workflows",
      icon: GitBranch,
      description: "Automation workflows"
    },
    {
      name: "Call Agents",
      path: "/call-agents",
      icon: Phone,
      description: "Voice-enabled agents"
    },
    // {
    //   name: "Activity",
    //   path: "/activity",
    //   icon: TrendingUp,
    //   description: "Activity monitoring"
    // }
  ], []);

  // MANAGE category with enhanced icons
  const manageItems = useMemo(() => [
    {
      name: "Settings",
      path: "/settings",
      icon: Settings,
      description: "System configuration"
    },
    {
      name: "Organizations",
      path: "/organizations",
      icon: Building2,
      description: "Team management"
    }
  ], []);

  // Enhanced navigation item renderer
  const renderNavItems = useCallback((items: any[], isSubItem = false) => {
    return items.map((item, index) => {
      const IconComponent = item.icon;
      const isItemActive = isActive(item.path);
      
      return (
        <div
          key={item.path}
          className="nav-item-glow"
        >
          <Link 
            href={item.path}
            className={`group flex items-center hover-lift gpu-accelerated relative ${
              isExpanded 
                ? 'justify-start p-3 mx-2 rounded-xl' 
                : 'justify-center p-3 mx-1 my-2 rounded-xl'
            } ${
              isSubItem && isExpanded ? 'ml-4 mr-2' : ''
            } transition-all duration-200 ease-out ${
              isItemActive
                ? darkMode 
                  ? 'bg-gradient-to-r from-blue-600/20 to-blue-500/20 text-blue-400 shadow-lg border border-blue-500/30' 
                  : 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-600 shadow-lg border border-blue-200'
                : darkMode
                  ? 'text-gray-300 hover:text-white hover:bg-gray-800/50 border border-transparent hover:border-gray-700/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/80 border border-transparent hover:border-gray-200/50'
            } ${isItemActive ? 'animate-glow' : ''}`}
            onMouseEnter={() => setHoveredItem(item.path)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div className="relative">
              <IconComponent 
                size={20} 
                className={`transition-all duration-200 ${
                  isItemActive 
                    ? 'scale-110' 
                    : hoveredItem === item.path 
                      ? 'scale-105' 
                      : 'scale-100'
                }`} 
              />
              {isItemActive && (
                <div
                  className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"
                />
              )}
            </div>
            
            <AnimatePresence>
              {isExpanded && (
                <div
                  className="ml-3 flex-1 min-w-0"
                >
                  <div className="flex flex-col">
                    <span className={`text-sm font-semibold leading-tight ${
                      isItemActive ? 'text-current' : ''
                    }`}>
                      {item.name}
                    </span>
                    {hoveredItem === item.path && item.description && (
                      <span
                        className={`text-xs mt-1 leading-tight ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        {item.description}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* Active indicator */}
            {isItemActive && (
              <div
                className="absolute right-2 w-2 h-2 bg-blue-500 rounded-full"
              />
            )}
          </Link>
        </div>
      );
    });
  }, [isExpanded, isActive, darkMode, hoveredItem]);

  // Enhanced category header component
  const CategoryHeader = useCallback(({ 
    title, 
    items, 
    categoryKey, 
    icon: IconComponent 
  }: { 
    title: string; 
    items: any[]; 
    categoryKey: string;
    icon: any;
  }) => {
    const isActiveCategory = isCategoryActive(items);
    const isExpanded = expandedCategories[categoryKey];
    
    return (
      <button
        onClick={() => toggleCategory(categoryKey)}
        className={`flex items-center justify-between w-full p-3 mx-2 rounded-xl transition-all duration-200 group category-divider ${
          isActiveCategory
            ? darkMode 
              ? 'text-blue-400 bg-blue-900/20 border border-blue-500/30' 
              : 'text-blue-600 bg-blue-50/80 border border-blue-200'
            : darkMode
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border border-transparent hover:border-gray-700/50' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/80 border border-transparent hover:border-gray-200/50'
        }`}
      >
        <div className="flex items-center space-x-2">
          <IconComponent size={16} className="opacity-75" />
          <span className="text-xs font-bold tracking-wider">{title}</span>
        </div>
        <motion.div
          initial={false}
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="opacity-60"
        >
          <ChevronDown size={14} />
        </motion.div>
      </button>
    );
  }, [isCategoryActive, expandedCategories, toggleCategory, darkMode]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-10 lg:hidden glass-effect"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>
      
      {/* Enhanced Sidebar */}
      <motion.aside
        initial={{ width: isExpanded ? 280 : 80 }}
        animate={{ width: isExpanded ? 280 : 80 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={`fixed left-0 top-0 h-full z-20 flex flex-col overflow-hidden gpu-accelerated glass-effect ${
          darkMode 
            ? 'bg-gray-900/95 border-r border-gray-700/50' 
            : 'bg-white border-r border-gray-200/50'
        } shadow-2xl backdrop-blur-xl`}
      >
        {/* Enhanced Header */}
        <div className={`flex items-center ${isExpanded ? 'justify-center' : 'justify-between'} h-16 px-4 border-b ${
          darkMode ? 'border-gray-700/50' : 'border-gray-200/50'
        }`}>
          <AnimatePresence mode="wait">
            {isExpanded ? (
              <div className="flex items-center space-x-3">
                <Link href="/" className="flex items-center space-x-3 group">
                  <div className="relative">
                    <div className="relative w-100 h-30 rounded-xl overflow-hidden bg-transparent group-hover:scale-105 transition-all duration-200">
                      <Image
                        src={darkMode ? "/Uttertuple_uploaded_white_foreground.png" : "/Uttertuple_uploaded_transparent.png"}
                        alt="UtterTuple Logo"
                        width={300}
                        height={64}
                        className="object-contain w-full h-full drop-shadow-sm"
                        priority
                        sizes="170px"
                      />
                    </div>
                  </div>
                </Link>
              </div>
            ) : (
              <div className="w-full flex justify-center">
                <Link href="/" className="group">
                  <div className="relative">
                    <div className="relative w-20 h-14 rounded-xl overflow-hidden bg-transparent group-hover:scale-105 transition-all duration-200">
                      <Image
                        src={darkMode ? "/Uttertuple_uploaded_white_foreground.png" : "/Uttertuple_uploaded_transparent.png"}
                        alt="UtterTuple Logo"
                        width={80}
                        height={56}
                        className="object-contain w-full h-full drop-shadow-sm"
                        priority
                        sizes="200px"
                      />
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </AnimatePresence>

          {/* Toggle button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleSidebar}
            className={`${isExpanded ? '' : 'hidden'} p-2 rounded-lg transition-all duration-200 ${
              darkMode 
                ? 'text-gray-400 hover:text-white hover:bg-gray-800/50' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
            }`}
            aria-label={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <motion.div
              initial={false}
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight size={20} />
            </motion.div>
          </motion.button>
        </div>
        
        {/* Enhanced Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          <div className="space-y-2">
            {/* Standalone Items */}
            <div>
              {renderNavItems(standaloneItems)}
            </div>
            
            {/* BUILD Category */}
            <div className="mt-6">
              {isExpanded && (
                <CategoryHeader 
                  title="BUILD" 
                  items={buildItems} 
                  categoryKey="build"
                  icon={Zap}
                />
              )}
              
              <AnimatePresence initial={false}>
                {(expandedCategories.build || !isExpanded) && (
                  <motion.div
                    initial={isExpanded ? { height: 0, opacity: 0 } : { opacity: 1 }}
                    animate={isExpanded ? { height: 'auto', opacity: 1 } : { opacity: 1 }}
                    exit={isExpanded ? { height: 0, opacity: 0 } : { opacity: 1 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className={`overflow-hidden ${isExpanded ? 'mt-2' : ''}`}
                  >
                    {renderNavItems(buildItems, true)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* MANAGE Category */}
            <div className="mt-6">
              {isExpanded && (
                <CategoryHeader 
                  title="MANAGE" 
                  items={manageItems} 
                  categoryKey="manage"
                  icon={Server}
                />
              )}
              
              <AnimatePresence initial={false}>
                {(expandedCategories.manage || !isExpanded) && (
                  <motion.div
                    initial={isExpanded ? { height: 0, opacity: 0 } : { opacity: 1 }}
                    animate={isExpanded ? { height: 'auto', opacity: 1 } : { opacity: 1 }}
                    exit={isExpanded ? { height: 0, opacity: 0 } : { opacity: 1 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className={`overflow-hidden ${isExpanded ? 'mt-2' : ''}`}
                  >
                    {renderNavItems(manageItems, true)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </nav>
      </motion.aside>

      {/* External toggle button for collapsed sidebar */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleSidebar}
            className={`fixed top-4 left-24 z-30 p-2 rounded-lg shadow-lg transition-all duration-200 ${
              darkMode 
                ? 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-600' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
            aria-label="Expand Sidebar"
          >
            <ChevronRight size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}); 