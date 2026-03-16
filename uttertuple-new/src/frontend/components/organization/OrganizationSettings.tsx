'use client';

import { useState, useEffect } from 'react';
import { Organization, organizationApi } from '@/services/config/api';
import { useAuth } from '@/lib/auth-context';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import ConfirmationModal from './ConfirmationModal';

interface OrganizationSettingsProps {
  organization?: Organization;
  organizationId?: string;
  onUpdate?: () => void;
}

export default function OrganizationSettings({ organization, organizationId, onUpdate }: OrganizationSettingsProps) {
  const { currentOrganization, logout } = useAuth();
  const [organizationData, setOrganizationData] = useState<Organization | null>(organization || null);
  const [name, setName] = useState(organization?.name || '');
  const [description, setDescription] = useState(organization?.description || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(!organization);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Use provided organizationId or fall back to currentOrganization.id
  const activeOrgId = organizationId || (currentOrganization ? currentOrganization.id : '');

  useEffect(() => {
    if (organization) {
      setOrganizationData(organization);
      setName(organization.name);
      setDescription(organization.description || '');
    } else if (activeOrgId && !organizationData) {
      fetchOrganizationData();
    }
  }, [organization, activeOrgId]);

  const fetchOrganizationData = async () => {
    if (!activeOrgId) return;
    
    setFetchLoading(true);
    setError('');
    
    try {
      const data = await organizationApi.getOrganization(activeOrgId);
      setOrganizationData(data);
      setName(data.name);
      setDescription(data.description || '');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load organization data');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationData) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await organizationApi.updateOrganization(organizationData.id, {
        name,
        description
      });
      setSuccess('Organization updated successfully');
      setIsEditing(false);
      
      // Update the local organization data
      setOrganizationData({
        ...organizationData,
        name,
        description
      });
      
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update organization');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!organizationData) return;
    
    setLoading(true);
    setError('');

    try {
      await organizationApi.deleteOrganization(organizationData.id);
      
      // If deleting the current organization, logout
      logout();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete organization');
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-6"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!organizationData) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6 p-6 text-center">
        <p className="text-red-500 dark:text-red-400">
          {error || "Organization not found"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Organization Settings</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your organization details
        </p>
      </div>
      
      {error && (
        <div className="m-6 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="m-6 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-4 rounded-md text-sm">
          {success}
        </div>
      )}
      
      <div className="px-6 py-5">
        {isEditing ? (
          <form onSubmit={handleUpdate}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Organization Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                  {organizationData.name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {organizationData.description || 'No description provided'}
                </p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PencilIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                Edit
              </button>
            </div>

            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                    Delete Organization
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Once you delete an organization, there is no going back.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Organization"
        message={
          <div>
            <p>Are you sure you want to delete <span className="font-medium">{organizationData.name}</span>?</p>
            <p className="mt-2">This action cannot be undone. All members will lose access and all data will be permanently removed.</p>
          </div>
        }
        confirmButtonText="Delete Organization"
        type="danger"
        isLoading={loading}
      />
    </div>
  );
} 