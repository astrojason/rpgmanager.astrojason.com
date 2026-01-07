import { useState, useEffect } from 'react';
import { authFetch } from '@/utils/authFetch';

/**
 * Custom hook for fetching data from API endpoints
 * Eliminates duplicate data fetching patterns across components
 */
export function useApiData<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await authFetch(endpoint);

        if (!response.ok) {
          throw new Error(`Failed to fetch from ${endpoint}: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error(`Error fetching ${endpoint}:`, err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint]);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authFetch(endpoint);

      if (!response.ok) {
        throw new Error(`Failed to fetch from ${endpoint}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error(`Error refetching ${endpoint}:`, err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch, setData };
}

/**
 * Hook for fetching multiple endpoints in parallel
 */
export function useMultipleApiData<T extends Record<string, string>>(
  endpoints: T
): {
  data: { [K in keyof T]: unknown } | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<{ [K in keyof T]: unknown } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const promises = Object.entries(endpoints).map(async ([key, url]) => {
        const response = await authFetch(url as string);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${key} from ${url}`);
        }
        const result = await response.json();
        return [key, result];
      });

      const results = await Promise.all(promises);
      const dataObj = Object.fromEntries(results) as { [K in keyof T]: unknown };
      setData(dataObj);
    } catch (err) {
      console.error('Error fetching multiple endpoints:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [JSON.stringify(endpoints)]);

  return { data, loading, error, refetch: fetchData };
}
