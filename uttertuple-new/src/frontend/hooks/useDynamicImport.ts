import { useState, useEffect } from 'react';

/**
 * Custom hook for dynamically importing components to improve initial page load performance
 */
function useDynamicImport<T>(importFn: () => Promise<{ default: T }>) {
  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadComponent = async () => {
      try {
        setLoading(true);
        const module = await importFn();
        
        if (mounted) {
          setComponent(module.default);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          console.error('Error loading component:', err);
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadComponent();

    return () => {
      mounted = false;
    };
  }, [importFn]);

  return { Component, loading, error };
}

export default useDynamicImport; 