'use client';

import { useState, useEffect } from 'react';
import { organizationApi, ReceivedInvitation, SentInvitation } from '@/services/config/api';
import { ClockIcon, CheckIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/contexts/ThemeContext';
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
  const { darkMode } = useTheme();

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
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-8`}>
      <div className={`p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Invitations</h3>
      </div>

      {error && (
        <div className={`p-4 ${darkMode ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-50 text-red-700 border-red-200'} text-sm border-b`}>
          {error}
        </div>
      )}

      {successMessage && (
        <div className={`p-4 ${darkMode ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-50 text-green-700 border-green-200'} text-sm border-b`}>
          {successMessage}
        </div>
      )}

      {receivedInvitations.length > 0 ? (
        <div className={`p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>Invitations to join</h4>
          <ul className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {receivedInvitations.map((invitation) => (
              <li key={invitation.id} className="py-4">
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {invitation.organization_name}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Invited by: {invitation.inviter_email}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Role: {invitation.role}
                      </p>
                      <div className={`flex items-center text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <ClockIcon className="h-3 w-3 mr-1" />
                        <span>Expires {formatDistanceToNow(new Date(invitation.expires_at))} from now</span>
                      </div>
                      <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
                          className={`inline-flex items-center px-3 py-1.5 border ${darkMode ? 'border-gray-600' : 'border-gray-300'} text-xs font-medium rounded-md ${darkMode ? 'text-gray-300' : 'text-gray-700'} ${darkMode ? 'bg-gray-700' : 'bg-white'} ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                        >
                          <XMarkIcon className="h-4 w-4 mr-1" />
                          Decline
                        </button>
                        <button
                          onClick={() => handleAccept(invitation.token)}
                          className={`inline-flex items-center px-3 py-1.5 border ${darkMode ? 'border-transparent' : 'border-gray-300'} text-xs font-medium rounded-md ${darkMode ? 'text-white' : 'text-gray-700'} ${darkMode ? 'bg-blue-600' : 'bg-white'} ${darkMode ? 'hover:bg-blue-700' : 'hover:bg-gray-50'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
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
        <div className={`p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'} text-sm`}>
          No received invitations
        </div>
      )}

      {showSent && sentInvitations.length > 0 ? (
        <div className="p-5">
          <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>Invitations you've sent</h4>
          <ul className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {sentInvitations.map((invitation) => (
              <li key={invitation.id} className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {invitation.organization_name}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Invited: {invitation.invitee_email}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Role: {invitation.role}
                      </p>
                      <div className={`flex items-center text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <ClockIcon className="h-3 w-3 mr-1" />
                        <span>Expires {formatDistanceToNow(new Date(invitation.expires_at))} from now</span>
                      </div>
                      <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Status: <span className={invitation.status === 'accepted' ? 'text-green-500' : 'text-orange-500'}>
                          {invitation.status}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-0">
                    {invitation.status === 'pending' ? (
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} italic`}>
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
        <div className={`p-5 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'} text-sm`}>
          No sent invitations
        </div>
      )}
    </div>
  );
} 