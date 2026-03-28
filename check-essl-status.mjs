#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://osjvvcbcvlcdmqxczttf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zanZ2Y2JjdmxjZG1xeGN6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODAwMDAwMDAsImV4cCI6MTcwMDAwMDAwMH0.YOUR_ANON_KEY_HERE';

async function checkUserStatus(esslId) {
    console.log(`\n✓ Checking ${esslId}...`);

    // Check profiles table
    const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?essl_id=eq.${esslId}&select=id,username,essl_id,essl_blocked,plan_status,plan_expiry_date`,
        {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            }
        }
    );

    const users = await resp.json();

    if (users.length === 0) {
        console.log(`  ❌ User with ESSL ID ${esslId} NOT FOUND in database`);
        return;
    }

    const user = users[0];
    console.log(`  Username: ${user.username}`);
    console.log(`  ESSL ID: ${user.essl_id}`);
    console.log(`  Plan Status: ${user.plan_status}`);
    console.log(`  Plan Expiry: ${user.plan_expiry_date}`);
    console.log(`  ESSL Blocked: ${user.essl_blocked}`);

    // Check for pending commands
    const cmdResp = await fetch(
        `${SUPABASE_URL}/rest/v1/essl_commands?status=eq.pending&command=like.%${esslId}%&select=*`,
        {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            }
        }
    );

    const commands = await cmdResp.json();
    console.log(`  Pending Commands: ${commands.length}`);
    commands.slice(0, 3).forEach(cmd => {
        console.log(`    - ${cmd.command.substring(0, 80)}...`);
    });

    // Check attendance logs
    const attResp = await fetch(
        `${SUPABASE_URL}/rest/v1/attendance?raw_data->EmployeeCode=eq.${esslId}&select=*&order=created_at.desc&limit=5`,
        {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            }
        }
    );

    const attendance = await attResp.json();
    console.log(`  Recent Scans: ${attendance.length}`);
    attendance.forEach(att => {
        console.log(`    - ${att.check_in ? '✓ IN' : '  '} at ${new Date(att.created_at).toLocaleString()}`);
    });
}

(async () => {
    console.log('=== ESSL User Status Check ===');
    console.log('Checking for users: CGA2, CGA5');

    await checkUserStatus('CGA2');
    await checkUserStatus('CGA5');

    console.log('\n=== Pending Commands (All) ===');
    const cmdResp = await fetch(
        `${SUPABASE_URL}/rest/v1/essl_commands?status=eq.pending&select=*&order=created_at.desc&limit=10`,
        {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            }
        }
    );

    const commands = await cmdResp.json();
    console.log(`\nTotal pending commands: ${commands.length}`);
    commands.forEach(cmd => {
        console.log(`  - [${cmd.essl_id}] ${cmd.command.substring(0, 70)}...`);
    });
})().catch(console.error);
