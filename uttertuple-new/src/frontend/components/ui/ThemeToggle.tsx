import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className={`relative p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors ${
        darkMode
          ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600 focus:ring-yellow-500'
          : 'bg-neutral-100 text-gray-600 hover:bg-neutral-200 focus:ring-blue-500'
      } ${className}`}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <AnimatedIcon darkMode={darkMode} />
    </motion.button>
  );
};

// Animated icon that morphs between sun and moon
const AnimatedIcon: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  return (
    <div className="relative w-5 h-5">
      <motion.div
        initial={false}
        animate={{
          rotate: darkMode ? 0 : 180,
          opacity: darkMode ? 1 : 0,
          scale: darkMode ? 1 : 0.5,
        }}
        transition={{ duration: 0.3 }}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <Moon size={20} />
      </motion.div>
      <motion.div
        initial={false}
        animate={{
          rotate: darkMode ? -180 : 0,
          opacity: darkMode ? 0 : 1,
          scale: darkMode ? 0.5 : 1,
        }}
        transition={{ duration: 0.3 }}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <Sun size={20} />
      </motion.div>
    </div>
  );
};

export default ThemeToggle; 