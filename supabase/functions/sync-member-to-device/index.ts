import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WORKER_URL = 'https://gym.dimplekumara1.workers.dev'
const WORKER_SECRET = Deno.env.get('WORKER_SECRET') || Deno.env.get('INTERNAL_SECRET') || ''

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
      finalExpiryDate.setDate(finalExpiryDate.getDate() + grace);
      
      isTrulyExpired = now > finalExpiryDate;
      
      // Format for eSSL device (YYYYMMDDHHMMSS)
      finalExpiryStr = finalExpiryDate.toISOString().replace(/[- :T]/g, '').slice(0, 14);
      // Ensure it ends with 235959 if only date was provided
      if (finalExpiryStr.endsWith('000000')) {
        finalExpiryStr = finalExpiryStr.slice(0, 8) + '235959';
      }
    }

    // Force block if truly expired, regardless of action
    const shouldBeEnabled = !isTrulyExpired && (action === 'create' || action === 'renew');
    
    // We ALWAYS use /set-user now because we want to send the full state (Group + Enable + EndDateTime)
    // to ensure the device doesn't reset any field.
    const workerEndpoint = '/set-user';
    const payload = {
      employee_code: member.essl_id,
      name: member.full_name || member.username || 'User',
      valid_from: member.plan_start_date || new Date().toISOString(),
      valid_to: finalExpiryStr,
      enabled: shouldBeEnabled
    };

    console.log(`Syncing state: ${shouldBeEnabled ? 'ENABLED' : 'BLOCKED'} (Truly Expired: ${isTrulyExpired})`);

    // Call Cloudflare Worker
    const response = await fetch(`${WORKER_URL}${workerEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WORKER_SECRET,
        'x-internal-secret': WORKER_SECRET
      },
      body: JSON.stringify(payload)
    })
    
    const responseText = await response.text();
    let result;
    try { result = JSON.parse(responseText); } catch (e) { result = { success: response.ok, message: responseText }; }
    
    // Log sync
    await supabase.from('device_sync_logs').insert({
      profile_id: member_id,
      command: action,
      request_payload: payload,
      response_payload: result,
      status: result.success ? 'success' : 'failed',
      error_message: result.error || (response.ok ? null : 'HTTP Error ' + response.status)
    })
    
    // Update profile status in DB
    await supabase
      .from('profiles')
      .update({
        essl_blocked: !shouldBeEnabled,
        plan_status: isTrulyExpired ? 'expired' : (member.plan_status || 'active'),
        device_sync_status: result.success ? 'SYNCED' : 'FAILED',
        last_synced_at: new Date().toISOString()
      })
      .eq('id', member_id)
    
    return new Response(JSON.stringify(result), {
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
