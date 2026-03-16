import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronDown,
  Home,
  Users, 
  GitBranch, 
  Database,
  MessageSquare, 
  FileText, 
  Settings, 
  LogOut,
  Building,
  Check,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { useTheme } from '../../contexts/ThemeContext';
import { organizationApi, userApi, storeTokensWithTimestamp } from '@/services/config/api';
import { safeStorage } from '@/lib/safeStorage';
import Sidebar from './Sidebar';

// Main navigation layout with authentication check
interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, user, setCurrentOrganization, currentOrganization } = useAuth();
  const { isDarkMode, toggleTheme, darkMode } = useTheme();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [userProfileMenuOpen, setUserProfileMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [switchingOrganization, setSwitchingOrganization] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check authentication and redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Load organizations when user is available and profile menu opens
  useEffect(() => {
    if (user && (profileMenuOpen || userProfileMenuOpen)) {
      loadOrganizations();
    }
  }, [user, profileMenuOpen, userProfileMenuOpen]);

  const loadOrganizations = async () => {
    try {
      setLoadingOrganizations(true);
      const orgsData = await organizationApi.getAllOrganizations();
      setOrganizations(orgsData);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoadingOrganizations(false);
    }
  };

  const switchOrganization = async (organizationId: string) => {
    try {
      setSwitchingOrganization(organizationId);
      
      // Find the organization being switched to
      const targetOrg = user?.organizations?.find(org => org.id === organizationId);
      if (!targetOrg) {
        throw new Error('Organization not found');
      }
      
      console.log(`Switching to organization: ${targetOrg.name} (${organizationId})`);
      
      // Use the auth context method to switch organization
      await setCurrentOrganization(organizationId);
      
      // Provide user feedback
      console.log(`Successfully switched to organization: ${targetOrg.name}`);
      
      // Close the dropdown with a small delay for visual feedback
      setTimeout(() => {
        setProfileMenuOpen(false);
      }, 500);
      
      // Reload the page to ensure all components get fresh data with new org context
      setTimeout(() => {
        window.location.reload();
      }, 800);
      
    } catch (error) {
      console.error('Failed to switch organization:', error);
      setSwitchingOrganization(null);
      // You could add a toast notification here for error feedback
    }
  };

  // Memoize organization avatar/logo
  const getOrganizationAvatar = useCallback((organization: any) => {
    // For now, we'll use the first letter of the organization name
    // In the future, this could be enhanced to use actual logo images
    return organization?.name?.charAt(0)?.toUpperCase() || 'O';
  }, []);

  // Memoize navigation items to prevent unnecessary re-renders
  const navigationItems = useMemo(() => [
    { href: '/', icon: <Home className="h-5 w-5" />, label: 'Dashboard' },
    { href: '/agents', icon: <Users className="h-5 w-5" />, label: 'Agents' },
    { href: '/workflows', icon: <GitBranch className="h-5 w-5" />, label: 'Workflows' },
    { href: '/rag', icon: <Database className="h-5 w-5" />, label: 'RAG' },
    { href: '/chatbots', icon: <MessageSquare className="h-5 w-5" />, label: 'Chatbots' },
    { href: '/forms', icon: <FileText className="h-5 w-5" />, label: 'Forms' },
  ], []);

  // Use callbacks for event handlers to prevent unnecessary re-renders
  const toggleProfileMenu = useCallback(() => {
    setProfileMenuOpen(prev => !prev);
    setUserProfileMenuOpen(false); // Close user profile menu when org menu opens
  }, []);

  const toggleUserProfileMenu = useCallback(() => {
    setUserProfileMenuOpen(prev => !prev);
    setProfileMenuOpen(false); // Close org menu when user profile menu opens
  }, []);

  const closeProfileMenu = useCallback(() => {
    setProfileMenuOpen(false);
  }, []);

  const closeUserProfileMenu = useCallback(() => {
    setUserProfileMenuOpen(false);
  }, []);

  const handleSidebarExpandChange = useCallback((isExpanded: boolean) => {
    setSidebarExpanded(isExpanded);
  }, []);

  // Memoize user initials
  const userInitials = useMemo(() => {
    if (!user) return 'U';
    
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    } else if (user.first_name) {
      return user.first_name[0].toUpperCase();
    } else if (user.email) {
      return user.email[0].toUpperCase();
    }
    
    return 'U';
  }, [user]);

  // Get current organization from auth context (this should always be fresh)
  const currentOrgFromContext = useMemo(() => {
    return currentOrganization;
  }, [currentOrganization]);

  // Memoize organization display information using fresh context data
  const organizationInfo = useMemo(() => {
    console.log('Computing organizationInfo with currentOrgFromContext:', currentOrgFromContext);
    
    if (!currentOrgFromContext) {
      console.log('No current organization found in context');
      return null;
    }
    
    const info = {
      avatar: getOrganizationAvatar(currentOrgFromContext),
      name: currentOrgFromContext.name,
      description: currentOrgFromContext.description || 'Default organization',
      isDefault: currentOrgFromContext.is_default,
      role: currentOrgFromContext.role
    };
    
    console.log('Organization info computed:', info);
    return info;
  }, [currentOrgFromContext, getOrganizationAvatar]);

  // Debug: Log when organization changes
  useEffect(() => {
    console.log('=== Organization State Debug ===');
    console.log('currentOrganization from context:', currentOrganization);
    console.log('user?.current_organization:', user?.current_organization);
    console.log('localStorage current_organization:', safeStorage.getItem('current_organization'));
    console.log('organizationInfo:', organizationInfo);
    console.log('================================');
  }, [currentOrganization, user?.current_organization, organizationInfo]);

  // Don't render anything until client-side hydration is complete
  // and authentication check is done
  if (!mounted) {
    return (
      <div className={`flex h-screen items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${darkMode ? 'border-blue-400' : 'border-blue-600'}`}></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex h-screen items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${darkMode ? 'border-blue-400' : 'border-blue-600'}`}></div>
      </div>
    );
  }

  // If not authenticated, don't render the layout
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`flex h-screen theme-transition ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-neutral-900'}`}>
      {/* Sidebar */}
      <Sidebar onExpandChange={handleSidebarExpandChange}  />
      
      {/* Main content */}
      <div 
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{ marginLeft: sidebarExpanded ? '280px' : '80px' }}
      >
        {/* Header with user info */}
        <header className={`h-16 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-neutral-200'} border-b flex items-center justify-between`}
          style={{ paddingLeft: sidebarExpanded ? '24px' : '104px', paddingRight: '24px' }}
        >
          {/* Organization Selector - Left side */}
          <div className="flex items-center">
            {currentOrgFromContext && (
              <div className="relative">
                <button 
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    darkMode 
                      ? 'hover:bg-gray-800 text-white' 
                      : 'hover:bg-gray-100 text-gray-900'
                  }`}
                  onClick={toggleProfileMenu}
                >
                  <div className={`w-8 h-8 rounded-lg ${
                    darkMode ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-emerald-600 to-teal-700'
                  } flex items-center justify-center shadow-lg`}>
                    <span className="text-white font-bold text-sm">
                      {getOrganizationAvatar(currentOrgFromContext)}
                    </span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {currentOrgFromContext.name}
                    </span>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Switch organization
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                    profileMenuOpen ? 'rotate-180' : ''
                  } ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>

                {/* Organization Selector Dropdown */}
                {profileMenuOpen && (
                  <div className={`absolute left-0 top-full mt-2 w-80 rounded-xl shadow-xl border backdrop-blur-sm z-50 
                    ${darkMode 
                      ? 'bg-gray-800/95 border-gray-700 shadow-2xl shadow-black/20' 
                      : 'bg-white/95 border-neutral-200 shadow-2xl shadow-gray-500/20'
                    }`}
                    style={{
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                    }}
                  >
                    {/* Header */}
                    <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-neutral-200'}`}>
                      <div className={`text-xs font-medium uppercase tracking-wide ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        YOUR ORGANIZATIONS
                      </div>
                      {loadingOrganizations && (
                        <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mt-2 ${
                          darkMode ? 'border-gray-400' : 'border-gray-600'
                        }`}></div>
                      )}
                    </div>
                    
                    {/* Organizations List */}
                    <div className="max-h-64 overflow-y-auto p-2">
                      {(organizations.length > 0 ? organizations : user?.organizations || []).map((org) => {
                        const isCurrentOrg = org.id === currentOrgFromContext?.id;
                        const isSwitching = switchingOrganization === org.id;
                        const orgAvatar = getOrganizationAvatar(org);
                        
                        return (
                          <button
                            key={org.id}
                            onClick={() => !isCurrentOrg && !isSwitching && switchOrganization(org.id)}
                            disabled={isSwitching}
                            className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all duration-300 ${
                              isCurrentOrg
                                ? darkMode
                                  ? 'bg-blue-500/20 text-blue-300 cursor-default ring-1 ring-blue-500/30'
                                  : 'bg-blue-50 text-blue-700 cursor-default ring-1 ring-blue-200'
                                : darkMode
                                ? 'hover:bg-gray-700 text-gray-300 hover:scale-[1.02]'
                                : 'hover:bg-gray-50 text-gray-700 hover:scale-[1.02]'
                            } ${isSwitching ? 'opacity-50 cursor-not-allowed animate-pulse' : ''}`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                              isCurrentOrg
                                ? darkMode ? 'bg-blue-500 shadow-lg' : 'bg-blue-600 shadow-lg'
                                : darkMode ? 'bg-gray-600' : 'bg-gray-300'
                            }`}>
                              {isCurrentOrg ? (
                                <Check className="w-4 h-4 text-white" />
                              ) : (
                                <span className="text-white font-bold text-sm">
                                  {orgAvatar}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium text-sm truncate ${
                                isCurrentOrg && darkMode ? 'text-blue-200' : ''
                              }`}>
                                {org.name}
                                {isCurrentOrg && (
                                  <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                                    darkMode ? 'bg-blue-600/30 text-blue-200' : 'bg-blue-200 text-blue-800'
                                  }`}>
                                    Current
                                  </span>
                                )}
                              </div>
                              <div className={`text-xs truncate ${
                                darkMode ? 'text-gray-500' : 'text-gray-500'
                              }`}>
                                {org.role} • {org.description || 'No description'}
                              </div>
                            </div>
                            {isSwitching && (
                              <div className="flex items-center space-x-2">
                                <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                                  darkMode ? 'border-blue-400' : 'border-blue-600'
                                }`}></div>
                                <span className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                  Switching...
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Add New Organization Button */}
                    <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-neutral-200'}`}>
                      <Link href="/organizations" className="block">
                        <button className={`w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          darkMode 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}>
                          <Building className="w-4 h-4" />
                          <span>Manage Organizations</span>
                        </button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right side - Theme toggle and User profile */}
          <div className="flex items-center space-x-4">
            {/* Theme toggle */}
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-full ${
                darkMode 
                  ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                  : 'bg-neutral-100 text-gray-600 hover:bg-neutral-200'
              } transition-colors`}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* User profile menu */}
            <div className="relative">
              <button 
                className="flex items-center focus:outline-none group" 
                onClick={toggleUserProfileMenu}
              >
                <div className={`h-8 w-8 rounded-full ${
                  darkMode 
                    ? 'bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 text-white shadow-lg' 
                    : 'bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-600 text-white shadow-lg'
                  } flex items-center justify-center font-medium relative overflow-hidden
                  transform transition-all duration-300 ease-out
                  group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-blue-500/25
                  ${userProfileMenuOpen ? 'scale-110 shadow-xl ring-2 ring-blue-400/50' : ''}
                  before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 
                  group-hover:before:opacity-100 before:transition-opacity before:duration-300
                  after:absolute after:inset-0 after:bg-gradient-to-tr after:from-transparent after:via-white/10 after:to-white/20
                  after:translate-x-[-100%] after:translate-y-[-100%] after:transition-transform after:duration-700
                  group-hover:after:translate-x-0 group-hover:after:translate-y-0`}
                >
                  <span className="relative z-10 transform transition-transform duration-300 group-hover:scale-110">
                    {userInitials}
                  </span>
                  
                  {/* Pulse ring animation */}
                  <div className={`absolute inset-0 rounded-full ${
                    darkMode ? 'bg-blue-400' : 'bg-blue-500'
                  } opacity-0 group-hover:opacity-20 animate-ping`}></div>
                  
                  {/* Rotating border */}
                  <div className={`absolute inset-[-2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300
                    bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-spin-slow`}
                    style={{ animation: userProfileMenuOpen ? 'spin 3s linear infinite' : 'none' }}
                  ></div>
                </div>
              </button>
              
              {/* User Profile Dropdown */}
              <div className={`absolute right-0 mt-2 w-80 rounded-xl shadow-xl border backdrop-blur-sm z-50 
                transition-all duration-700 ease-bounce-in origin-top-right
                ${userProfileMenuOpen 
                  ? 'opacity-100 scale-100 translate-y-0 visible pointer-events-auto' 
                  : 'opacity-0 scale-90 -translate-y-4 invisible pointer-events-none'
                }
                ${darkMode 
                  ? 'bg-gray-800/95 border-gray-700 shadow-2xl shadow-black/20' 
                  : 'bg-white/95 border-neutral-200 shadow-2xl shadow-gray-500/20'
                }`}
                style={{
                  transformOrigin: 'top right',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  transition: userProfileMenuOpen 
                    ? 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' 
                    : 'all 0.3s cubic-bezier(0.4, 0, 1, 1)',
                }}
              >
                {/* Animated border glow */}
                <div className={`absolute inset-0 rounded-xl transition-all duration-500 ${
                  userProfileMenuOpen 
                    ? 'shadow-lg shadow-blue-500/10' 
                    : 'shadow-none'
                }`}></div>
                
                {/* User Info Section */}
                <div className={`p-4 border-b transition-all duration-500 delay-150 ${
                  darkMode ? 'border-gray-700' : 'border-neutral-200'
                } ${userProfileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-[-15px] opacity-0'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`h-12 w-12 rounded-full ${
                      darkMode 
                        ? 'bg-gradient-to-br from-blue-400 to-purple-500 text-white' 
                        : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                    } flex items-center justify-center font-semibold text-lg`}>
                      {userInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {user?.first_name && user?.last_name 
                          ? `${user.first_name} ${user.last_name}`
                          : user?.email?.split('@')[0] || 'User'
                        }
                        <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                          darkMode
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {currentOrgFromContext?.role || 'member'}
                        </span>
                      </div>
                      <div className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {user?.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Organization Section with Buttons */}
                {organizationInfo && (
                  <div className={`px-4 py-3 border-b transition-all duration-500 delay-300 ${
                    darkMode ? 'border-gray-700' : 'border-neutral-200'
                  } ${userProfileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-[-15px] opacity-0'}`}>
                    <div className={`text-xs font-medium uppercase tracking-wide mb-3 ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      CURRENT ORGANIZATION
                    </div>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${
                        darkMode ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-emerald-600 to-teal-700'
                      } flex items-center justify-center shadow-lg`}>
                        <span className="text-white font-bold text-sm">
                          {organizationInfo.avatar}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {organizationInfo.name}
                          <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${
                            organizationInfo.isDefault
                              ? darkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                              : darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {organizationInfo.isDefault ? 'Default' : 'Custom'}
                          </span>
                        </div>
                        <div className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {organizationInfo.description}
                        </div>
                      </div>
                    </div>
                    
                    {/* Organization Action Buttons */}
                    <div className="flex space-x-3">
                      <Link href="/organizations" className="flex-1">
                        <button className={`w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          darkMode 
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}>
                          <Settings className="w-4 h-4" />
                          <span>Org Settings</span>
                        </button>
                      </Link>
                      
                      <Link href={`/organizations/${currentOrgFromContext?.id}/settings`} className="flex-1">
                        <button className={`w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          darkMode 
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}>
                          <Users className="w-4 h-4" />
                          <span>Members</span>
                        </button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Sign Out Button */}
                <div className={`p-4 transition-all duration-500 delay-600 ${
                  userProfileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-[-15px] opacity-0'
                }`}>
                  <button 
                    onClick={logout}
                    className={`flex items-center justify-center space-x-3 px-3 py-2 rounded-lg text-sm w-full transition-colors ${
                      darkMode 
                        ? 'text-red-400 hover:bg-red-500/10' 
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <div className={`flex-1 overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="page-container">
          {children}
          </div>
        </div>
      </div>
      
      {/* Overlay to capture clicks outside of dropdowns */}
      {(profileMenuOpen || userProfileMenuOpen) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            closeProfileMenu();
            closeUserProfileMenu();
          }}
        />
      )}
    </div>
  );
};

export default React.memo(MainLayout); 