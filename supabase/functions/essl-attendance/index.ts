
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Received eSSL payload:", payload);

    // eSSL payload mapping (standardize these keys based on your specific device config)
    const esslUserId = payload.UserId || payload.userId || payload.ID;
    const logTime = payload.LogTime || payload.timestamp || new Date().toISOString();
    const deviceId = payload.DeviceId || payload.device_id || "UNKNOWN";
    const status = payload.Status || "IN"; // Default to check-in

    if (!esslUserId) {
      return new Response(JSON.stringify({ error: "No UserId provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the user in our profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("essl_id", esslUserId.toString())
      .single();

    if (profileError || !profile) {
      console.warn(`User with eSSL ID ${esslUserId} not found in profiles`);
      // We still log it but without a user_id mapping for debugging
    }

    // Insert into attendance table
    const { error: attendanceError } = await supabase.from("attendance").insert({
      user_id: profile?.id || null,
      check_in: status === "IN" ? logTime : null,
      check_out: status === "OUT" ? logTime : null,
      device_id: deviceId,
      raw_data: payload,
    });

    if (attendanceError) {
      throw attendanceError;
    }

    return new Response(JSON.stringify({ success: true, message: "Attendance logged" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing attendance:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
