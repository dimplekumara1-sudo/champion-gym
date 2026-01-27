
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://osjvvcbcvlcdmqxczttf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zanZ2Y2JjdmxjZG1xeGN6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMzUwODUsImV4cCI6MjA4NDgxMTA4NX0.JOEgHNtro1H6pk0Hm0j8PBPAR8QOuUEQfBY2mSQ3mVY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit'
    },
    global: {
        headers: {
            'x-client-info': 'supabase-js-web'
        }
    }
});

// Session validation and recovery mechanism
let isRecovering = false;

export const validateAndRecoverSession = async () => {
    try {
        if (isRecovering) return;

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.error('Session validation error:', error);
            isRecovering = true;

            // Attempt to refresh the session
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
                console.error('Session refresh failed:', refreshError);
                // Clear invalid session
                await supabase.auth.signOut();
            }
            isRecovering = false;
        }

        return session;
    } catch (error) {
        console.error('Session recovery error:', error);
        isRecovering = false;
        return null;
    }
};

// Setup auto-refresh interval
setInterval(() => {
    validateAndRecoverSession();
}, 60000); // Refresh every minute
