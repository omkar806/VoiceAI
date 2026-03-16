'use client';

import { useState, useEffect } from 'react';
import { organizationApi } from '@/services/config/api';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ConfirmationModal from '@/components/organization/ConfirmationModal';
import { useTheme } from '@/contexts/ThemeContext';

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
  const { darkMode } = useTheme();
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
    <div className={`shadow rounded-lg mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className={`px-6 py-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Pending Invitations</h3>
        <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Manage invitations for your organization
        </p>
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
      
      <div className={`px-6 py-5 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading invitations...</p>
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-4">
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No pending invitations</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <tr>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Email
                  </th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Status
                  </th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Expires
                  </th>
                  <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`${darkMode ? 'bg-gray-800' : 'bg-white'} divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {invitation.invitee_email}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} capitalize`}>
                      {invitation.status}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedInvitation(invitation);
                            setShowAcceptModal(true);
                          }}
                          className={`text-blue-600 ${darkMode ? 'dark:text-blue-400' : ''} hover:text-blue-800 ${darkMode ? 'dark:hover:text-blue-300' : ''}`}
                        >
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          <span className="sr-only">Accept</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvitation(invitation);
                            setShowCancelModal(true);
                          }}
                          className={`text-red-600 ${darkMode ? 'dark:text-red-400' : ''} hover:text-red-800 ${darkMode ? 'dark:hover:text-red-300' : ''}`}
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