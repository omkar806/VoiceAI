'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Organization, organizationApi, userApi } from '@/services/config/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/lib/auth-context';
import { Transition } from '@headlessui/react';
import { PlusIcon, ArrowRightIcon, UserGroupIcon, ShieldCheckIcon, ArrowRightOnRectangleIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import CreateOrganizationModal from './CreateOrganizationModal';
import InvitationsList from './InvitationsList';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { safeStorage } from '@/lib/safeStorage';
import OrganizationSwitcher from '@/components/organization/OrganizationSwitcher';

export default function OrganizationSelector() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [switchingToOrg, setSwitchingToOrg] = useState<string | null>(null);
  const router = useRouter();
  const { darkMode, toggleTheme } = useTheme();
  const { user, setCurrentOrganization, setCurrentOrganizationState, logout } = useAuth();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const orgs = await organizationApi.getAllOrganizations();
      setOrganizations(orgs);
      // Preselect the default organization if available
      const defaultOrg = orgs.find(org => org.is_default);
      if (defaultOrg) {
        setSelectedOrg(defaultOrg.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrganization = (orgId: string) => {
    setSelectedOrg(orgId);
  };

  const handleContinue = async () => {
    if (!selectedOrg) return;
    
    try {
      console.log('Setting organization:', selectedOrg);
      
      // Find the selected organization object
      const selectedOrgData = organizations.find(org => org.id === selectedOrg);
      if (!selectedOrgData) {
        throw new Error('Selected organization not found');
      }
      
      // Update localStorage and cookies with the selected organization
      safeStorage.setItem('current_organization', selectedOrg);
      Cookies.set('current_organization', selectedOrg);
      
      // Update auth context
      if (setCurrentOrganization) {
        await setCurrentOrganization(selectedOrg);
      }
      
      // Force a full page reload to ensure all contexts are updated
      window.location.href = '/overview';
    } catch (err: any) {
      setError(err.message || 'Failed to set organization');
    }
  };

  const handleCreateSuccess = (newOrg: Organization) => {
    console.log('Organization created successfully:', newOrg);
    
    // Update the organizations list with the new one
    setOrganizations([...organizations, newOrg]);
    
    // Select the new organization
    setSelectedOrg(newOrg.id);
    
    // Also update the currentOrganizationState directly
    if (setCurrentOrganizationState) {
      console.log('Setting organization state after creation:', newOrg);
      setCurrentOrganizationState(newOrg);
    }
    
    // Close the modal
    setShowCreateModal(false);
    
    // Switch to the new organization
    setSwitchingToOrg(newOrg.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-blue-600/50 mb-4"></div>
          <div className="h-6 w-64 bg-blue-600/30 rounded"></div>
          <div className="h-4 w-48 bg-blue-600/20 rounded mt-4"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Organization Switcher Component - renders nothing but handles switching */}
      {switchingToOrg && <OrganizationSwitcher organizationId={switchingToOrg} />}
      
      <div className={`min-h-[calc(100vh-4rem)] ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8`}>
        <div className="w-full max-w-screen-lg">
          <div className="fixed top-4 right-16 z-40 flex justify-end mb-4 space-x-2">
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
            
            {/* Logout Button */}
            <button
              onClick={logout}
              className={`p-2 rounded-full ${
                darkMode
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              } transition-colors`}
              aria-label="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="text-center mb-10">
            <div className="flex justify-center mb-5">
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                <UserGroupIcon className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className={`text-3xl font-extrabold ${darkMode ? 'text-white' : 'text-gray-900'} sm:text-4xl tracking-tight`}>
              Welcome to your organizations
            </h1>
            <p className={`mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Select an organization to continue or create a new one
            </p>
          </div>

          {error && (
            <div className={`${darkMode ? 'bg-red-900/30' : 'bg-red-50'} mb-6 text-red-700 dark:text-red-400 p-4 rounded-md text-sm border border-red-200 dark:border-red-800`}>
              {error}
            </div>
          )}

          {/* Invitations Section */}
          <InvitationsList />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {organizations.map((org) => (
              <div
                key={org.id}
                className={`relative ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md border-2 transition-all p-6 cursor-pointer hover:shadow-lg ${
                  selectedOrg === org.id
                    ? `${darkMode ? 'border-blue-400' : 'border-blue-500'} ring-2 ring-blue-500/20`
                    : `${darkMode ? 'border-gray-700' : 'border-gray-200'}`
                }`}
                onClick={() => handleSelectOrganization(org.id)}
              >
                {selectedOrg === org.id && (
                  <div className="absolute top-3 right-3">
                    <div className={`w-6 h-6 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-500'} flex items-center justify-center`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}

                <div className="absolute top-3 right-14">
                  <Link href={`/organizations/${org.id}/settings`}>
                    <span className={`w-6 h-6 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </Link>
                </div>

                <div className="flex flex-col h-full">
                  <div className="flex-shrink-0 mb-4">
                    <div className={`w-12 h-12 rounded-md ${darkMode ? 'bg-blue-900' : 'bg-blue-100'} flex items-center justify-center`}>
                      <span className={`text-lg font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                        {org.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-grow overflow-hidden">
                    <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-1 truncate`}>
                      {org.name}
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} line-clamp-2 break-words`}>
                      {org.description || 'No description'}
                    </p>
                  </div>
                  <div className={`mt-4 flex items-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {org.is_default && (
                      <div className={`flex items-center ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        <ShieldCheckIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                        <span className="truncate">Default</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Create new organization card */}
            <div
              className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-all flex flex-col items-center justify-center text-center`}
              onClick={() => setShowCreateModal(true)}
            >
              <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-blue-900' : 'bg-blue-100'} flex items-center justify-center mb-3`}>
                <PlusIcon className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-1 truncate max-w-full`}>Create new organization</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} line-clamp-2`}>
                Start a new workspace for your team
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!selectedOrg || switchingToOrg !== null}
              className={`flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md ${darkMode ? 'text-white' : 'text-gray-900'} bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {switchingToOrg ? 'Switching...' : 'Continue'}
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </button>
          </div>
        </div>

        <CreateOrganizationModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
          fetchOrganizations={fetchOrganizations}
        />
      </div>
    </>
  );
} 