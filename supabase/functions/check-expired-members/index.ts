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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  try {
    const now = new Date();
    console.log(`Checking for expired members at ${now.toISOString()}`);

    // Fetch global grace period
    const { data: gymSettings } = await supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'gym_settings')
      .single();
    
    const globalGracePeriod = gymSettings?.value?.global_grace_period || 0;
    console.log(`Global grace period: ${globalGracePeriod} days`);

    // Find members whose plan has potentially expired
    // We fetch users where plan_expiry_date is not null
    const { data: members, error } = await supabase
      .from('profiles')
      .select('id, essl_id, plan_expiry_date, plan_status, essl_blocked, grace_period')
      .not('plan_expiry_date', 'is', null)
      .not('essl_id', 'is', null);
    
    if (error) throw error;
    
    const expiredMembers = members.filter(member => {
      const expiryDate = new Date(member.plan_expiry_date);
      const grace = (member.grace_period !== null && member.grace_period !== undefined) 
        ? member.grace_period 
        : globalGracePeriod;
      
      const finalExpiry = new Date(expiryDate);
      finalExpiry.setDate(finalExpiry.getDate() + grace);
      
      // If now is after finalExpiry, the user is TRULY expired
      const isTrulyExpired = now > finalExpiry;

      // Only process if they are truly expired BUT not blocked in DB
      // OR if they are NOT expired but ARE blocked (to unblock them if date was changed)
      if (isTrulyExpired && (!member.essl_blocked || member.plan_status !== 'expired')) {
        return true;
      }
      
      // Handle the reverse: if they are NOT expired but currently blocked, we should UNBLOCK them
      if (!isTrulyExpired && (member.essl_blocked || member.plan_status === 'expired')) {
        return true;
      }

      return false;
    });

    console.log(`Found ${expiredMembers?.length || 0} members needing status update`);
    
    const results = []
    
    for (const member of expiredMembers) {
      const expiryDate = new Date(member.plan_expiry_date);
      const grace = (member.grace_period !== null && member.grace_period !== undefined) 
        ? member.grace_period 
        : globalGracePeriod;
      const finalExpiry = new Date(expiryDate);
      finalExpiry.setDate(finalExpiry.getDate() + grace);
      
      const isTrulyExpired = now > finalExpiry;

      console.log(`Processing member: ${member.id} (essl_id: ${member.essl_id}), Truly Expired: ${isTrulyExpired}`);
      
      try {
        // 1. Update the table status
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            plan_status: isTrulyExpired ? 'expired' : 'active',
            essl_blocked: isTrulyExpired
          })
          .eq('id', member.id);
          
        if (updateError) throw updateError;

        // 2. Trigger device sync
        // If expired, action is 'expire'. If active, action is 'renew' (to unblock/enable)
        const action = isTrulyExpired ? 'expire' : 'renew';
        
        const { data, error: invokeError } = await supabase.functions.invoke('sync-member-to-device', {
          body: {
            member_id: member.id,
            action: action
          }
        })
        
        if (invokeError) throw invokeError
        results.push({ id: member.id, status: 'success', action, data })
      } catch (err) {
        console.error(`Failed to process member ${member.id}:`, err)
        results.push({ id: member.id, status: 'failed', error: err.message })
      }
    }
    
    return new Response(JSON.stringify({
      processed: expiredMembers?.length || 0,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Check expired error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
