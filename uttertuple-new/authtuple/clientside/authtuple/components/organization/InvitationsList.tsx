'use client';

import { useState, useEffect } from 'react';
import { organizationApi, ReceivedInvitation, SentInvitation } from '@/config/api';
import { ClockIcon, CheckIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/lib/auth-context';

interface InvitationsListProps {
  organizationId?: string;
  showSent?: boolean;
  showReceived?: boolean;
}

export default function InvitationsList({ 
  organizationId, 
  showSent = true, 
  showReceived = true 
}: InvitationsListProps = {}) {
  const { currentOrganization } = useAuth();
  const [receivedInvitations, setReceivedInvitations] = useState<ReceivedInvitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<SentInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');


  // Use provided organizationId or fall back to currentOrganization.id
  const activeOrgId = organizationId || (currentOrganization ? currentOrganization.id : '');

  useEffect(() => {
    fetchInvitations();
  }, [activeOrgId]);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      setError('');
      // The getAllInvitations method doesn't take an organizationId parameter
      const { received, sent } = await organizationApi.getAllInvitations();
      
      // No filtering at all to ensure we're showing everything for debugging
      setReceivedInvitations(received);
      setSentInvitations(sent);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (token: string) => {
    try {
      await organizationApi.acceptInvitation({ token });
      setSuccessMessage('Invitation accepted successfully');
      // Remove this invitation from the list
      setReceivedInvitations(receivedInvitations.filter(inv => inv.token !== token));
      
      // Refresh page after 2 seconds to update the organizations list
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to accept invitation');
    }
  };

  const handleReject = async (token: string) => {
    try {
      await organizationApi.rejectInvitation({ token });
      setSuccessMessage('Invitation rejected');
      // Remove this invitation from the list
      setReceivedInvitations(receivedInvitations.filter(inv => inv.token !== token));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reject invitation');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin h-8 w-8 text-blue-600">
          <ArrowPathIcon className="h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Invitations</h3>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm border-b border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm border-b border-green-200 dark:border-green-800">
          {successMessage}
        </div>
      )}

      {receivedInvitations.length > 0 ? (
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Invitations to join</h4>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {receivedInvitations.map((invitation) => (
              <li key={invitation.id} className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {invitation.organization_name}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Invited by: {invitation.inviter_email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Role: {invitation.role}
                      </p>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        <span>Expires {formatDistanceToNow(new Date(invitation.expires_at))} from now</span>
                      </div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Status: <span className={invitation.status === 'accepted' ? 'text-green-500' : 'text-orange-500'}>
                          {invitation.status}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-0">
                    {invitation.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleReject(invitation.token)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <XMarkIcon className="h-4 w-4 mr-1" />
                          Decline
                        </button>
                        <button
                          onClick={() => handleAccept(invitation.token)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
                        >
                          <CheckIcon className="h-4 w-4 mr-1" />
                          Accept
                        </button>
                      </div>
                    )}
                    {invitation.status === 'accepted' && (
                      <div className="flex items-center text-xs font-medium text-green-500">
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Accepted
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : showReceived && (
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400 text-sm">
          No received invitations
        </div>
      )}

      {showSent && sentInvitations.length > 0 ? (
        <div className="p-5">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Invitations you've sent</h4>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {sentInvitations.map((invitation) => (
              <li key={invitation.id} className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {invitation.organization_name}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Invited: {invitation.invitee_email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Role: {invitation.role}
                      </p>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        <span>Expires {formatDistanceToNow(new Date(invitation.expires_at))} from now</span>
                      </div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Status: <span className={invitation.status === 'accepted' ? 'text-green-500' : 'text-orange-500'}>
                          {invitation.status}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-0">
                    {invitation.status === 'pending' ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                        Pending response
                      </div>
                    ) : (
                      <div className="flex items-center text-xs font-medium text-green-500">
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Accepted
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : showSent && (
        <div className="p-5 text-center text-gray-500 dark:text-gray-400 text-sm">
          No sent invitations
        </div>
      )}
    </div>
  );
} 