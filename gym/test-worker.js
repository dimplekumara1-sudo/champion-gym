// Local test script for Cloudflare Worker logic
import worker from './src/index.js';

// Mocking Global Fetch and Request for local environment
globalThis.Headers = class Headers {
  constructor(init) { this.data = init || {}; }
  delete(key) { delete this.data[key]; }
  set(key, val) { this.data[key] = val; }
  get(key) { return this.data[key]; }
};

globalThis.Request = class Request {
  constructor(url, init) {
    this.url = url;
    this.method = init.method || 'GET';
    this.headers = init.headers;
    this.body = init.body;
  }
  async arrayBuffer() { return this.body || new ArrayBuffer(0); }
};

globalThis.Response = class Response {
  constructor(body, init) {
    this.body = body;
    this.status = init.status;
    this.headers = init.headers;
  }
};

globalThis.fetch = async (req) => {
  console.log('--- Mock Fetch Intercepted ---');
  console.log('Forwarding to:', req.url);
  console.log('Method:', req.method);
  console.log('Headers:', req.headers.data);
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

async function runTest() {
  console.log('Testing Worker Logic...');
  
  const mockRequest = {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json', 'host': 'test.com' }),
    async arrayBuffer() { return new TextEncoder().encode(JSON.stringify({ UserId: '101' })); }
  };

  const response = await worker.fetch(mockRequest);
  
  console.log('--- Worker Response ---');
  console.log('Status:', response.status);
  console.log('Body:', response.body);
}

runTest().catch(console.error);
