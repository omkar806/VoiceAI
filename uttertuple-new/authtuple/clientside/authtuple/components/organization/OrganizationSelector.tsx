'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Organization, organizationApi } from '@/config/api';
import { useAuth } from '@/lib/auth-context';
import { Transition } from '@headlessui/react';
import { PlusIcon, ArrowRightIcon, UserGroupIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import CreateOrganizationModal from './CreateOrganizationModal';
import InvitationsList from './InvitationsList';
import Link from 'next/link';

export default function OrganizationSelector() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const router = useRouter();
  const { user, setCurrentOrganization } = useAuth();

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
      // Update user's current organization
      if (setCurrentOrganization) {
        await setCurrentOrganization(selectedOrg);
      }
      
      // Navigate to the main app
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to set organization');
    }
  };

  const handleCreateSuccess = (newOrg: Organization) => {
    setOrganizations([...organizations, newOrg]);
    setSelectedOrg(newOrg.id);
    setShowCreateModal(false);
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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
              <UserGroupIcon className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl tracking-tight">
            Welcome to your organizations
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Select an organization to continue or create a new one
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-md text-sm border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Invitations Section */}
        <InvitationsList />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {organizations.map((org) => (
            <div
              key={org.id}
              className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 transition-all p-6 cursor-pointer hover:shadow-lg ${
                selectedOrg === org.id
                  ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
              onClick={() => handleSelectOrganization(org.id)}
            >
              {selectedOrg === org.id && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}

              <div className="absolute top-3 right-14">
                <Link href={`/organizations/${org.id}/settings`}>
                  <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                  </span>
                </Link>
              </div>

              <div className="flex flex-col h-full">
                <div className="flex-shrink-0 mb-4">
                  <div className="w-12 h-12 rounded-md bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-300">
                      {org.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex-grow overflow-hidden">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1 truncate">
                    {org.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 break-words">
                    {org.description || 'No description'}
                  </p>
                </div>
                <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
                  {org.is_default && (
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
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
            className="bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-all flex flex-col items-center justify-center text-center"
            onClick={() => setShowCreateModal(true)}
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-3">
              <PlusIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1 truncate max-w-full">Create new organization</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              Start a new workspace for your team
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedOrg}
            className="flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
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
  );
} 