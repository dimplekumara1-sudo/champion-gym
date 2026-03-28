#!/usr/bin/env python3
"""
Test script for eSSL X990 blocking methods
Tests which blocking method works best for the device
"""

import sys
import os
from datetime import datetime

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

DEVICE_IP = os.getenv('DEVICE_IP', '192.168.0.215')
DEVICE_PORT = int(os.getenv('DEVICE_PORT', 4370))
DEVICE_TIMEOUT = int(os.getenv('DEVICE_TIMEOUT', 30))
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

print("=" * 70)
print("eSSL X990 BLOCKING METHOD TEST")
print("=" * 70)
print(f"Device IP: {DEVICE_IP}:{DEVICE_PORT}")
print(f"Timeout: {DEVICE_TIMEOUT}s")
print()

# Test 1: Try to import ZK library
print("[TEST 1] Checking ZK Library Installation...")
try:
    from zk import ZK, const
    print("✅ pyzk library found")
    ZK_AVAILABLE = True
except ImportError as e:
    print(f"❌ pyzk NOT installed: {e}")
    print("   Install with: pip install pyzk")
    ZK_AVAILABLE = False
    sys.exit(1)

# Test 2: Connect to device
print("\n[TEST 2] Connecting to Device...")
try:
    zk = ZK(DEVICE_IP, port=DEVICE_PORT, timeout=DEVICE_TIMEOUT)
    conn = zk.connect()
    print(f"✅ Connected to device at {DEVICE_IP}:{DEVICE_PORT}")
except Exception as e:
    print(f"❌ FAILED to connect: {e}")
    print()
    print("Troubleshooting:")
    print("1. Check DEVICE_IP is correct (you provided: 192.168.0.215)")
    print("2. Verify device is powered on")
    print("3. Check network connectivity: ping 192.168.0.215")
    print("4. Verify port 4370 is open: telnet 192.168.0.215 4370")
    sys.exit(1)

# Test 3: Get device info
print("\n[TEST 3] Getting Device Information...")
try:
    conn.disable_device()
    device_name = conn.get_device_name()
    device_sn = conn.get_sn()
    print(f"✅ Device Name: {device_name}")
    print(f"✅ Device SN: {device_sn}")
except Exception as e:
    print(f"⚠️  Could not get device info: {e}")

# Test 4: Get all users
print("\n[TEST 4] Fetching Users from Device...")
try:
    users = conn.get_users()
    cga5_user = None
    
    print(f"📊 Total users on device: {len(users)}")
    
    for user in users:
        if str(user.user_id) == 'CGA5':
            cga5_user = user
            print(f"\n✅ Found CGA5 on device:")
            print(f"   UID: {user.uid}")
            print(f"   PIN/User ID: {user.user_id}")
            print(f"   Name: {user.name}")
            print(f"   Group: {user.group_id if hasattr(user, 'group_id') else 'N/A'}")
            print(f"   Privilege: {user.privilege if hasattr(user, 'privilege') else 'N/A'}")
            print(f"   Enable: {user.enable if hasattr(user, 'enable') else 'N/A'}")
            break
    
    if not cga5_user:
        print(f"❌ CGA5 NOT found on device!")
        print(f"   Available users: {[u.user_id for u in users[:10]]}")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ Failed to get users: {e}")
    sys.exit(1)

# Test 5: Test blocking methods
print("\n" + "=" * 70)
print("TESTING BLOCKING METHODS FOR CGA5")
print("=" * 70)

# Method 1: Group=99
print("\n[METHOD 1] Block via Group=99...")
try:
    print(f"   Before: Group = {cga5_user.group_id}")
    
    conn.set_user(
        uid=cga5_user.uid,
        name=cga5_user.name,
        privilege=cga5_user.privilege,
        password=cga5_user.password,
        group_id='99',
        user_id=cga5_user.user_id,
        card=cga5_user.card
    )
    print("✅ Command executed successfully")
    print("   Action: Set Group=99 (restricted/no access group)")
    
    # Verify
    users_after = conn.get_users()
    cga5_after = next((u for u in users_after if str(u.user_id) == 'CGA5'), None)
    if cga5_after:
        print(f"   After: Group = {cga5_after.group_id}")
        if str(cga5_after.group_id) == '99':
            print("✅✅ VERIFICATION PASSED - CGA5 is NOW in Group 99!")
            method_1_success = True
        else:
            print(f"⚠️  Group not updated. Current: {cga5_after.group_id}")
            method_1_success = False
    else:
        print("⚠️  Could not verify after update")
        method_1_success = False
        
except Exception as e:
    print(f"❌ Method 1 failed: {e}")
    method_1_success = False

# Method 2: Enable=0
print("\n[METHOD 2] Block via Enable=0...")
try:
    # Re-fetch current state
    users_current = conn.get_users()
    cga5_current = next((u for u in users_current if str(u.user_id) == 'CGA5'), None)
    
    if not cga5_current:
        print("❌ Could not find CGA5")
        method_2_success = False
    else:
        enable_before = getattr(cga5_current, 'enable', 'N/A')
        print(f"   Before: Enable = {enable_before}")
        
        conn.set_user(
            uid=cga5_current.uid,
            name=cga5_current.name,
            privilege=cga5_current.privilege,
            password=cga5_current.password,
            group_id=cga5_current.group_id,
            user_id=cga5_current.user_id,
            card=cga5_current.card,
            enable=0  # Disable
        )
        print("✅ Command executed successfully")
        print("   Action: Set Enable=0 (disabled user)")
        
        # Verify
        users_after2 = conn.get_users()
        cga5_after2 = next((u for u in users_after2 if str(u.user_id) == 'CGA5'), None)
        if cga5_after2:
            enable_after = getattr(cga5_after2, 'enable', 'N/A')
            print(f"   After: Enable = {enable_after}")
            if enable_after == 0 or enable_after is False:
                print("✅✅ VERIFICATION PASSED - CGA5 is NOW disabled!")
                method_2_success = True
            else:
                print(f"⚠️  Enable not updated. Current: {enable_after}")
                method_2_success = False
        else:
            print("⚠️  Could not verify after update")
            method_2_success = False
            
except Exception as e:
    print(f"❌ Method 2 failed: {e}")
    method_2_success = False

# Method 3: Delete fingerprints
print("\n[METHOD 3] Block via Delete Access (Clear Groups)...")
try:
    # Re-fetch
    users_current = conn.get_users()
    cga5_current = next((u for u in users_current if str(u.user_id) == 'CGA5'), None)
    
    if not cga5_current:
        print("❌ Could not find CGA5")
        method_3_success = False
    else:
        print(f"   Note: This method requires manual access group removal")
        print(f"   Current Group: {cga5_current.group_id}")
        print("   Would need: Delete access records or revoke group membership")
        print("⚠️  Skipping - not directly testable without device-specific API")
        method_3_success = None
        
except Exception as e:
    print(f"⚠️  Method 3 check failed: {e}")
    method_3_success = None

# Disconnect
print("\n[CLEANUP] Disconnecting...")
try:
    if conn:
        conn.enable_device()
        conn.disconnect()
    print("✅ Disconnected cleanly")
except Exception as e:
    print(f"⚠️  Disconnect warning: {e}")

# Summary
print("\n" + "=" * 70)
print("TEST RESULTS SUMMARY")
print("=" * 70)

results = {
    "Group=99 (Restricted Group)": method_1_success,
    "Enable=0 (Disable User)": method_2_success,
    "Delete Access": method_3_success
}

print("\nBlocking Method Effectiveness:")
for method, result in results.items():
    if result is True:
        print(f"  ✅ {method}: WORKS")
    elif result is False:
        print(f"  ❌ {method}: FAILED")
    else:
        print(f"  ⚠️  {method}: NOT TESTED")

# Determine best method
working_methods = [m for m, r in results.items() if r is True]
if working_methods:
    print(f"\n🎯 BEST METHOD: {working_methods[0]}")
    print("   Use this method for production blocking")
else:
    print("\n❌ NO BLOCKING METHODS WORKED")
    print("   Device may not support these commands")

# Update database
print("\n[DATABASE] Updating test results...")
try:
    import requests
    
    test_result = {
        'device_ip': DEVICE_IP,
        'device_port': DEVICE_PORT,
        'tested_at': datetime.now().isoformat(),
        'method_group99': method_1_success,
        'method_enable0': method_2_success,
        'cga5_status': 'tested',
        'successful_methods': working_methods
    }
    
    # Try to update essl_commands for CGA5
    headers = {
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
    }
    
    # Update the stuck command status
    update_url = f"{SUPABASE_URL}/rest/v1/essl_commands?essl_id=eq.CGA5&order=created_at.desc&limit=1"
    
    if method_1_success or method_2_success:
        update_data = {
            'status': 'completed',
            'updated_at': datetime.now().isoformat()
        }
        resp = requests.patch(update_url, json=update_data, headers=headers)
        if resp.status_code in [200, 204]:
            print("✅ Updated command status to 'completed'")
        else:
            print(f"⚠️  Database update failed: {resp.status_code}")
    
    # Log to device_activity_log
    log_url = f"{SUPABASE_URL}/rest/v1/device_activity_log"
    log_data = {
        'essl_id': 'CGA5',
        'action': 'user_block',
        'description': f"Tested via bridge agent. Success: {bool(method_1_success or method_2_success)}",
        'success': method_1_success or method_2_success,
        'metadata': test_result
    }
    resp = requests.post(log_url, json=log_data, headers=headers)
    if resp.status_code in [200, 201]:
        print("✅ Logged test results to device_activity_log")
    else:
        print(f"⚠️  Activity log failed: {resp.status_code}")
        
except Exception as e:
    print(f"⚠️  Database update failed: {e}")

print("\n" + "=" * 70)
print("TEST COMPLETE")
print("=" * 70)

sys.exit(0 if (method_1_success or method_2_success) else 1)
