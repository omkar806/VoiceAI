'use client';

import { useState, useEffect } from 'react';
import { organizationApi } from '@/config/api';
import { timeAgo } from '@/lib/utils';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ConfirmationModal from './ConfirmationModal';

interface Invitation {
  id: string;
  organization_id: string;
  organization_name: string;
  role: string;
  status: string;
  expires_at: string;
  token: string;
  invitee_email: string;
  created_at: string;
}

interface ManageInvitationsProps {
  organizationId: string;
}

export default function ManageInvitations({ organizationId }: ManageInvitationsProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInvitations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await organizationApi.getAllInvitations();
      const filtered = response.sent.filter(inv => inv.organization_id === organizationId);
      setInvitations(filtered);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [organizationId]);

  const handleAcceptInvitation = async () => {
    if (!selectedInvitation) return;
    
    setActionLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await organizationApi.acceptInvitation({ token: selectedInvitation.token });
      setSuccess(`Invitation for ${selectedInvitation.invitee_email} has been accepted`);
      fetchInvitations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to accept invitation');
    } finally {
      setActionLoading(false);
      setShowAcceptModal(false);
      setSelectedInvitation(null);
    }
  };

  const handleCancelInvitation = async () => {
    if (!selectedInvitation) return;
    
    setActionLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await organizationApi.rejectInvitation({ token: selectedInvitation.token });
      setSuccess(`Invitation for ${selectedInvitation.invitee_email} has been cancelled`);
      fetchInvitations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel invitation');
    } finally {
      setActionLoading(false);
      setShowCancelModal(false);
      setSelectedInvitation(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Pending Invitations</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage invitations for your organization
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
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading invitations...</p>
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">No pending invitations</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Expires
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {invitation.invitee_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {invitation.status}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {timeAgo(new Date(invitation.expires_at))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedInvitation(invitation);
                            setShowAcceptModal(true);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          <span className="sr-only">Accept</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvitation(invitation);
                            setShowCancelModal(true);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        >
                          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                          <span className="sr-only">Cancel</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={showAcceptModal}
        onClose={() => setShowAcceptModal(false)}
        onConfirm={handleAcceptInvitation}
        title="Accept Invitation"
        message={
          selectedInvitation && (
            <p>
              Are you sure you want to accept the invitation for <span className="font-medium">{selectedInvitation.invitee_email}</span>?
            </p>
          )
        }
        confirmButtonText="Accept Invitation"
        type="success"
        isLoading={actionLoading}
      />

      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelInvitation}
        title="Cancel Invitation"
        message={
          selectedInvitation && (
            <p>
              Are you sure you want to cancel the invitation for <span className="font-medium">{selectedInvitation.invitee_email}</span>?
            </p>
          )
        }
        confirmButtonText="Cancel Invitation"
        type="warning"
        isLoading={actionLoading}
      />
    </div>
  );
} 