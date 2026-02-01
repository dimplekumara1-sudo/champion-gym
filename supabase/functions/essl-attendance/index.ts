
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sn = url.searchParams.get("SN") || "";
    
    // 1. Handle ADMS GET Request (Command Polling)
    if (req.method === "GET") {
      console.log(`GET Request from Device (SN: ${sn})`);
      
      // Fetch pending commands for this device or broadcast commands
      const { data: commands, error: cmdError } = await supabase
        .from("essl_commands")
        .select("id, sequence_id, command")
        .eq("status", "pending")
        .or(`essl_id.eq.${sn},essl_id.eq.ALL`)
        .order("created_at", { ascending: true })
        .limit(10);

      if (cmdError) {
        console.error("Error fetching commands:", cmdError);
        return new Response("OK", { headers: { "Content-Type": "text/plain" } });
      }

      if (commands && commands.length > 0) {
        let responseText = "";
        for (const cmd of commands) {
          // Format: C:ID:COMMAND
          // Use sequence_id as it's numeric and compatible with device expectations
          responseText += `C:${cmd.sequence_id}:${cmd.command}\n`;
          
          // Mark command as sent
          await supabase
            .from("essl_commands")
            .update({ status: "sent", updated_at: new Date().toISOString() })
            .eq("id", cmd.id);
        }
        console.log(`Sending ${commands.length} commands to device:`, responseText);
        return new Response(responseText, { headers: { "Content-Type": "text/plain" } });
      }

      return new Response("OK", { headers: { "Content-Type": "text/plain" } });
    }

    // 2. Handle ADMS POST Request (Data Upload or Command Result)
    const table = url.searchParams.get("table") || "";
    const rawData = await req.text();
    
    if (!rawData || rawData.trim().length === 0) {
      console.log(`Empty body received from SN: ${sn}, Table: ${table}`);
      return new Response("OK", { headers: { "Content-Type": "text/plain" } });
    }

    console.log(`Processing payload from SN: ${sn}, Table: ${table}, Size: ${rawData.length} chars`);
    
    const lines = rawData.trim().split("\n");
    let processedCount = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      try {
        // A. Handle OPLOG / OPERLOG
        if (trimmedLine.startsWith("OPLOG") || table.toLowerCase().includes("oplog") || table.toLowerCase().includes("operlog")) {
          await handleOperLog(trimmedLine, sn);
        } 
        // B. Handle Command Result
        else if (trimmedLine.includes("ID=") && trimmedLine.includes("Return=")) {
          await handleCommandResult(trimmedLine);
        }
        // C. Handle User Sync
        else if (table === "user" || (trimmedLine.includes("PIN=") && trimmedLine.includes("Name="))) {
          await handleUserSync(trimmedLine);
        }
        // D. Handle Attendance (ATTLOG)
        else {
          await handleAttendance(trimmedLine, sn);
        }
        processedCount++;
      } catch (lineError) {
        console.error(`Error processing line: ${trimmedLine}`, lineError);
      }
    }

    console.log(`Successfully processed ${processedCount}/${lines.length} lines from SN: ${sn}`);
    return new Response("OK", { headers: { "Content-Type": "text/plain" } });

  } catch (error) {
    console.error("Critical error in essl-attendance:", error);
    return new Response("OK", { headers: { "Content-Type": "text/plain" } }); // Always return OK to device to avoid retry loops
  }
});

async function handleOperLog(line: string, sn: string) {
  // OPLOG Format: OPLOG <UserID/PIN> <EventCode> <Time> <P1> <P2> <P3> <P4>
  const cleanLine = line.replace("OPLOG", "").trim();
  const parts = cleanLine.split(/\s+/); // Handle both tabs and spaces
  
  if (parts.length >= 3) {
    const esslUserId = parts[0].trim();
    const eventCode = parts[1].trim();
    const logTime = `${parts[2].trim()} ${parts[3].trim()}`; // Date and Time are usually space-separated
    
    if (esslUserId && esslUserId !== "0") {
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("essl_id", esslUserId)
        .eq("check_in", logTime)
        .eq("device_id", sn || "UNKNOWN")
        .maybeSingle();

      if (existing) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("essl_id", esslUserId)
        .maybeSingle();

      await supabase.from("attendance").insert({
        user_id: profile?.id || null,
        essl_id: esslUserId,
        check_in: logTime,
        device_id: sn || "UNKNOWN",
        raw_data: { 
          raw_line: line, 
          event_code: eventCode, 
          type: "operational_log",
          known_user: !!profile 
        },
      });
    }
  }
}

async function handleCommandResult(line: string) {
  const params = new URLSearchParams(line.replace(/\s+/g, "&"));
  const cmdId = params.get("ID");
  const returnCode = params.get("Return");
  
  if (cmdId) {
    // 1. Try updating by sequence_id (numeric ID sent to device)
    const { data: updatedBySeq } = await supabase
      .from("essl_commands")
      .update({ 
        status: returnCode === "0" ? "completed" : "failed",
        updated_at: new Date().toISOString()
      })
      .eq("sequence_id", cmdId)
      .select("id")
      .maybeSingle();

    if (updatedBySeq) return;

    // 2. Fallback to UUID if necessary (for older logic compatibility)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(cmdId)) return;

    await supabase
      .from("essl_commands")
      .update({ 
        status: returnCode === "0" ? "completed" : "failed",
        updated_at: new Date().toISOString()
      })
      .eq("id", cmdId);
  }
}

async function handleUserSync(line: string) {
  // Try tab first, then fall back to multiple spaces
  let parts = line.split('\t');
  if (parts.length <= 1) parts = line.split(/\s{2,}/);
  if (parts.length <= 1) parts = line.split(' ');

  const userMap: any = {};
  for (const part of parts) {
    if (part.includes('=')) {
      const [key, value] = part.split('=');
      if (key && value) userMap[key.trim()] = value.trim();
    }
  }

  const esslId = userMap.PIN || userMap.EmployeeCode || userMap.UserID;
  const name = userMap.Name;

  if (esslId && name) {
    await supabase
      .from("profiles")
      .update({ username: name })
      .eq("essl_id", esslId.toString());
  }
}

async function handleAttendance(line: string, sn: string) {
  let esslUserId = "";
  let logTime = "";
  let recordPayload: any = { raw_line: line };

  if (line.includes("=")) {
    // Key=Value format - usually tab separated
    let parts = line.split('\t');
    if (parts.length <= 1) parts = line.split(/\s{2,}/); // fallback to multiple spaces
    
    for (const part of parts) {
      if (part.includes('=')) {
        const [k, v] = part.split('=');
        const key = k.trim();
        const val = v.trim();
        if (["PIN", "UserID", "EmployeeCode"].includes(key)) esslUserId = val;
        if (["Time", "LogTime"].includes(key)) logTime = val;
        if (key) recordPayload[key] = val;
      }
    }
  } else {
    // Tab/Space separated format
    let parts = line.split('\t');
    if (parts.length <= 1) parts = line.split(/\s+/);
    
    if (parts.length >= 2) {
      esslUserId = parts[0].trim();
      // Date and Time might be separate parts or one part
      if (parts[2] && (parts[2].includes(":") || parts[2].match(/^\d{2}:\d{2}:\d{2}$/))) {
        logTime = `${parts[1].trim()} ${parts[2].trim()}`;
      } else {
        logTime = parts[1].trim();
      }
    }
  }

  if (esslUserId && logTime) {
    const { data: existing } = await supabase
      .from("attendance")
      .select("id")
      .eq("essl_id", esslUserId.toString())
      .eq("check_in", logTime)
      .eq("device_id", sn || "UNKNOWN")
      .maybeSingle();

    if (existing) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("essl_id", esslUserId.toString())
      .maybeSingle();

    await supabase.from("attendance").insert({
      user_id: profile?.id || null,
      essl_id: esslUserId.toString(),
      check_in: logTime,
      device_id: sn || "UNKNOWN",
      raw_data: { ...recordPayload, known_user: !!profile },
    });
  }
}

