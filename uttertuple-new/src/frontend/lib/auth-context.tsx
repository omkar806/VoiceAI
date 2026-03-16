'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authApi, AuthResponse, User, Organization, userApi } from '@/services/config/api';
import Cookies from 'js-cookie';
import { safeStorage } from '@/lib/safeStorage';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentOrganization: Organization | null;
  organizations: Organization[] | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  confirmRegistration: (email: string, code: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  logout: () => void;
  loginWithGoogle: () => Promise<void>;
  setCurrentOrganization: (organizationId: string) => Promise<void>;
  setCurrentOrganizationState: (organization: Organization | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Function to handle auth response and store tokens
  const handleAuthResponse = (response: AuthResponse) => {
    const { access_token, refresh_token, user } = response;
    // Save to localStorage
    safeStorage.setItem('access_token', access_token);
    safeStorage.setItem('refresh_token', refresh_token);
    // Also save to cookies for backward compatibility
    Cookies.set('access_token', access_token);
    Cookies.set('refresh_token', refresh_token);
    
    setUser(user);
    setIsAuthenticated(true);

    // Check for stored organization ID first
    const storedOrgId = safeStorage.getItem('current_organization');
    
    if (storedOrgId && user.organizations) {
      // Try to find the stored organization in user's organizations
      const storedOrg = user.organizations.find(org => org.id === storedOrgId);
      if (storedOrg) {
        // If found, keep using it
        setCurrentOrganizationState(storedOrg);
        return;
      }
    }

    // If no stored org or stored org not found, fall back to default organization
    if (user.organizations && user.organizations.length > 0) {
      const defaultOrg = user.organizations.find(org => org.is_default);
      if (defaultOrg) {
        safeStorage.setItem('current_organization', defaultOrg.id);
        Cookies.set('current_organization', defaultOrg.id);
        setCurrentOrganizationState(defaultOrg);
      } else {
        // Clear any previously stored organization if there's no default
        safeStorage.removeItem('current_organization');
        Cookies.remove('current_organization');
        setCurrentOrganizationState(null);
      }
    } else {
      // Clear any previously stored organization if there are no organizations
      safeStorage.removeItem('current_organization');
      Cookies.remove('current_organization');
      setCurrentOrganizationState(null);
    }
  };

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const token = safeStorage.getItem('access_token');
        const refreshToken = safeStorage.getItem('refresh_token');
        const currentOrgId = safeStorage.getItem('current_organization');
        
        console.log('Auth check - stored organization ID:', currentOrgId);
        
        if (!token || !refreshToken) {
          setIsAuthenticated(false);
          setUser(null);
          setCurrentOrganizationState(null);
          setIsLoading(false);
          return;
        }
        
        // Try to refresh the token and get fresh user data
        try {
          const response = await authApi.refresh({ refresh_token: refreshToken });
          const { access_token, refresh_token: newRefreshToken, user: freshUser } = response;
          
          // Store the fresh tokens
          safeStorage.setItem('access_token', access_token);
          safeStorage.setItem('refresh_token', newRefreshToken);
          Cookies.set('access_token', access_token);
          Cookies.set('refresh_token', newRefreshToken);
          
          setUser(freshUser);
          setIsAuthenticated(true);
          
          // Set current organization based on stored ID or fallback to default
          if (currentOrgId && freshUser.organizations) {
            console.log('Found stored org ID:', currentOrgId);
            console.log('User organizations:', freshUser.organizations);
            
            const org = freshUser.organizations.find(o => o.id === currentOrgId);
            if (org) {
              console.log('Setting current organization from stored ID:', org);
              setCurrentOrganizationState(org);
            } else {
              console.log('Organization not found in user organizations, falling back to default');
              // Organization not found, try to use default
              const defaultOrg = freshUser.organizations.find(o => o.is_default);
              if (defaultOrg) {
                safeStorage.setItem('current_organization', defaultOrg.id);
                Cookies.set('current_organization', defaultOrg.id);
                setCurrentOrganizationState(defaultOrg);
              } else {
                // No default org, clear stored ID
                safeStorage.removeItem('current_organization');
                Cookies.remove('current_organization');
                setCurrentOrganizationState(null);
              }
            }
          } else if (freshUser.organizations && freshUser.organizations.length > 0) {
            // No stored org ID, use default or first available
            const defaultOrg = freshUser.organizations.find(o => o.is_default) || freshUser.organizations[0];
            safeStorage.setItem('current_organization', defaultOrg.id);
            Cookies.set('current_organization', defaultOrg.id);
            setCurrentOrganizationState(defaultOrg);
            console.log('No stored org, set to default:', defaultOrg);
          } else {
            // No organizations available
            safeStorage.removeItem('current_organization');
            Cookies.remove('current_organization');
            setCurrentOrganizationState(null);
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          // If refresh fails, log the user out
          safeStorage.removeItem('access_token');
          safeStorage.removeItem('refresh_token');
          safeStorage.removeItem('current_organization');
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          Cookies.remove('current_organization');
          setIsAuthenticated(false);
          setUser(null);
          setCurrentOrganizationState(null);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsLoading(false);
        setIsAuthenticated(false);
        setUser(null);
        setCurrentOrganizationState(null);
      }
    };

    checkAuth();
  }, []);

  // Check if we should update user API with new organization
  useEffect(() => {
    // Only update the backend after initial load
    if (!isLoading && currentOrganization) {
      console.log('Current organization updated in context, ID:', currentOrganization.id);
    }
  }, [currentOrganization, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/confirm';
      const isOrgPage = pathname === '/organizations';
      const isRootPage = pathname === '/';
      
      if (!isAuthenticated && !isAuthPage) {
        router.push('/login');
      } else if (isAuthenticated && !currentOrganization && !isOrgPage) {
        // Force navigation to organization selection if authenticated but no org is selected
        router.push('/organizations');
      } else if (isAuthenticated && (isAuthPage || isRootPage)) {
        if (currentOrganization) {
          // Redirect to the overview page when authenticated
          router.push('/overview');
        } else {
          router.push('/organizations');
        }
      }
    }
  }, [isAuthenticated, isLoading, currentOrganization, pathname, router]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      handleAuthResponse(response);
      
      // After login, check if user has an organization
      if (response.user.organizations && response.user.organizations.length > 0) {
        const defaultOrg = response.user.organizations.find(org => org.is_default);
        
        if (defaultOrg) {
          // If there is a default org, set it
          safeStorage.setItem('current_organization', defaultOrg.id);
          Cookies.set('current_organization', defaultOrg.id);
          setCurrentOrganizationState(defaultOrg);
          // Rather than navigating directly to home, always go to org selection first
          router.push('/organizations');
        } else {
          // If no default org, go to org selection page
          safeStorage.removeItem('current_organization');
          Cookies.remove('current_organization');
          setCurrentOrganizationState(null);
          router.push('/organizations');
        }
      } else {
        // If no organizations, go to org creation/selection page
        safeStorage.removeItem('current_organization');
        Cookies.remove('current_organization');
        setCurrentOrganizationState(null);
        router.push('/organizations');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      await authApi.register({ email, password });
      router.push('/confirm?email=' + encodeURIComponent(email));
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const confirmRegistration = async (email: string, confirmation_code: string) => {
    try {
      await authApi.confirm({ email, confirmation_code });
      router.push('/login');
    } catch (error) {
      console.error('Confirmation failed:', error);
      throw error;
    }
  };

  const resendConfirmation = async (email: string) => {
    try {
      await authApi.resendConfirmation({ email });
    } catch (error) {
      console.error('Resend confirmation failed:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { url } = await authApi.getGoogleAuthUrl();
      window.location.href = url;
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    }
  };

  const setCurrentOrganization = async (organizationId: string) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const org = user.organizations.find(o => o.id === organizationId);
      if (!org) {
        throw new Error('Organization not found');
      }
      
      console.log('Setting organization with ID:', organizationId);
      
      // Update local storage and cookies
      safeStorage.setItem('current_organization', organizationId);
      Cookies.set('current_organization', organizationId);
      
      // Update React state
      setCurrentOrganizationState(org);
      
      return;
    } catch (error) {
      console.error('Failed to set organization:', error);
      throw error;
    }
  };

  const logout = () => {
    safeStorage.removeItem('access_token');
    safeStorage.removeItem('refresh_token');
    safeStorage.removeItem('current_organization');
    // Also clear cookies for backward compatibility
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    Cookies.remove('current_organization');
    
    setIsAuthenticated(false);
    setUser(null);
    setCurrentOrganizationState(null);
    router.push('/login');
  };

  // Show nothing while checking authentication
  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        currentOrganization,
        organizations: user?.organizations || null,
        login,
        register,
        confirmRegistration,
        resendConfirmation,
        logout,
        loginWithGoogle,
        setCurrentOrganization,
        setCurrentOrganizationState
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}