/**
 * eSSL ADMS → Supabase Bridge
 * HTTP → HTTPS
 */
export default {
  async fetch(request) {
    const SUPABASE_FUNCTION_URL =
      "https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/essl-attendance";

    try {
      // Clone headers and remove ones that cause issues
      const newHeaders = new Headers(request.headers);
      newHeaders.delete("host");
      newHeaders.delete("content-length");

      const init = {
        method: request.method,
        headers: newHeaders,
      };

      // Only add body for non-GET/HEAD requests
      if (request.method !== "GET" && request.method !== "HEAD") {
        const body = await request.arrayBuffer();
        if (body.byteLength > 0) {
          init.body = body;
        }
      }

      const forwardReq = new Request(SUPABASE_FUNCTION_URL, init);
      const response = await fetch(forwardReq);

      // ADMS devices REQUIRE plain 200 OK
      // We return OK regardless of Supabase response to keep device happy
      return new Response("OK", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    } catch (err) {
      console.error("Worker Error:", err);
      return new Response("OK", { status: 200 }); // Still return OK to device
    }
  },
};
