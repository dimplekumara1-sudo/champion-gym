#!/usr/bin/env node

/**
 * ESSL X990 CGA2/CGA5 Testing & Blocking Script
 * Tests the complete flow of blocking/unblocking users
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://osjvvcbcvlcdmqxczttf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zanZ2Y2JjdmxjZG1xeGN6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODAwMDAwMDAsImV4cCI6MTcwMDAwMDAwMH0.YOUR_ANON_KEY_HERE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function log(msg, type = 'info') {
    const icons = { info: '•', success: '✓', error: '✗', warn: '⚠' };
    console.log(`${icons[type] || '•'} ${msg}`);
}

async function checkUserStatus(esslId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id,username,essl_id,plan_status,plan_expiry_date,essl_blocked,grace_period,device_sync_status,last_synced_at')
            .eq('essl_id', esslId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw error;
        }

        return data;
    } catch (err) {
        console.error(`Error checking ${esslId}:`, err);
        return null;
    }
}

async function checkPendingCommands(esslId) {
    try {
        const { data, error } = await supabase
            .from('essl_commands')
            .select('id,essl_id,command,status,sequence_id,created_at,updated_at')
            .or(`essl_id.eq.${esslId},essl_id.eq.ALL`)
            .in('status', ['pending', 'sent'])
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        return (data || []);
    } catch (err) {
        console.error(`Error checking commands for ${esslId}:`, err);
        return [];
    }
}

async function checkRecentScans(esslId) {
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select(`
        id,
        check_in,
        device_id,
        profiles:user_id(username, essl_id, essl_blocked, plan_status)
      `)
            .eq('profiles.essl_id', esslId)
            .order('check_in', { ascending: false })
            .limit(10);

        if (error) throw error;

        if (!data) return [];

        return data.map((att) => ({
            id: att.id,
            check_in: att.check_in,
            username: att.profiles?.username,
            essl_id: att.profiles?.essl_id,
            essl_blocked: att.profiles?.essl_blocked,
            plan_status: att.profiles?.plan_status,
            device_id: att.device_id
        }));
    } catch (err) {
        console.error(`Error checking scans for ${esslId}:`, err);
        return [];
    }
}

async function blockUser(userId, esslId) {
    try {
        await log(`Blocking user ${esslId}...`, 'info');

        // Queue block commands
        const commands = [
            {
                essl_id: 'ALL',
                command: `DATA UPDATE USER PIN=${esslId} EndDateTime=20260101000000 Group=99`,
                status: 'pending',
                payload: { user_id: userId, reason: 'manual_block', pin: esslId }
            },
            {
                essl_id: 'ALL',
                command: `DATA UPDATE USERINFO PIN=${esslId}\tEnable=0`,
                status: 'pending',
                payload: { user_id: userId, reason: 'manual_block', pin: esslId }
            }
        ];

        const { error: cmdError } = await supabase
            .from('essl_commands')
            .insert(commands);

        if (cmdError) {
            await log(`Failed to queue commands: ${cmdError.message}`, 'error');
            return false;
        }

        // Update profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                essl_blocked: true,
                plan_status: 'expired',
                device_sync_status: 'SYNC_PENDING',
                last_synced_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            await log(`Failed to update profile: ${updateError.message}`, 'error');
            return false;
        }

        await log(`Successfully queued block commands for ${esslId}`, 'success');
        return true;
    } catch (err) {
        await log(`Error blocking user: ${err}`, 'error');
        return false;
    }
}

async function testSync(userId) {
    try {
        await log(`Testing sync via edge function...`, 'info');

        const { data, error } = await supabase.functions.invoke('sync-member-to-device', {
            body: { member_id: userId, action: 'expire' }
        });

        if (error) {
            await log(`Function error: ${error.message}`, 'error');
            return false;
        }

        if (data.success) {
            await log(`Sync successful: ${data.message}`, 'success');
            return true;
        } else {
            await log(`Sync failed: ${data.error}`, 'error');
            return false;
        }
    } catch (err) {
        await log(`Error invoking function: ${err}`, 'error');
        return false;
    }
}

async function main() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║   ESSL X990 Device Testing - CGA2/CGA5 Access Control     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const testUsers = ['CGA2', 'CGA5'];

    for (const esslId of testUsers) {
        console.log(`\n📍 Testing ${esslId}`);
        console.log('─'.repeat(60));

        // Check user status
        const user = await checkUserStatus(esslId);
        if (!user) {
            await log(`User with ESSL ID ${esslId} not found in database`, 'warn');
            continue;
        }

        console.log(`\n👤 User Info:`);
        console.log(`   Username: ${user.username}`);
        console.log(`   User ID: ${user.id}`);
        console.log(`   ESSL ID: ${user.essl_id}`);
        console.log(`   Plan Status: ${user.plan_status}`);
        console.log(`   Plan Expiry: ${user.plan_expiry_date || 'N/A'}`);
        console.log(`   Currently Blocked: ${user.essl_blocked ? '🔒 YES' : '🔓 NO'}`);
        console.log(`   Last Synced: ${user.last_synced_at || 'Never'}`);

        // Check pending commands
        const commands = await checkPendingCommands(esslId);
        console.log(`\n📋 Pending Commands: ${commands.length}`);
        commands.slice(0, 5).forEach(cmd => {
            const statusEmoji = cmd.status === 'pending' ? '⏳' : '📤';
            console.log(`   ${statusEmoji} [${cmd.status}] ${cmd.command.substring(0, 65)}...`);
        });

        // Check recent scans
        const scans = await checkRecentScans(esslId);
        console.log(`\n📸 Recent Scans: ${scans.length}`);
        scans.slice(0, 5).forEach(scan => {
            const whenTime = new Date(scan.check_in).toLocaleTimeString();
            const blockedStatus = scan.essl_blocked ? ' (blocked)' : '';
            console.log(`   • ${whenTime}${blockedStatus}`);
        });

        // DECISION: Should we block this user?
        const shouldBlock = !user.essl_blocked && (user.plan_status === 'expired' || commands.length === 0);

        if (shouldBlock && scans.length > 0) {
            // Wait for recent scan
            const lastScan = new Date(scans[0].check_in);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            if (lastScan > fiveMinutesAgo) {
                console.log(`\n⚠️  Recent scan detected within last 5 minutes!`);
                await log(`User ${esslId} scanned at ${lastScan.toLocaleTimeString()} but is NOT blocked!`, 'warn');

                // Block immediately
                const blocked = await blockUser(user.id, esslId);
                if (blocked) {
                    const synced = await testSync(user.id);
                    if (synced) {
                        await log(`User ${esslId} has been blocked and sync command issued`, 'success');
                    }
                }
            }
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✓ Testing complete\n');
}

main().catch(console.error);
