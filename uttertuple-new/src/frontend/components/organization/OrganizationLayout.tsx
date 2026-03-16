'use client';

// This component is no longer used - we're using the unified ClientLayout with AppHeader instead
// Keeping this file for reference only

import { useTheme } from '@/contexts/ThemeContext';

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const { darkMode } = useTheme();
  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="hidden">This component is deprecated</div>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
} 