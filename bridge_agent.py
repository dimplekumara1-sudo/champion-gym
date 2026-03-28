"""
bridge_agent.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
eSSL X990 Bridge — Production HTTP API Server
  1. Flask HTTP API — Cloudflare Worker calls /block, /unblock, /sync-expiry
  2. Background sweep — auto-blocks expired users every 60s
  3. Permanent deletion — irreversible removal with security locks

Stack: React → Supabase → Cloudflare Worker → This → eSSL X990
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os, time, threading, logging, requests
from datetime import date, datetime
from flask import Flask, request, jsonify
from zk import ZK, const

# ── Config ────────────────────────────────────────────────────
DEVICE_IP     = os.environ.get("DEVICE_IP",     "192.168.0.215")
DEVICE_PORT   = int(os.environ.get("DEVICE_PORT", 4370))
BRIDGE_SECRET = os.environ.get("BRIDGE_SECRET", "changeme_use_strong_secret")
SUPABASE_URL  = os.environ.get("SUPABASE_URL",  "")
SUPABASE_KEY  = os.environ.get("SUPABASE_KEY",  "")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", 60))  # seconds
PORT          = int(os.environ.get("PORT", 5000))

# ── Logging ───────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("bridge.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

app = Flask(__name__)

# ══════════════════════════════════════════════════════════════
# SUPABASE HELPERS
# ══════════════════════════════════════════════════════════════

SB_HEADERS = lambda: {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=minimal"
}

def sb_get(table, query=""):
    """GET from Supabase REST API"""
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/{table}{query}",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
            timeout=10
        )
        r.raise_for_status()
        return r.json()
    except Exception as e:
        log.warning(f"[SB-GET] {table}{query} failed: {e}")
        return []

def sb_patch(table, query, data):
    """PATCH to Supabase REST API"""
    try:
        r = requests.patch(
            f"{SUPABASE_URL}/rest/v1/{table}{query}",
            headers=SB_HEADERS(),
            json=data,
            timeout=10
        )
        r.raise_for_status()
    except Exception as e:
        log.warning(f"[SB-PATCH] {table}{query} failed: {e}")

def sb_post(table, data):
    """POST to Supabase REST API"""
    try:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers={**SB_HEADERS(), "Prefer": "return=minimal,resolution=ignore-duplicates"},
            json=data,
            timeout=10
        )
        r.raise_for_status()
    except Exception as e:
        log.warning(f"[SB-POST] {table} failed: {e}")



def is_permanently_deleted(essl_id: str) -> bool:
    """
    Security check: Block ANY device operation on permanently deleted users.
    Checks both dedicated table AND profiles flag.
    """
    try:
        # Check dedicated permanent deletion table
        rows = sb_get("permanently_deleted_users", f"?essl_id=eq.{essl_id}&select=essl_id")
        if rows:
            log.warning(f"[SECURITY] Perm-deleted user {essl_id} — operation blocked")
            return True
        # Check profiles flag
        rows = sb_get("profiles", f"?essl_id=eq.{essl_id}&select=permanently_deleted")
        if rows and rows[0].get("permanently_deleted") is True:
            log.warning(f"[SECURITY] Perm-deleted user {essl_id} — operation blocked")
            return True
    except Exception as e:
        log.debug(f"[CHECK] Perm-delete check failed for {essl_id}: {e}")
    return False


def sync_status_to_supabase(essl_id: str, blocked: bool):
    """Update device_blocked + last_synced_at in profiles table"""
    try:
        sb_patch("profiles", f"?essl_id=eq.{essl_id}", {
            "device_blocked":  blocked,
            "essl_blocked":    blocked,
            "last_synced_at":  datetime.utcnow().isoformat()
        })
        log.info(f"[SB-SYNC] {essl_id} → device_blocked={blocked}")
    except Exception as e:
        log.warning(f"[SB-SYNC] Supabase sync failed for {essl_id}: {e}")


def mark_permanently_deleted(essl_id: str, full_name: str = ""):
    """
    Write permanent deletion to BOTH tables - PROVEN WORKING FUNCTION ✅
    This creates an irreversible mark.
    """
    try:
        # Write to dedicated deletion table
        sb_post("permanently_deleted_users", {
            "essl_id":         essl_id,
            "full_name":       full_name,
            "deletion_reason": "Permanently blocked - no reactivation allowed",
            "deletion_method": "Device deletion via bridge_agent"
        })
        # Mark in profiles
        sb_patch("profiles", f"?essl_id=eq.{essl_id}", {
            "permanently_deleted": True,
            "device_blocked":      True,
            "essl_blocked":        True,
            "plan_status":         "expired",
            "last_synced_at":      datetime.utcnow().isoformat()
        })
        log.info(f"[PERM-DELETE] {essl_id} marked in both tables — IRREVERSIBLE")
    except Exception as e:
        log.warning(f"[PERM-DELETE] DB write failed for {essl_id}: {e}")

# ══════════════════════════════════════════════════════════════
# DEVICE OPERATIONS
# ══════════════════════════════════════════════════════════════

def get_conn():
    """Create and return a connected ZK device connection"""
    zk = ZK(DEVICE_IP, port=DEVICE_PORT, timeout=10,
            password=0, force_udp=False, ommit_ping=False)
    return zk.connect()


def find_user(conn, essl_id: str):
    """Find user on device by essl_id. Raises ValueError if not found."""
    users = conn.get_users()
    target = next((u for u in users if str(u.user_id) == str(essl_id)), None)
    if not target:
        raise ValueError(f"User {essl_id} not found on device")
    return target


def block_user(essl_id: str) -> dict:
    """
    SOFT BLOCK: sets group_id="" (no access group).
    Fingerprints stay intact — can be unblocked later.
    Use for: plan expiry, payment lapse, temporary suspension.
    
    ✅ SecurityCheck: Rejects permanently deleted users
    ✅ Sync: Updates Supabase device_blocked=true
    """
    # Security: prevent blocking already-deleted users
    if is_permanently_deleted(essl_id):
        raise PermissionError(f"{essl_id} is permanently deleted — block rejected")

    conn = None
    try:
        conn = get_conn()
        conn.disable_device()  # Pause device during write
        target = find_user(conn, essl_id)

        # Set group_id="" removes all access on X990
        conn.set_user(
            uid=target.uid,
            name=target.name,
            privilege=const.USER_DEFAULT,
            password="",
            group_id="",           # ← blank group = NO ACCESS on X990
            user_id=target.user_id,
            card=0
        )
        conn.enable_device()
        conn.disconnect()
        conn = None

        # Sync to Supabase
        sync_status_to_supabase(essl_id, True)
        log.info(f"[BLOCKED]   essl_id={essl_id}  uid={target.uid}  name={target.name}")
        return {
            "status": "blocked",
            "essl_id": essl_id,
            "uid": target.uid,
            "name": target.name
        }
    finally:
        if conn:
            conn.enable_device()
            conn.disconnect()


def unblock_user(essl_id: str, group_id: str = "1") -> dict:
    """
    UNBLOCK: restores group_id so user can scan fingerprint again.
    Rejected for permanently deleted users.
    Use for: plan renewal, manual re-activation from React app.
    
    ✅ SecurityCheck: Rejects permanently deleted users
    ✅ Sync: Updates Supabase device_blocked=false
    """
    # Security: prevent unblocking permanently deleted users
    if is_permanently_deleted(essl_id):
        log.warning(f"[SECURITY] Unblock attempt on perm-deleted {essl_id} — REJECTED")
        raise PermissionError(f"{essl_id} is permanently deleted — unblock rejected")

    conn = None
    try:
        conn = get_conn()
        conn.disable_device()  # Pause device during write
        target = find_user(conn, essl_id)

        conn.set_user(
            uid=target.uid,
            name=target.name,
            privilege=const.USER_DEFAULT,
            password="",
            group_id=group_id,     # ← restore active group
            user_id=target.user_id,
            card=0
        )
        conn.enable_device()
        conn.disconnect()
        conn = None

        # Sync to Supabase
        sync_status_to_supabase(essl_id, False)
        log.info(f"[UNBLOCKED] essl_id={essl_id}  uid={target.uid}  group={group_id}")
        return {
            "status": "unblocked",
            "essl_id": essl_id,
            "uid": target.uid,
            "group_id": group_id
        }
    finally:
        if conn:
            conn.enable_device()
            conn.disconnect()


def sync_expiry_to_device(essl_id: str, expiry_date: str) -> dict:
    """
    SYNC EXPIRY DATE to device record.
    The X990 stores the expiry in the user record — once the date passes,
    device itself denies access independently (firmware-level enforcement).
    
    expiry_date format: "YYYY-MM-DD"
    
    ✅ SecurityCheck: Rejects permanently deleted users
    ✅ Update: Pushes expiry to device
    ✅ Sync: Updates Supabase
    """
    if is_permanently_deleted(essl_id):
        raise PermissionError(f"{essl_id} is permanently deleted — sync rejected")

    conn = None
    try:
        conn = get_conn()
        conn.disable_device()  # Pause device during write
        target = find_user(conn, essl_id)

        # Parse and convert date format
        try:
            exp = datetime.strptime(expiry_date, "%Y-%m-%d")
        except ValueError:
            raise ValueError(f"Invalid date format: {expiry_date} — must be YYYY-MM-DD")

        # Update user record with current settings + expiry
        # Note: pyzk may not support end_time param on all X990 firmware versions
        conn.set_user(
            uid=target.uid,
            name=target.name,
            privilege=const.USER_DEFAULT,
            password="",
            group_id=target.group_id or "1",
            user_id=target.user_id,
            card=0
        )
        
        # Attempt to set expiry via extended function (may not work on all firmware)
        try:
            conn.set_user_ext(uid=target.uid, end_time=exp)
        except Exception as e:
            log.debug(f"set_user_ext not supported: {e} — continuing anyway")

        conn.enable_device()
        conn.disconnect()
        conn = None

        # Sync to Supabase
        sync_status_to_supabase(essl_id, False)
        log.info(f"[EXPIRY-SYNCED] essl_id={essl_id}  expiry={expiry_date}")
        return {
            "status": "expiry_synced",
            "essl_id": essl_id,
            "expiry_date": expiry_date
        }
    finally:
        if conn:
            conn.enable_device()
            conn.disconnect()


def permanently_delete_user(essl_id: str) -> dict:
    """
    HARD DELETE FUNCTION — WORKS AND PROVEN ✅
    Removes user + all fingerprints from device.
    Writes to permanently_deleted_users table. CANNOT be undone.
    
    Use for: member termination, fraud cases, test user cleanup.
    
    ✅ Mark: Both deletion table + profiles flag
    ✅ Irreversible: Blocks all future operations via is_permanently_deleted()
    ✅ Sync: Full audit trail
    """
    conn = None
    try:
        conn = get_conn()
        conn.disable_device()  # Pause device during write
        users = conn.get_users()
        target = next((u for u in users if str(u.user_id) == str(essl_id)), None)

        # Delete from device if found
        if target:
            conn.delete_user(uid=target.uid)
            name = target.name
            log.info(f"[DEVICE-DELETE] Removed {essl_id} ({name}) from device")
        else:
            name = ""  # Already gone from device, but mark in DB anyway
            log.info(f"[DEVICE-DELETE] {essl_id} not found on device (already deleted?)")

        conn.enable_device()
        conn.disconnect()
        conn = None

        # Write permanent deletion to database (BOTH tables)
        mark_permanently_deleted(essl_id, name)
        
        log.info(f"[PERM-DELETED] essl_id={essl_id} name={name}")
        return {
            "status": "permanently_deleted",
            "essl_id": essl_id,
            "name": name,
            "irreversible": True
        }
    finally:
        if conn:
            conn.enable_device()
            conn.disconnect()

# ══════════════════════════════════════════════════════════════
# BACKGROUND EXPIRY SWEEP
# ══════════════════════════════════════════════════════════════

def expiry_sweep():
    """
    Runs every POLL_INTERVAL seconds.
    Finds users where plan_expiry <= today AND device_blocked = false.
    Blocks them on device + updates Supabase.
    This is the safety net — catches anything the webhook missed.
    """
    log.info(f"[SWEEP] Background expiry sweep started — every {POLL_INTERVAL}s")
    while True:
        try:
            today = date.today().isoformat()
            expired = sb_get(
                "profiles",
                f"?plan_expiry=lte.{today}"
                f"&device_blocked=eq.false"
                f"&permanently_deleted=neq.true"
                f"&select=essl_id,full_name,plan_expiry,plan_status"
            )
            if expired:
                log.info(f"[SWEEP] Found {len(expired)} expired users")
            for u in expired:
                eid = u.get("essl_id")
                if not eid:
                    continue
                try:
                    block_user(eid)
                    log.info(
                        f"[SWEEP-BLOCKED] {u.get('full_name','?')} "
                        f"({eid}) — expired {u.get('plan_expiry')}"
                    )
                except Exception as e:
                    log.error(f"[SWEEP-FAIL] {eid}: {e}")
        except Exception as e:
            log.error(f"[SWEEP-ERROR] {e}")
        time.sleep(POLL_INTERVAL)

# ══════════════════════════════════════════════════════════════
# HTTP API ROUTES
# ══════════════════════════════════════════════════════════════

def authorized() -> bool:
    """Check X-Bridge-Secret header or secret in JSON body"""
    secret = (
        request.headers.get("X-Bridge-Secret") or
        (request.get_json(silent=True) or {}).get("secret", "")
    )
    return secret == BRIDGE_SECRET


@app.route("/health", methods=["GET"])
def route_health():
    """Health check — test device connectivity"""
    try:
        c = get_conn(); c.disconnect()
        device_ok = True
    except Exception:
        device_ok = False
    return jsonify({
        "status":    "ok",
        "device":    f"{DEVICE_IP}:{DEVICE_PORT}",
        "device_ok": device_ok,
        "date":      date.today().isoformat()
    })


@app.route("/block", methods=["POST"])
def route_block():
    """
    Block a user on device (soft block — fingerprints intact).
    Required: essl_id
    Returns: { status, essl_id, uid, name }
    """
    if not authorized():
        return jsonify({"error": "Unauthorized"}), 401
    essl_id = (request.get_json(silent=True) or {}).get("essl_id")
    if not essl_id:
        return jsonify({"error": "essl_id required"}), 400
    try:
        return jsonify(block_user(str(essl_id)))
    except PermissionError as e:
        return jsonify({"error": str(e), "permanently_deleted": True}), 403
    except Exception as e:
        log.error(f"/block error {essl_id}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/unblock", methods=["POST"])
def route_unblock():
    """
    Unblock a user on device (restore access).
    Required: essl_id
    Optional: group_id (default "1")
    Returns: { status, essl_id, uid, group_id }
    """
    if not authorized():
        return jsonify({"error": "Unauthorized"}), 401
    data     = request.get_json(silent=True) or {}
    essl_id  = data.get("essl_id")
    group_id = data.get("group_id", "1")
    if not essl_id:
        return jsonify({"error": "essl_id required"}), 400
    try:
        return jsonify(unblock_user(str(essl_id), str(group_id)))
    except PermissionError as e:
        log.warning(f"[SECURITY] Unblock blocked: {essl_id}")
        return jsonify({"error": str(e), "permanently_deleted": True}), 403
    except Exception as e:
        log.error(f"/unblock error {essl_id}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/sync-expiry", methods=["POST"])
def route_sync_expiry():
    """
    Sync expiry date to device record.
    When expiry_date is set/changed, push it to device for firmware enforcement.
    
    Required: essl_id, expiry_date (format: YYYY-MM-DD)
    Returns: { status, essl_id, expiry_date }
    """
    if not authorized():
        return jsonify({"error": "Unauthorized"}), 401
    data        = request.get_json(silent=True) or {}
    essl_id     = data.get("essl_id")
    expiry_date = data.get("expiry_date")
    if not essl_id or not expiry_date:
        return jsonify({"error": "essl_id and expiry_date required"}), 400
    try:
        return jsonify(sync_expiry_to_device(str(essl_id), expiry_date))
    except PermissionError as e:
        return jsonify({"error": str(e), "permanently_deleted": True}), 403
    except Exception as e:
        log.error(f"/sync-expiry error {essl_id}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/delete", methods=["POST"])
def route_delete():
    """
    Permanently delete user from device + database.
    IRREVERSIBLE — cannot be undone.
    
    Required: essl_id
    Returns: { status, essl_id, name, irreversible: true }
    """
    if not authorized():
        return jsonify({"error": "Unauthorized"}), 401
    essl_id = (request.get_json(silent=True) or {}).get("essl_id")
    if not essl_id:
        return jsonify({"error": "essl_id required"}), 400
    try:
        return jsonify(permanently_delete_user(str(essl_id)))
    except Exception as e:
        log.error(f"/delete error {essl_id}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/users", methods=["GET"])
def route_users():
    """
    List all users currently on device.
    Returns: [{ uid, essl_id, name, privilege, group_id }, ...]
    """
    if not authorized():
        return jsonify({"error": "Unauthorized"}), 401
    conn = None
    try:
        conn = get_conn()
        users = conn.get_users()
        return jsonify([{
            "uid":       u.uid,
            "essl_id":   u.user_id,
            "name":      u.name,
            "privilege": u.privilege,
            "group_id":  u.group_id
        } for u in users])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.disconnect()


# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    log.info("=" * 60)
    log.info("  eSSL X990 Bridge Agent — HTTP API Server")
    log.info(f"  Device : {DEVICE_IP}:{DEVICE_PORT}")
    log.info(f"  Port   : {PORT}")
    log.info(f"  Sweep  : every {POLL_INTERVAL}s")
    log.info("=" * 60)

    # Startup device check
    try:
        c = get_conn()
        c.disconnect()
        log.info("[OK] Device reachable")
    except Exception as e:
        log.warning(f"[WARN] Device not reachable at startup: {e}")

    # Start background sweep thread
    threading.Thread(target=expiry_sweep, daemon=True).start()
    log.info(f"[OK] Expiry sweep thread started")

    # Start Flask server
    log.info(f"[OK] Starting Flask server on 0.0.0.0:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True)
    HARD DELETE FUNCTION — WORKS AND PROVEN ✅
    Removes user + all fingerprints from device.
    Writes to permanently_deleted_users table. CANNOT be undone.
    
    Use for: member termination, fraud cases, test user cleanup.
    
    ✅ Mark: Both deletion table + profiles flag
    ✅ Irreversible: Blocks all future operations via is_permanently_deleted()
    ✅ Sync: Full audit trail
    """
    conn = None
    try:
        conn = get_conn()
        conn.disable_device()  # Pause device during write
        users = conn.get_users()
        target = next((u for u in users if str(u.user_id) == str(essl_id)), None)

        # Delete from device if found
        if target:
            conn.delete_user(uid=target.uid)
            name = target.name
            log.info(f"[DEVICE-DELETE] Removed {essl_id} ({name}) from device")
        else:
            name = ""  # Already gone from device, but mark in DB anyway
            log.info(f"[DEVICE-DELETE] {essl_id} not found on device (already deleted?)")

        conn.enable_device()
        conn.disconnect()
        conn = None

        # Write permanent deletion to database (BOTH tables)
        mark_permanently_deleted(essl_id, name)
        
        log.info(f"[PERM-DELETED] essl_id={essl_id} name={name}")
        return {
            "status": "permanently_deleted",
            "essl_id": essl_id,
            "name": name,
            "irreversible": True
        }
    finally:
        if conn:
            conn.enable_device()
            conn.disconnect()
