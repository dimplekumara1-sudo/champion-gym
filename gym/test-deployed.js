#!/usr/bin/env node
/**
 * Test script for Cloudflare Worker
 * Tests the worker endpoints locally and against deployed instance
 */

const http = require('http');
const https = require('https');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function testResult(name, passed, details = '') {
    const icon = passed ? '✓' : '✗';
    const color = passed ? 'green' : 'red';
    log(`  ${icon} ${name}`, color);
    if (details) {
        log(`    ${details}`, 'gray');
    }
}

async function runTests() {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('Cloudflare Worker Test Suite', 'cyan');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

    const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'test-secret-12345';
    const WORKER_URL = process.env.WORKER_URL || 'https://gym-access-worker.yourname.workers.dev';

    // Test 1: Block User Endpoint
    log('Test 1: Block User Endpoint', 'cyan');
    try {
        const result = await testBlockUser(WORKER_URL, INTERNAL_SECRET);
        testResult('POST /essl/users/block', result.success, result.message);
    } catch (e) {
        testResult('POST /essl/users/block', false, `Error: ${e.message}`);
    }

    // Test 2: Unblock User Endpoint
    log('\nTest 2: Unblock User Endpoint', 'cyan');
    try {
        const result = await testUnblockUser(WORKER_URL, INTERNAL_SECRET);
        testResult('POST /essl/users/unblock', result.success, result.message);
    } catch (e) {
        testResult('POST /essl/users/unblock', false, `Error: ${e.message}`);
    }

    // Test 3: Sync Users Endpoint
    log('\nTest 3: Sync Users Endpoint', 'cyan');
    try {
        const result = await testSyncUsers(WORKER_URL, INTERNAL_SECRET);
        testResult('GET /essl/users/sync', result.success, result.message);
    } catch (e) {
        testResult('GET /essl/users/sync', false, `Error: ${e.message}`);
    }

    // Test 4: Authentication
    log('\nTest 4: Authentication', 'cyan');
    try {
        const result = await testAuthFailure(WORKER_URL);
        testResult('Missing secret header returns 401', result.success, result.message);
    } catch (e) {
        testResult('Missing secret header returns 401', false, `Error: ${e.message}`);
    }

    // Test 5: CORS Headers
    log('\nTest 5: CORS Headers', 'cyan');
    try {
        const result = await testCORS(WORKER_URL);
        testResult('CORS headers present', result.success, result.message);
    } catch (e) {
        testResult('CORS headers present', false, `Error: ${e.message}`);
    }

    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('Test suite completed\n', 'cyan');

    log('Configuration Check:', 'cyan');
    log(`  Worker URL: ${WORKER_URL.startsWith('https') ? '✓' : '✗'} ${WORKER_URL}`, 'gray');
    log(`  Internal Secret: ${INTERNAL_SECRET.length > 0 ? '✓' : '✗'} (set)`, 'gray');
    log('\n');
}

async function testBlockUser(url, secret) {
    const payload = JSON.stringify({ essl_id: 'TEST_CGA8' });
    const response = await makeRequest(url, '/essl/users/block', 'POST', secret, payload);

    if (response.status === 200) {
        return { success: true, message: 'Response 200' };
    } else if (response.status === 503) {
        return { success: false, message: 'Service key not configured - configure SUPABASE_SERVICE_ROLE_KEY' };
    } else if (response.status === 401) {
        return { success: false, message: 'Unauthorized - check INTERNAL_SECRET' };
    } else {
        return { success: false, message: `Response ${response.status}` };
    }
}

async function testUnblockUser(url, secret) {
    const payload = JSON.stringify({ essl_id: 'TEST_CGA8' });
    const response = await makeRequest(url, '/essl/users/unblock', 'POST', secret, payload);

    if (response.status === 200) {
        return { success: true, message: 'Response 200' };
    } else if (response.status === 503) {
        return { success: false, message: 'Service key not configured' };
    } else {
        return { success: false, message: `Response ${response.status}` };
    }
}

async function testSyncUsers(url, secret) {
    const response = await makeRequest(url, '/essl/users/sync', 'GET', secret);

    if (response.status === 200) {
        return { success: true, message: 'Response 200' };
    } else if (response.status === 503) {
        return { success: false, message: 'Service key not configured' };
    } else {
        return { success: false, message: `Response ${response.status}` };
    }
}

async function testAuthFailure(url) {
    const payload = JSON.stringify({ essl_id: 'TEST_CGA8' });
    const response = await makeRequest(url, '/essl/users/block', 'POST', '', payload);

    if (response.status === 401) {
        return { success: true, message: 'Correctly rejected unauthorized request' };
    } else {
        return { success: false, message: `Expected 401, got ${response.status}` };
    }
}

async function testCORS(url) {
    const response = await makeRequest(url, '/essl/users/block', 'OPTIONS', 'test-secret');

    const headers = response.headers;
    if (headers['access-control-allow-origin'] && headers['access-control-allow-methods']) {
        return { success: true, message: 'CORS headers present' };
    } else {
        return { success: false, message: 'CORS headers missing' };
    }
}

function makeRequest(baseUrl, path, method, secret, body = null) {
    return new Promise((resolve, reject) => {
        try {
            const url = new URL(baseUrl + path);
            const isHttps = url.protocol === 'https:';
            const client = isHttps ? https : http;

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(secret && { 'x-internal-secret': secret })
                }
            };

            if (body) {
                options.headers['Content-Length'] = Buffer.byteLength(body);
            }

            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                });
            });

            req.on('error', reject);
            if (body) req.write(body);
            req.end();
        } catch (e) {
            reject(e);
        }
    });
}

// Run tests
runTests().catch(error => {
    log('\nTest Error:', 'red');
    log(error.message, 'red');
    process.exit(1);
});
