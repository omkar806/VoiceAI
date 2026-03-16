'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import OrganizationSettings from '@/components/organization/OrganizationSettings';
import UserManagement from '@/components/organization/UserManagement';
import InvitationsList from '@/components/organization/InvitationsList';
import { Cog6ToothIcon, UserGroupIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

export default function OrganizationSettingsPage() {
  const params = useParams();
  const organizationId = params?.id as string;
  const { currentOrganization } = useAuth();
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

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Organization Settings
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Manage your organization settings, members and invitations
            </p>
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