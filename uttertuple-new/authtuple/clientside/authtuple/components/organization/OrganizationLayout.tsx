'use client';

// This component is no longer used - we're using the unified ClientLayout with AppHeader instead
// Keeping this file for reference only

import AppHeader from '../dashboard/AppHeader';

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="hidden">This component is deprecated</div>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
} 