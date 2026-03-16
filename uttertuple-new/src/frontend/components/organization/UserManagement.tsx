'use client';

import { useState, useEffect } from 'react';
import { organizationApi, OrganizationUser } from '@/services/config/api';
import { useAuth } from '@/lib/auth-context';
import { TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import InviteUserForm from '@/components/organization/InviteUserForm';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';

interface UserManagementProps {
  organizationId?: string;
}

type Role = 'admin' | 'member' | 'viewer';

export default function UserManagement({ organizationId }: UserManagementProps) {
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user, currentOrganization } = useAuth();
  const { darkMode } = useTheme();
  // Use provided organizationId or fall back to currentOrganization.id
  const activeOrgId = organizationId || (currentOrganization ? currentOrganization.id : '');

  useEffect(() => {
    if (activeOrgId) {
      fetchUsers();
    }
  }, [activeOrgId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const fetchedUsers = await organizationApi.getOrganizationUsers(activeOrgId);
      setUsers(fetchedUsers);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: Role) => {
    setError('');
    setSuccess('');

    try {
      await organizationApi.updateUserRole(activeOrgId, userId, newRole);
      setSuccess('User role updated successfully');
      
      // Update the local users array
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user role');
    }
  };

  const handleRemoveUser = async (userId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to remove ${email} from this organization?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await organizationApi.removeUser(activeOrgId, userId);
      setSuccess(`${email} has been removed from the organization`);
      
      // Update the local users array
      setUsers(users.filter(user => user.id !== userId));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove user');
    }
  };

  if (!activeOrgId) {
    return (
      <div className={`bg-white dark:bg-gray-800 shadow rounded-lg py-6 px-4 sm:p-6 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <p className={`text-red-500 dark:text-red-400 ${darkMode ? 'text-white' : 'text-gray-900'}`}>No organization selected</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 shadow rounded-lg py-6 px-4 sm:p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="animate-pulse">
          <div className={`h-5 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-1/4 mb-4`}></div>
          <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-2/3 mb-8`}></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className={`rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} h-10 w-10`}></div>
                <div className="flex-1">
                  <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-1/4 mb-2`}></div>
                  <div className={`h-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-1/3`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`shadow rounded-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className={`px-6 py-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Members</h3>
            <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Manage who has access to this organization
              {activeOrgId && (
                <span className={`ml-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  <Link href={`/organizations/${activeOrgId}/settings`}>
                    View Settings
                  </Link>
                </span>
              )}
            </p>
          </div>
          <InviteUserForm 
            organizationId={activeOrgId}
            onSuccess={(message) => setSuccess(message)}
            onError={(message) => setError(message)}
          />
        </div>
      </div>

      {error && (
        <div className={`m-6 ${darkMode ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-50 text-red-700 border-red-200'} text-sm border-b`}>
          {error}
        </div>
      )}
      
      {success && (
        <div className={`m-6 ${darkMode ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-50 text-green-700 border-green-200'} text-sm border-b`}>
          {success}
        </div>
      )}

      <div className="px-6 py-5">
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th 
                  scope="col" 
                  className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}
                >
                  User
                </th>
                <th 
                  scope="col" 
                  className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}
                >
                  Role
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className={`sr-only ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className={`${darkMode ? 'bg-gray-800' : 'bg-white'} divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {users.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-10 w-10 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center`}>
                        <span className={`${darkMode ? 'text-gray-300' : 'text-gray-500'} font-medium`}>
                          {member.email.substring(0, 1).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {member.email}
                        </div>
                        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {member.id === user?.id ? '(You)' : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {member.id === user?.id ? (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                          {member.role}
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value as Role)}
                          className={`block w-full pl-3 pr-10 py-1 text-sm border-gray-300 ${darkMode ? 'border-gray-600' : 'border-gray-300'} focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${darkMode ? 'bg-gray-700 text-white' : ''} rounded-md`}
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {member.id !== user?.id && (
                      <button
                        onClick={() => handleRemoveUser(member.id, member.email)}
                        className={`text-red-600 hover:text-red-900 ${darkMode ? 'dark:text-red-400 dark:hover:text-red-300' : ''}`}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className={`text-center py-6 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No members found in this organization.
          </div>
        )}
      </div>
    </div>
  );
} 