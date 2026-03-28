import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://osjvvcbcvlcdmqxczttf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zanZ2Y2JjdmxjZG1xeGN6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODAwMDAwMDAsImV4cCI6MTcwMDAwMDAwMH0.YOUR_ANON_KEY_HERE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testBlockUser() {
    console.log('Testing user blocking for CGA2...\n');

    // User ID for CGA2
    const userId = 'c4dad036-f9f8-4c34-9358-4a7b344dfaea';

    console.log(`1. Fetching current user status...`);
    const { data: user, error: fetchError } = await supabase
        .from('profiles')
        .select('id, username, essl_id, plan_expiry_date, essl_blocked, plan_status')
        .eq('id', userId)
        .single();

    if (fetchError) {
        console.error('Error fetching user:', fetchError.message);
        return;
    }

    console.log(`User: ${user.username || 'Unknown'}`);
    console.log(`ESSL ID: ${user.essl_id}`);
    console.log(`Plan Expiry: ${user.plan_expiry_date}`);
    console.log(`Currently Blocked: ${user.essl_blocked}`);
    console.log(`Plan Status: ${user.plan_status}\n`);

    console.log(`2. Invoking sync-member-to-device with action='expire'...`);
    const { data, error } = await supabase.functions.invoke('sync-member-to-device', {
        body: { member_id: userId, action: 'expire' }
    });

    if (error) {
        console.error('Error calling function:', error.message);
        return;
    }

    console.log(`Response:`, JSON.stringify(data, null, 2));

    console.log(`\n3. Checking updated user status...`);
    const { data: updatedUser, error: refetchError } = await supabase
        .from('profiles')
        .select('essl_blocked, plan_status, device_sync_status, last_synced_at')
        .eq('id', userId)
        .single();

    if (refetchError) {
        console.error('Error refetching user:', refetchError.message);
        return;
    }

    console.log(`Updated Status:`);
    console.log(`  - essl_blocked: ${updatedUser.essl_blocked}`);
    console.log(`  - plan_status: ${updatedUser.plan_status}`);
    console.log(`  - device_sync_status: ${updatedUser.device_sync_status}`);
    console.log(`  - last_synced_at: ${updatedUser.last_synced_at}\n`);

    console.log(`4. Checking device_sync_logs...`);
    const { data: logs, error: logError } = await supabase
        .from('device_sync_logs')
        .select('command, status, request_payload')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!logError && logs) {
        console.log(`Latest sync log:`);
        console.log(`  - Command: ${logs.command}`);
        console.log(`  - Status: ${logs.status}`);
        console.log(`  - Payload:`, JSON.stringify(logs.request_payload, null, 2));
    }

    console.log(`\n✓ Test complete!`);
}

testBlockUser().catch(err => console.error('Fatal error:', err));
