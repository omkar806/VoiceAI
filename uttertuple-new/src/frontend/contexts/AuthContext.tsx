import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import authService, { UserProfile, SignupData } from '../services/auth';

// Context type definitions
interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, fullName: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  refreshUserProfile: () => Promise<void>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  error: null,
  refreshUserProfile: async () => {},
});

// Context provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          setIsAuthenticated(true);
          
          // Try to fetch user profile
          try {
            const userProfile = await authService.getUserProfile();
            setUser(userProfile);
          } catch (error) {
            console.error('Failed to fetch user profile:', error);
            // If we can't fetch the profile, logout
            authService.logout();
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Refresh user profile data
  const refreshUserProfile = async () => {
    if (!isAuthenticated) return;
    
    try {
      const userProfile = await authService.getUserProfile();
      setUser(userProfile);
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await authService.login({ username: email, password });
      setIsAuthenticated(true);
      
      // Fetch user profile after login
      const userProfile = await authService.getUserProfile();
      setUser(userProfile);
      
      // Redirect to dashboard
      router.push('/');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Extract error message
      let errorMessage = 'Invalid email or password';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message && error.message.includes('Network Error')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Signup function
  const signup = async (email: string, fullName: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const userData: SignupData = {
        email,
        full_name: fullName,
        password,
      };
      
      await authService.signup(userData);
      
      // Redirect to login page with registered=true query param
      router.push('/auth/login?registered=true');
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Extract error message
      let errorMessage = 'Registration failed. Please try again.';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    router.push('/auth/login');
  };

  // Provide auth context to children
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        login,
        signup,
        logout,
        error,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export default AuthContext; 