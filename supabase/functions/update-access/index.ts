
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CLOUDFLARE_WORKER_URL = "https://gym-access-worker.dimplekumara1.workers.dev";

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
    // 1. Get expired users from profiles
    // We look for users whose plan_expiry_date is in the past and they are not yet marked as essl_blocked
    const { data: expiredUsers, error: fetchError } = await supabase
      .from("profiles")
      .select("id, essl_id, plan_expiry_date, username")
      .lt("plan_expiry_date", new Date().toISOString())
      .eq("essl_blocked", false)
      .not("essl_id", "is", null);

    if (fetchError) {
      console.error("Error fetching expired users:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredUsers?.length || 0} expired users to block via Cloudflare Worker.`);

    const results = [];

    for (const user of (expiredUsers || [])) {
      console.log(`Blocking user ${user.essl_id} (${user.username})...`);
      
      try {
        // 2. Call Cloudflare Worker to block
        const response = await fetch(CLOUDFLARE_WORKER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employee_code: user.essl_id,
            enabled: false,
          }),
        });

        const workerResult = await response.text();
        console.log(`Worker response for ${user.essl_id}:`, workerResult);

        if (response.ok) {
          // 3. Update essl_blocked in Supabase
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ essl_blocked: true })
            .eq("id", user.id);
          
          if (updateError) {
            console.error(`Failed to update DB for ${user.essl_id}:`, updateError);
          }

          results.push({ 
            id: user.id, 
            essl_id: user.essl_id, 
            status: updateError ? "FAILED_DB_UPDATE" : "BLOCKED",
            worker_response: workerResult
          });
        } else {
          console.error(`Worker failed for ${user.essl_id} with status ${response.status}`);
          results.push({ 
            id: user.id, 
            essl_id: user.essl_id, 
            status: "WORKER_ERROR",
            worker_status: response.status,
            worker_response: workerResult
          });
        }
      } catch (err) {
        console.error(`Fetch error for user ${user.essl_id}:`, err);
        results.push({ 
          id: user.id, 
          essl_id: user.essl_id, 
          status: "FETCH_ERROR", 
          error: err.message 
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: expiredUsers?.length || 0,
      results 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
