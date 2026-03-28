import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { member_id, action } = await req.json()
    console.log(`Sync request - Member: ${member_id}, Action: ${action}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get member data
    const { data: member, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', member_id)
      .single()

    if (error) throw error
    if (!member.essl_id) {
      throw new Error('Member does not have an essl_id')
    }

    // Fetch global grace period
    const { data: gymSettings } = await supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'gym_settings')
      .single();
    const globalGracePeriod = gymSettings?.value?.global_grace_period || 0;

    // Calculate if truly expired (Plan + Grace Period)
    const now = new Date();
    let isTrulyExpired = false;
    let finalExpiryStr = '20991231235959';

    if (member.plan_expiry_date) {
      const expiryDate = new Date(member.plan_expiry_date);
      const grace = (member.grace_period !== null && member.grace_period !== undefined)
        ? member.grace_period
        : globalGracePeriod;

      const finalExpiryDate = new Date(expiryDate);
      // Add grace days
      finalExpiryDate.setDate(finalExpiryDate.getDate() + grace);
      // Set to absolute end of day (23:59:59)
      finalExpiryDate.setHours(23, 59, 59, 999);

      isTrulyExpired = now > finalExpiryDate;

      // Format for eSSL device (YYYYMMDDHHMMSS)
      // We use the date part from finalExpiryDate and hardcode 235959 to be safe
      const y = finalExpiryDate.getFullYear();
      const m = String(finalExpiryDate.getMonth() + 1).padStart(2, '0');
      const d = String(finalExpiryDate.getDate()).padStart(2, '0');
      finalExpiryStr = `${y}${m}${d}235959`;
    }

    // Action takes priority: 'expire' always blocks, 'create'/'renew' always enable
    // This ensures that explicit renewal actions enable the user, regardless of expiry date
    const shouldBeEnabled = action !== 'expire';

    // Queue ESSL device commands directly instead of relying on Cloudflare Worker
    const commands = [];

    if (shouldBeEnabled) {
      // Enable user: Group=1 (active group), Enable=1, set future valid_to date
      commands.push({
        essl_id: 'ALL',
        command: `DATA UPDATE USER PIN=${member.essl_id} EndDateTime=${finalExpiryStr} Group=1`,
        status: 'pending',
        payload: { user_id: member_id, action: action, reason: 'user_enabled' }
      });
      commands.push({
        essl_id: 'ALL',
        command: `DATA UPDATE USERINFO PIN=${member.essl_id}\tEnable=1`,
        status: 'pending',
        payload: { user_id: member_id, action: action, reason: 'user_enabled' }
      });
    } else {
      // Block user: Group=99 (restricted group), Enable=0, set past end date
      commands.push({
        essl_id: 'ALL',
        command: `DATA UPDATE USER PIN=${member.essl_id} EndDateTime=20260101000000 Group=99`,
        status: 'pending',
        payload: { user_id: member_id, action: action, reason: 'user_expired_or_blocked' }
      });
      commands.push({
        essl_id: 'ALL',
        command: `DATA UPDATE USERINFO PIN=${member.essl_id}\tEnable=0`,
        status: 'pending',
        payload: { user_id: member_id, action: action, reason: 'user_expired_or_blocked' }
      });
    }

    // Insert commands into essl_commands table
    const { error: cmdInsertError } = await supabase
      .from('essl_commands')
      .insert(commands);

    const result = cmdInsertError
      ? { success: false, error: cmdInsertError.message }
      : { success: true, message: 'Commands queued', commands_count: commands.length };

    // Log sync
    if (result.success) {
      await Promise.all([
        supabase.from('device_sync_logs').insert({
          profile_id: member_id,
          command: action,
          request_payload: {
            essl_id: member.essl_id,
            should_enable: shouldBeEnabled,
            commands_queued: commands.length
          },
          response_payload: result,
          status: 'success',
          error_message: null
        }),
        // Update profile status in DB
        supabase
          .from('profiles')
          .update({
            essl_blocked: !shouldBeEnabled,
            plan_status: isTrulyExpired ? 'expired' : (member.plan_status || 'active'),
            device_sync_status: 'SYNCED',
            last_synced_at: new Date().toISOString()
          })
          .eq('id', member_id)
      ]);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
