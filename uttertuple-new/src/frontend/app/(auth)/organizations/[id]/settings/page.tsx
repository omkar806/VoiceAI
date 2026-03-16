'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/contexts/ThemeContext';
import OrganizationSettings from '@/components/organization/OrganizationSettings';
import UserManagement from '@/components/organization/UserManagement';
import InvitationsList from '@/components/organization/InvitationsList';
import { 
  Cog6ToothIcon, 
  UserGroupIcon, 
  EnvelopeIcon,
  ArrowLeftIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';

export default function OrganizationSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params?.id as string;
  const { currentOrganization } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('settings');

  if (!organizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">No Organization Selected</h2>
          <p className="text-gray-600 dark:text-gray-400">Please select an organization to manage.</p>
        </div>
      </div>
    );
  }

  const handleBackClick = () => {
    router.push('/organizations');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header with Back Button and Theme Toggle */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              {/* Back Button */}
              <button
                onClick={handleBackClick}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md transition-colors ${
                  darkMode
                    ? 'text-gray-300 bg-gray-700 hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
                }`}
              >
                <ArrowLeftIcon className="-ml-0.5 mr-2 h-4 w-4" />
                Back to Organizations
              </button>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Organization Settings
                </h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Manage your organization settings, members and invitations
                </p>
              </div>
            </div>
            
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-colors ${
                darkMode 
                  ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
          </div>
          
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Cog6ToothIcon className="h-5 w-5 mr-2" />
                  Settings
                </div>
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'members'
                    ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <UserGroupIcon className="h-5 w-5 mr-2" />
                  Members
                </div>
              </button>
              <button
                onClick={() => setActiveTab('invitations')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'invitations'
                    ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <EnvelopeIcon className="h-5 w-5 mr-2" />
                  Invitations
                </div>
              </button>
            </nav>
          </div>
          
          <div className="mt-8">
            {activeTab === 'settings' && (
              <OrganizationSettings 
                organizationId={organizationId}
                onUpdate={() => {
                  // Force a reload to reflect changes
                  window.location.reload();
                }} 
              />
            )}
            
            {activeTab === 'members' && (
              <UserManagement organizationId={organizationId} />
            )}
            
            {activeTab === 'invitations' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Organization Invitations
                </h3>
                <InvitationsList 
                  organizationId={organizationId}
                  showReceived={false}
                  showSent={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 