/**
 * eSSL ADMS -> Supabase Bridge & Controller
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    const SUPABASE_URL = env.SUPABASE_URL || "https://osjvvcbcvlcdmqxczttf.supabase.co";
    const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    const INTERNAL_SECRET = env.INTERNAL_SECRET;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PATCH, DELETE",
    };

    if (method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    // 1. Handle API Endpoints (from Supabase/Admin)
    if (url.pathname.startsWith("/essl/users/")) {
      const auth = request.headers.get("x-internal-secret");
      if (!INTERNAL_SECRET || auth !== INTERNAL_SECRET) {
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
      }

      if (url.pathname === "/essl/users/sync") {
        try {
          const result = await queueCommand(SUPABASE_URL, SUPABASE_SERVICE_KEY, "ALL", "DATA QUERY User");
          return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (err) {
          return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
        }
      }

      if (url.pathname === "/essl/users/block") {
        const body = await request.json();
        if (!body.essl_id) return new Response("Missing essl_id", { status: 400, headers: corsHeaders });
        try {
          const result = await queueCommand(SUPABASE_URL, SUPABASE_SERVICE_KEY, body.essl_id, `DATA UPDATE USERINFO PIN=${body.essl_id} Privilege=14`);
          return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (err) {
          return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
        }
      }

      if (url.pathname === "/essl/users/unblock") {
        const body = await request.json();
        if (!body.essl_id) return new Response("Missing essl_id", { status: 400, headers: corsHeaders });
        try {
          const result = await queueCommand(SUPABASE_URL, SUPABASE_SERVICE_KEY, body.essl_id, `DATA UPDATE USERINFO PIN=${body.essl_id} Privilege=0`);
          return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (err) {
          return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
        }
      }
    }

    // 2. Handle ESSL Device Requests
    const sn = url.searchParams.get("SN") || url.searchParams.get("sn");
    let deviceBody = null;
    
    // Handshake
    if (url.pathname === "/iclock/cdata" && method === "GET") {
      return new Response(`GET OPTION FROM: ${sn || "UNKNOWN"}\nStamp=9999\nOpStamp=0\nPhotoStamp=0\nErrorDelay=60\nDelay=30\nTransTimes=00:00;\nTransInterval=1\nTransFlag=1111000000\nRealtime=1\nEncrypt=0\n`, { 
        headers: { ...corsHeaders, "Content-Type": "text/plain" } 
      });
    }

    // Device polling for commands
    if (url.pathname === "/iclock/getrequest" && method === "GET") {
      const commands = await fetchPendingCommands(SUPABASE_URL, SUPABASE_SERVICE_KEY, sn);
      return new Response(commands, { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
    }

    // Device reporting command result or data upload
    if (url.pathname.startsWith("/iclock/devicecmd") || (url.pathname === "/iclock/cdata" && method === "POST")) {
      deviceBody = await request.text();
      
      // If it's a command result (ID=...&Return=...)
      if (deviceBody.includes("ID=") && deviceBody.includes("Return=")) {
        await updateCommandStatus(SUPABASE_URL, SUPABASE_SERVICE_KEY, deviceBody);
        return new Response("OK", { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
      }
      
      // Otherwise it might be attendance logs, will be forwarded below
    }

    // Default: Forward to Supabase Function
    let targetFunction = "essl-attendance";
    if (url.pathname.includes("management") || url.pathname.includes("essl-management")) {
      targetFunction = "essl-management";
    }

    const SUPABASE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/${targetFunction}`;
    
    try {
      const newHeaders = new Headers(request.headers);
      newHeaders.delete("host");
      newHeaders.delete("content-length");

      const init = {
        method: method,
        headers: newHeaders,
      };

      if (method !== "GET" && method !== "HEAD") {
        if (deviceBody !== null) {
          init.body = deviceBody;
        } else {
          const body = await request.arrayBuffer();
          if (body.byteLength > 0) {
            init.body = body;
          }
        }
      }

      const forwardReq = new Request(SUPABASE_FUNCTION_URL + url.search, init);
      const response = await fetch(forwardReq);
      
      const responseHeaders = new Headers(response.headers);
      Object.keys(corsHeaders).forEach(key => responseHeaders.set(key, corsHeaders[key]));

      // If it's a device request, always return OK to keep it happy
      if (sn && response.status !== 200) {
        return new Response("OK", { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "text/plain" } 
        });
      }
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    } catch (err) {
      console.error("Worker Error:", err);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }
  },
};

async function queueCommand(url, key, essl_id, commandText) {
  const resp = await fetch(`${url}/rest/v1/essl_commands`, {
    method: "POST",
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify({
      essl_id: essl_id,
      command: commandText,
      status: "pending"
    })
  });
  
  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(errorText);
  }
  
  return { success: true };
}

async function fetchPendingCommands(url, key, sn) {
  // Use SN to filter if available, also include 'ALL' for broadcast commands
  const snFilter = sn ? `&or=(essl_id.eq.${sn},essl_id.eq.ALL)` : "";
  const resp = await fetch(`${url}/rest/v1/essl_commands?status=eq.pending${snFilter}&select=id,sequence_id,command&order=created_at.asc&limit=10`, {
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`
    }
  });
  
  if (!resp.ok) return "OK";
  
  const commands = await resp.json();
  if (!commands || commands.length === 0) return "OK";
  
  let responseText = "";
  for (const cmd of commands) {
    // Format: C:ID:COMMAND\n
    // Use sequence_id as it's numeric and compatible with device expectations
    responseText += `C:${cmd.sequence_id}:${cmd.command}\n`;
    
    // Mark as sent
    await fetch(`${url}/rest/v1/essl_commands?id=eq.${cmd.id}`, {
      method: "PATCH",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        status: "sent", 
        updated_at: new Date().toISOString() 
      })
    });
  }
  
  return responseText;
}

async function updateCommandStatus(url, key, body) {
  // Body format: ID=cmd_id&Return=0
  const params = new URLSearchParams(body.replace(/\s+/g, '&'));
  const id = params.get("ID");
  const ret = params.get("Return");
  
  if (id) {
    // Try updating by sequence_id first as that's what we send to the device
    await fetch(`${url}/rest/v1/essl_commands?sequence_id=eq.${id}`, {
      method: "PATCH",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        status: ret === "0" ? "completed" : "failed",
        updated_at: new Date().toISOString() 
      })
    });
  }
}
