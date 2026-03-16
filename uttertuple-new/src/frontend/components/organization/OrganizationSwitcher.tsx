'use client';

import { useState, useEffect } from 'react';
import { Organization } from '@/services/config/api';
import Cookies from 'js-cookie';
import { safeStorage } from '@/lib/safeStorage';

interface OrganizationSwitcherProps {
  organizationId: string;
}

/**
 * This is a utility component that handles organization switching
 * by setting the organization ID in both localStorage and cookies,
 * then forcing a page reload to ensure all API calls pick up the new organization.
 */
export default function OrganizationSwitcher({ organizationId }: OrganizationSwitcherProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    const switchOrganization = async () => {
      try {
        console.log('OrganizationSwitcher: Setting organization ID to', organizationId);

        // Set organization ID in localStorage
        safeStorage.setItem('current_organization', organizationId);
        
        // Set organization ID in cookies with various fallbacks
        // Try different paths to ensure it's accessible
        Cookies.set('current_organization', organizationId, { path: '/' });
        
        // Force a full page reload to ensure all API calls use the new organization ID
        console.log('OrganizationSwitcher: Reloading page to apply new organization context');
        window.location.href = '/overview';
      } catch (error) {
        console.error('OrganizationSwitcher: Error switching organizations', error);
      }
    };

    switchOrganization();
  }, [organizationId]);

  return null; // This component doesn't render anything
} 