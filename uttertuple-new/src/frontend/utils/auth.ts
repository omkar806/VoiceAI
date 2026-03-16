import { safeStorage } from '@/lib/safeStorage';

/**
 * Get the auth token from localStorage
 * @returns The auth token or null if not found
 */
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return safeStorage.getItem('token');
};

/**
 * Set the auth token in localStorage
 * @param token The auth token to store
 */
export const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  safeStorage.setItem('token', token);
  safeStorage.setItem('isAuthenticated', 'true');
};

/**
 * Remove the auth token from localStorage
 */
export const removeToken = (): void => {
  if (typeof window === 'undefined') return;
  safeStorage.removeItem('token');
  safeStorage.removeItem('isAuthenticated');
};

/**
 * Check if the user is authenticated
 * @returns True if the user is authenticated
 */
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return safeStorage.getItem('isAuthenticated') === 'true';
}; 