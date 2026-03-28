#!/usr/bin/env python3

import requests
from dotenv import load_dotenv
import os
import json

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

headers = {
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Get a pending command first
print("Getting a pending command to test PATCH...")
get_resp = requests.get(
    f'{SUPABASE_URL}/rest/v1/essl_commands?status=eq.pending&limit=1',
    headers=headers
)

if get_resp.status_code == 200 and get_resp.json():
    cmd = get_resp.json()[0]
    cmd_id = cmd['id']
    print(f"\nFound command: {cmd_id}")
    print(f"Current status: {cmd['status']}")
    
    # Test PATCH to update status to 'sent'
    patch_url = f'{SUPABASE_URL}/rest/v1/essl_commands?id=eq.{cmd_id}'
    patch_data = {'status': 'sent'}
    
    print(f"\nTesting PATCH...")
    print(f"URL: {patch_url}")
    print(f"Data: {patch_data}")
    
    patch_resp = requests.patch(patch_url, headers=headers, json=patch_data)
    print(f"Status: {patch_resp.status_code}")
    print(f"Response: {patch_resp.text[:500]}")
    
    if patch_resp.status_code == 200:
        print("\n✓ PATCH SUCCESS!")
        updated = patch_resp.json()
        print(f"Updated command status: {updated[0]['status'] if updated else 'N/A'}")
    else:
        print(f"\n✗ PATCH FAILED - {patch_resp.status_code}")
else:
    print("No pending commands found")
