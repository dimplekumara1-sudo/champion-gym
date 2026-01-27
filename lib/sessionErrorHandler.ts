/**
 * Session Error Recovery Utility
 * Use this in components to handle session-related errors gracefully
 */

import { validateAndRecoverSession } from './supabase';

export class SessionError extends Error {
    constructor(message: string, public readonly isSessionError: boolean = true) {
        super(message);
        this.name = 'SessionError';
    }
}

/**
 * Check if an error is session-related
 */
export const isSessionError = (error: any): boolean => {
    if (!error) return false;

    const message = error?.message?.toLowerCase() || '';
    const status = error?.status;

    return (
        status === 401 ||
        message.includes('session') ||
        message.includes('unauthorized') ||
        message.includes('jwt') ||
        message.includes('expired') ||
        message.includes('invalid token')
    );
};

/**
 * Handle session error with recovery attempt
 */
export const handleSessionError = async (error: any): Promise<boolean> => {
    if (!isSessionError(error)) {
        return false;
    }

    console.warn('Session error detected, attempting recovery...');

    try {
        const session = await validateAndRecoverSession();
        if (session) {
            console.log('Session recovered successfully');
            return true;
        }
    } catch (recoveryError) {
        console.error('Session recovery failed:', recoveryError);
    }

    return false;
};

/**
 * Wrap supabase query with automatic error handling
 * Usage: const result = await withSessionRecovery(() => supabase.from('table').select());
 */
export const withSessionRecovery = async <T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    maxRetries: number = 2
): Promise<{ data: T | null; error: any }> => {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries + 1; attempt++) {
        try {
            const result = await queryFn();

            // If there's an error, check if it's session-related
            if (result.error && isSessionError(result.error)) {
                if (attempt < maxRetries) {
                    const recovered = await handleSessionError(result.error);
                    if (recovered) {
                        continue; // Retry the query
                    }
                }
            }

            return result;
        } catch (error) {
            lastError = error;

            if (isSessionError(error) && attempt < maxRetries) {
                const recovered = await handleSessionError(error);
                if (recovered) {
                    continue; // Retry the query
                }
            }
        }
    }

    return {
        data: null,
        error: lastError || new SessionError('Max retries exceeded')
    };
};

/**
 * Show user-friendly error message based on error type
 */
export const getErrorMessage = (error: any): string => {
    if (!error) return 'An unknown error occurred';

    if (isSessionError(error)) {
        return 'Your session has expired. Please refresh the page.';
    }

    if (typeof error === 'string') {
        return error;
    }

    return error?.message || 'An error occurred. Please try again.';
};
