import { supabase, validateAndRecoverSession } from './supabase';

/**
 * Session Service
 * Handles session validation, recovery, and data integrity
 * Prevents data loss due to session expiry or auth failures
 */

interface SessionState {
    isValid: boolean;
    lastValidated: number;
    userId?: string;
    sessionToken?: string;
}

let sessionState: SessionState = {
    isValid: false,
    lastValidated: 0
};

const SESSION_VALIDATION_INTERVAL = 30000; // Validate every 30 seconds
const SESSION_CACHE_DURATION = 5000; // Cache validation for 5 seconds
let validationTimeout: NodeJS.Timeout | null = null;

/**
 * Validates current session and recovers if necessary
 */
export const validateSession = async (): Promise<boolean> => {
    try {
        const now = Date.now();

        // Return cached result if recently validated
        if (
            sessionState.isValid &&
            now - sessionState.lastValidated < SESSION_CACHE_DURATION
        ) {
            return true;
        }

        const session = await validateAndRecoverSession();

        if (session) {
            sessionState = {
                isValid: true,
                lastValidated: now,
                userId: session.user.id,
                sessionToken: session.access_token
            };
            return true;
        } else {
            sessionState = {
                isValid: false,
                lastValidated: now
            };
            return false;
        }
    } catch (error) {
        console.error('Session validation error:', error);
        sessionState = {
            isValid: false,
            lastValidated: Date.now()
        };
        return false;
    }
};

/**
 * Gets current session with validation
 */
export const getValidSession = async () => {
    const isValid = await validateSession();
    if (!isValid) {
        throw new Error('Session invalid or expired');
    }

    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

/**
 * Safely fetches data with automatic session recovery on failure
 */
export const safeFetch = async <T>(
    fetchFn: () => Promise<T>,
    retries = 2
): Promise<T> => {
    let lastError: any;

    for (let attempt = 0; attempt < retries + 1; attempt++) {
        try {
            // Validate session before fetch
            const session = await getValidSession();
            if (!session) {
                throw new Error('No valid session');
            }

            return await fetchFn();
        } catch (error: any) {
            lastError = error;

            // Check if this is a session-related error
            const isSessionError =
                error?.message?.includes('session') ||
                error?.message?.includes('unauthorized') ||
                error?.status === 401 ||
                error?.message?.includes('JWT');

            if (isSessionError && attempt < retries) {
                console.warn(`Session error on attempt ${attempt + 1}, attempting recovery...`);

                // Try to recover
                try {
                    await validateAndRecoverSession();
                    // Wait a bit before retry
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                } catch (recoveryError) {
                    console.error('Session recovery failed:', recoveryError);
                }
            }

            if (attempt === retries) {
                throw lastError;
            }
        }
    }

    throw lastError;
};

/**
 * Monitors session health and triggers recovery if needed
 */
export const startSessionMonitoring = () => {
    if (validationTimeout) {
        clearInterval(validationTimeout);
    }

    validationTimeout = setInterval(async () => {
        try {
            const isValid = await validateSession();
            if (!isValid) {
                console.warn('Session validation failed, attempting recovery...');
                await validateAndRecoverSession();
            }
        } catch (error) {
            console.error('Session monitoring error:', error);
        }
    }, SESSION_VALIDATION_INTERVAL);
};

/**
 * Stops session monitoring
 */
export const stopSessionMonitoring = () => {
    if (validationTimeout) {
        clearInterval(validationTimeout);
        validationTimeout = null;
    }
};

/**
 * Force refresh session
 */
export const forceSessionRefresh = async (): Promise<boolean> => {
    try {
        sessionState = {
            isValid: false,
            lastValidated: 0
        };

        const session = await validateAndRecoverSession();
        return !!session;
    } catch (error) {
        console.error('Force refresh failed:', error);
        return false;
    }
};

/**
 * Get session state for debugging
 */
export const getSessionState = (): SessionState => {
    return { ...sessionState };
};

/**
 * Clear session state (e.g., on logout)
 */
export const clearSessionState = () => {
    sessionState = {
        isValid: false,
        lastValidated: 0
    };
    stopSessionMonitoring();
};

// Setup monitoring on module load
startSessionMonitoring();
