import React, { createContext, useContext } from 'react';
import { useTheme } from './ThemeContext';

// Create a context with a default value
export const DarkModeContext = createContext<{ darkMode: boolean }>({ darkMode: false });

// Export a hook that can be used to access the context
export const useDarkMode = () => {
  // This just delegates to the ThemeContext's darkMode value for compatibility
  const { darkMode } = useTheme();
  return { darkMode };
};

// This component is just a compatibility layer and delegates to ThemeContext
export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { darkMode } = useTheme();
  
  return (
    <DarkModeContext.Provider value={{ darkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}; 