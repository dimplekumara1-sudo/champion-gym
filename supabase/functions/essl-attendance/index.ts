
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
    const contentType = req.headers.get("content-type") || "";
    let payload: any = {};
    const rawData = await req.text();
    console.log("Raw Payload from Device:", rawData);

    if (!rawData || rawData.trim() === "") {
      console.log("Empty body received");
      return new Response("OK", { headers: { "Content-Type": "text/plain" } });
    }

    if (contentType.includes("application/json")) {
      try {
        payload = JSON.parse(rawData);
      } catch (e) {
        console.error("Failed to parse JSON, trying form-urlencoded");
        const params = new URLSearchParams(rawData);
        payload = Object.fromEntries(params);
      }
    } else {
      // ADMS devices often send data as Text/Form Data
      const params = new URLSearchParams(rawData);
      payload = Object.fromEntries(params);
    }

    console.log("Parsed payload:", payload);

    // eSSL/ADMS raw tab-separated data parsing
    // Format: "UserID\tTimestamp\tStatus\tVerifyType\t..."
    if (rawData.includes("\t")) {
      const lines = rawData.trim().split('\n');
      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          const esslUserId = parts[0].trim();
          const logTime = parts[1].trim();
          console.log(`Parsed TSV Data - User: ${esslUserId}, Time: ${logTime}`);
          
          // Map to payload object for consistent processing
          payload.UserId = esslUserId;
          payload.LogTime = logTime;
          break; // Process first valid line
        }
      }
    }

    // eSSL/ADMS payload mapping
    // ADMS uses 'ID' or 'PIN' or 'EmployeeCode'
    const esslUserId = payload.EmployeeCode || payload.UserId || payload.userId || payload.ID || payload.PIN;
    const logTime = payload.LogTime || payload.timestamp || payload.Time || new Date().toISOString();
    const deviceId = payload.DeviceId || payload.device_id || payload.SN || "UNKNOWN";
    const status = payload.Status || "IN"; 

    if (!esslUserId) {
      console.error("No UserId found in payload:", payload);
      // For ADMS, we should still return OK to prevent retries if it's a heartbeat/ping
      if (rawData.includes("INFO") || rawData.includes("Registry")) {
        return new Response("OK", { headers: { "Content-Type": "text/plain" } });
      }
      return new Response("ERROR: No UserId provided", { 
        status: 400,
        headers: { "Content-Type": "text/plain" }
      });
    }

    // Find the user in our profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("essl_id", esslUserId.toString())
      .single();

    if (profileError || !profile) {
      console.warn(`User with eSSL ID ${esslUserId} not found in profiles:`, profileError?.message || "Not found");
    }

    console.log(`Inserting attendance for user_id: ${profile?.id || 'NULL'} (eSSL ID: ${esslUserId})`);

    // Insert into attendance table
    const { data: insertData, error: attendanceError } = await supabase.from("attendance").insert({
      user_id: profile?.id || null,
      check_in: logTime,
      device_id: deviceId,
      raw_data: payload,
    }).select();

    if (attendanceError) {
      console.error("Database Insert Error:", attendanceError);
      throw attendanceError;
    }

    console.log("Successfully inserted attendance record:", insertData);

    // ADMS REQUIREMENT: You MUST return "OK" for the device to stop retrying
    return new Response("OK", { 
      status: 200, 
      headers: { "Content-Type": "text/plain" } 
    });
  } catch (error) {
    console.error("Error processing attendance:", error);
    return new Response("ERROR", { 
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
});
