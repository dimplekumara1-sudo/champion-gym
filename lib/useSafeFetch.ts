import { useState, useCallback, useEffect } from 'react';
import { safeFetch, validateSession } from './sessionService';

/**
 * Custom hook for safe data fetching with automatic session recovery
 * Handles session validation and retries on auth failures
 */
export const useSafeFetch = <T,>(
    fetchFn: () => Promise<T>,
    dependencies: any[] = [],
    autoFetch: boolean = true
) => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const fetch = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Validate session before fetch
            const isSessionValid = await validateSession();
            if (!isSessionValid) {
                throw new Error('Session invalid. Please refresh the page.');
            }

            // Use safe fetch with automatic retry on session errors
            const result = await safeFetch(fetchFn, 2);
            setData(result);
            setRetryCount(0);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            console.error('Safe fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, [fetchFn]);

    useEffect(() => {
        if (autoFetch) {
            fetch();
        }
    }, dependencies);

    const retry = useCallback(async () => {
        setRetryCount(prev => prev + 1);
        await fetch();
    }, [fetch]);

    return {
        data,
        loading,
        error,
        fetch,
        retry,
        retryCount
    };
};

/**
 * Custom hook for safe mutations with session validation
 */
export const useSafeMutation = <T,>(
    mutateFn: () => Promise<T>
) => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Validate session before mutation
            const isSessionValid = await validateSession();
            if (!isSessionValid) {
                throw new Error('Session invalid. Please refresh the page.');
            }

            // Use safe fetch with automatic retry
            const result = await safeFetch(mutateFn, 2);
            setData(result);
            return result;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            console.error('Safe mutation error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [mutateFn]);

    return {
        data,
        loading,
        error,
        mutate
    };
};
