
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// This config bypasses the Supabase Gateway JWT check, 
// allowing us to handle auth internally or via custom headers.
export const config = {
  auth: false,
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WORKER_URL = "https://gym.dimplekumara1.workers.dev";
const INTERNAL_SECRET = Deno.env.get("INTERNAL_SECRET") ?? "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "block-expired") {
      console.log("Checking for expired users...");
      // 1. Find users who are marked as expired but NOT yet blocked on eSSL
      const { data: expiredUsers, error } = await supabase
        .from("profiles")
        .select("id, essl_id, username")
        .eq("plan_status", "expired")
        .eq("essl_blocked", false)
        .not("essl_id", "is", null);

      if (error) {
        console.error("Error fetching expired users:", error);
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log(`Found ${expiredUsers?.length || 0} expired users to block.`);

      const results = [];
      const now = new Date();
      const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
      const blockTime = `${ymd}000000`;

      for (const user of (expiredUsers || [])) {
        console.log(`Blocking user ${user.essl_id} (${user.username})...`);
        
        // 2. Queue block command (Moving to Group 99 for X990)
        const { error: cmdError } = await supabase
          .from("essl_commands")
          .insert({
            essl_id: "ALL",
            command: `DATA UPDATE USER PIN=${user.essl_id} Group=99`,
            status: "pending",
            payload: { user_id: user.id, reason: "plan_expired", pin: user.essl_id }
          });

        if (cmdError) console.error(`Failed to queue block for ${user.essl_id}:`, cmdError);

        // 3. Update essl_blocked flag
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ essl_blocked: true })
          .eq("id", user.id);
        
        results.push({ id: user.id, success: !updateError });
      }

      return new Response(JSON.stringify({ results }), { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "sync-all-expiry") {
      console.log("Syncing all expiry dates to eSSL...");
      const { data: users, error } = await supabase
        .from("profiles")
        .select("id, essl_id, plan_expiry_date")
        .not("essl_id", "is", null)
        .not("plan_expiry_date", "is", null);

      if (error) throw error;

      const commands = users.map(user => {
        const date = new Date(user.plan_expiry_date);
        const yyyymmdd = date.toISOString().split('T')[0].replace(/-/g, '');
        const isExpired = date < new Date();
        const group = isExpired ? 99 : 1;
        
        return {
          essl_id: "ALL",
          command: `DATA UPDATE USER PIN=${user.essl_id} EndDateTime=${yyyymmdd}235959 Group=${group}`,
          status: "pending",
          payload: { user_id: user.id, action: "sync_all_expiry", pin: user.essl_id }
        };
      });

      if (commands.length > 0) {
        const { error: insertError } = await supabase
          .from("essl_commands")
          .insert(commands);
        if (insertError) throw insertError;
      }

      return new Response(JSON.stringify({ success: true, count: commands.length }), { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "unblock-user") {
      const { essl_id, user_id } = body;
      if (!essl_id) return new Response(JSON.stringify({ error: "Missing essl_id" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

      console.log(`Unblocking user ${essl_id} and syncing records...`);

      // 1. Queue command to enable user (Moving to Group 1 for X990)
      await supabase
        .from("essl_commands")
        .insert([
          {
            essl_id: "ALL",
            command: `DATA UPDATE USER PIN=${essl_id} Group=1 EndDateTime=20991231235959`,
            status: "pending",
            payload: { user_id, action: "unblock" }
          },
          {
            essl_id: "ALL",
            command: `DATA QUERY ATTLOG PIN=${essl_id}`,
            status: "pending",
            payload: { user_id, action: "sync_after_renewal" }
          }
        ]);

      // 2. Update status in Supabase
      if (user_id) {
        await supabase
          .from("profiles")
          .update({ 
            plan_status: "active",
            essl_blocked: false 
          })
          .eq("id", user_id);
      }

      return new Response(JSON.stringify({ success: true, message: "Unblock and sync commands queued" }), { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "sync-attendance") {
      const { essl_id, pin } = body;
      console.log(`Manually fetching attendance logs for Device: ${essl_id || 'ALL'}, PIN: ${pin || 'ALL'}...`);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      // Format: YYYY-MM-DD HH:mm:ss (Required by ZKTeco/eSSL protocol)
      const startTime = thirtyDaysAgo.toISOString().split('T')[0] + " 00:00:00";

      const routingId = essl_id || "ALL";
      // If PIN is provided, filter by it. Otherwise fetch all (which includes unknown users).
      const commandBase = pin ? `DATA QUERY ATTLOG PIN=${pin}` : "DATA QUERY ATTLOG";
      const commandHistorical = pin 
        ? `DATA QUERY ATTLOG PIN=${pin} StartTime=${startTime}` 
        : `DATA QUERY ATTLOG StartTime=${startTime}`;

      await supabase
        .from("essl_commands")
        .insert([
          {
            essl_id: routingId,
            command: commandBase,
            status: "pending",
            payload: { action: "manual_sync", pin }
          },
          {
            essl_id: routingId,
            command: commandHistorical,
            status: "pending",
            payload: { action: "historical_sync", pin }
          }
        ]);

      return new Response(JSON.stringify({ success: true, message: "Attendance sync commands queued for all users" }), { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "sync-names") {
      console.log("Triggering user sync from ESSL device...");
      
      // 1. Queue a command for the device to upload all user data
      // 'DATA QUERY User' or 'DATA QUERY Userinfo'
      await supabase
        .from("essl_commands")
        .insert({
          essl_id: "ALL",
          command: "DATA QUERY User",
          status: "pending",
          payload: { action: "sync_all_users" }
        });

      // 2. Fallback to Worker
      const resp = await fetch(`${WORKER_URL}/essl/users/sync`, {
        method: "POST",
        headers: {
          "x-internal-secret": INTERNAL_SECRET
        }
      });
      const text = await resp.text();
      return new Response(text, { 
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    if (action === "delete-user") {
      const { essl_id } = body;
      if (!essl_id) return new Response(JSON.stringify({ error: "Missing essl_id" }), { status: 400, headers: corsHeaders });

      console.log(`Deleting user ${essl_id} from ESSL device...`);
      
      await supabase
        .from("essl_commands")
        .insert({
          essl_id: "ALL",
          command: `DATA DELETE USER PIN=${essl_id}`,
          status: "pending",
          payload: { action: "delete_user" }
        });

      return new Response(JSON.stringify({ success: true, message: "Delete command queued" }), { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "update-user") {
      const { essl_id, name } = body;
      if (!essl_id || !name) return new Response(JSON.stringify({ error: "Missing essl_id or name" }), { status: 400, headers: corsHeaders });

      console.log(`Updating user ${essl_id} (Name: ${name}) on ESSL device...`);
      
      await supabase
        .from("essl_commands")
        .insert({
          essl_id: "ALL",
          command: `DATA UPDATE USER PIN=${essl_id} Name=${name}`,
          status: "pending",
          payload: { action: "update_user" }
        });

      return new Response(JSON.stringify({ success: true, message: "Update command queued" }), { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "device-info") {
      const { essl_id } = body;
      console.log(`Fetching device info for ${essl_id || "ALL"}...`);
      await supabase
        .from("essl_commands")
        .insert({
          essl_id: essl_id || "ALL",
          command: "INFO",
          status: "pending",
          payload: { action: "device_info" }
        });
      return new Response(JSON.stringify({ success: true, message: "INFO command queued" }), { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "get-options") {
      const { essl_id, options } = body;
      const optionsList = options || "Delay,DateTime,TransTimes";
      console.log(`Fetching device options (${optionsList}) for ${essl_id || "ALL"}...`);
      await supabase
        .from("essl_commands")
        .insert({
          essl_id: essl_id || "ALL",
          command: `GET OPTIONS ${optionsList}`,
          status: "pending",
          payload: { action: "get_options" }
        });
      return new Response(JSON.stringify({ success: true, message: "GET OPTIONS command queued" }), { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { 
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
