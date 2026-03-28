#!/usr/bin/env python3

import requests
from dotenv import load_dotenv
import os
import json

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

print(f"Testing Supabase REST API")
print(f"URL: {SUPABASE_URL}")
print(f"Key type: {type(SUPABASE_KEY)}")
print(f"Key length: {len(SUPABASE_KEY) if SUPABASE_KEY else 'None'}")
print(f"Key starts with: {SUPABASE_KEY[:30] if SUPABASE_KEY else 'None'}...")

# Build request
endpoint = f'{SUPABASE_URL}/rest/v1/essl_commands?limit=1'
headers = {
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,  # Also try the apikey header
}

print(f"\nEndpoint: {endpoint}")
print(f"Headers:")
for k, v in headers.items():
    if k == 'Authorization' or k == 'apikey':
        print(f"  {k}: {v[:50]}...")
    else:
        print(f"  {k}: {v}")

# Make request
try:
    resp = requests.get(endpoint, headers=headers, timeout=10)
    print(f"\nStatus Code: {resp.status_code}")
    print(f"Response Headers: {dict(resp.headers)}")
    print(f"Response Body: {resp.text}")
    
    if resp.status_code == 200:
        print("\n✓ SUCCESS!")
        data = resp.json()
        print(f"Data: {json.dumps(data, indent=2)[:200]}...")
    else:
        print(f"\n✗ FAILED - Status {resp.status_code}")
except Exception as e:
    print(f"\n✗ ERROR: {e}")
    import traceback
    traceback.print_exc()
