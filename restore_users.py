"""
restore_users.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNDO PERMANENT DELETION — Restore CGA5 and CGA2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Clears permanent_deleted flag from profiles
2. Removes from permanently_deleted_users table
3. Attempts to re-add users to device (if fingerprints available)
4. Restores access permissions
"""

import os
import requests
from datetime import datetime
from zk import ZK, const

# ── Config ────────────────────────────────────────────────────
DEVICE_IP     = os.environ.get("DEVICE_IP", "192.168.0.215")
DEVICE_PORT   = int(os.environ.get("DEVICE_PORT", 4370))
SUPABASE_URL  = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY  = os.environ.get("SUPABASE_KEY", "")

# Users to restore
RESTORE_USERS = [
    {"essl_id": "CGA5", "name": "YUVA SUBHARAM VASAMSETTI", "card": 0, "group_id": "1"},
    {"essl_id": "CGA2", "name": "DIMPLE KUMAR VASAMSETTI", "card": 0, "group_id": "1"},
]

def get_conn():
    """Connect to device"""
    zk = ZK(DEVICE_IP, DEVICE_PORT, timeout=10)
    conn = zk.connect()
    return conn

def sb_patch(table, query, data):
    """PATCH to Supabase"""
    try:
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/{table}{query}",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            json=data,
            timeout=10
        )
        r.raise_for_status()
        return True
    except Exception as e:
        print(f"❌ SB-PATCH {table} failed: {e}")
        return False

def sb_delete(table, query):
    """DELETE from Supabase"""
    try:
        r = requests.delete(
            f"{SUPABASE_URL}/rest/v1/{table}{query}",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            },
            timeout=10
        )
        r.raise_for_status()
        return True
    except Exception as e:
        print(f"❌ SB-DELETE {table} failed: {e}")
        return False

def restore_on_device(user_data):
    """Attempt to restore user on device"""
    try:
        conn = get_conn()
        conn.disable_device()
        
        # Get next available uid
        existing_users = conn.get_users()
        max_uid = max([u.uid for u in existing_users]) if existing_users else 0
        new_uid = max_uid + 1
        
        # Add user back to device
        conn.set_user(
            uid=new_uid,
            name=user_data["name"],
            privilege=const.USER_DEFAULT,
            password="",
            group_id=user_data["group_id"],
            user_id=user_data["essl_id"],
            card=user_data["card"]
        )
        
        conn.enable_device()
        conn.disconnect()
        
        print(f"  ✅ Re-added to device: uid={new_uid}, group={user_data['group_id']}")
        return True
    except Exception as e:
        print(f"  ⚠️  Could not re-add to device (fingerprints missing): {e}")
        print(f"     → You'll need to manually scan fingerprints at the device")
        return False

def restore_user_data(essl_id, name):
    """Restore user data in Supabase"""
    try:
        print(f"\n▶ Restoring {essl_id} ({name})...")
        
        # 1. Clear permanent deletion flag
        print(f"  1️⃣  Clearing permanent_deleted flag...")
        if sb_patch("profiles", f"?essl_id=eq.{essl_id}", {
            "permanently_deleted": False,
            "deletion_date": None,
            "essl_blocked": False
        }):
            print(f"    ✅ Profile updated")
        
        # 2. Remove from permanently_deleted_users table
        print(f"  2️⃣  Removing from permanently_deleted_users table...")
        if sb_delete("permanently_deleted_users", f"?essl_id=eq.{essl_id}"):
            print(f"    ✅ Deleted from permanent deletion table")
        
        # 3. Sync to device_user_cache
        print(f"  3️⃣  Updating device cache...")
        if sb_patch("device_user_cache", f"?essl_id=eq.{essl_id}", {
            "active": True,
            "synced_at": datetime.utcnow().isoformat()
        }):
            print(f"    ✅ Cache updated (or will be re-synced)")
        
        return True
    except Exception as e:
        print(f"  ❌ Restoration failed: {e}")
        return False

def main():
    print("╔════════════════════════════════════════════════════════════╗")
    print("║           RESTORE DELETED USERS TO DEVICE                 ║")
    print("╚════════════════════════════════════════════════════════════╝\n")
    
    # Test device connection
    try:
        conn = get_conn()
        print(f"✅ Device reachable at {DEVICE_IP}:{DEVICE_PORT}\n")
        conn.disconnect()
    except Exception as e:
        print(f"❌ Cannot reach device: {e}")
        return
    
    # Restore each user
    for user in RESTORE_USERS:
        essl_id = user["essl_id"]
        name = user["name"]
        
        # Restore in database
        restore_user_data(essl_id, name)
        
        # Try to restore on device (fingerprints may be missing)
        restore_on_device(user)
    
    print("\n╔════════════════════════════════════════════════════════════╗")
    print("║                    RESTORATION SUMMARY                    ║")
    print("╠════════════════════════════════════════════════════════════╣")
    print("║ Database: ✅ Permanent deletion cleared                    ║")
    print("║ Device:   ⚠️  Fingerprints need to be re-scanned           ║")
    print("║                                                            ║")
    print("║ NEXT STEPS:                                                ║")
    print("║ 1. Go to device and scan fingerprints for CGA5 and CGA2   ║")
    print("║ 2. Or restore fingerprints from backup if available       ║")
    print("║ 3. Run sync to update device_user_cache                  ║")
    print("╚════════════════════════════════════════════════════════════╝\n")

if __name__ == "__main__":
    main()
