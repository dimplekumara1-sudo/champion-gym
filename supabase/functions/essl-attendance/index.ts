
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    const esslId: string = (body.essl_id ?? body.user_id ?? '').toString().trim()

    if (!esslId) return respond({ error: 'Missing essl_id' }, 400)

    // ─── FETCH PROFILE ────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, essl_id, username, essl_blocked, plan_expiry_date, plan_status')
      .eq('essl_id', esslId)
      .single()

    if (!profile) return respond({ error: 'Unknown ID' }, 404)

    // ─── DUAL GATE: flag OR date — whichever fires first ─────────
    const now = new Date()
    const expiry = profile.plan_expiry_date ? new Date(profile.plan_expiry_date) : null
    const isExpiredByDate = expiry !== null && expiry < now
    const isBlockedByFlag = profile.essl_blocked === true

    if (isBlockedByFlag || isExpiredByDate) {

      // If date expired but flag not set yet → fix it + queue device block
      if (isExpiredByDate && !isBlockedByFlag) {
        await supabase.from('profiles')
          .update({ essl_blocked: true, plan_status: 'expired' })
          .eq('id', profile.id)

        // Queue Group=99 block command for bridge agent to pick up
        await supabase.from('essl_commands').insert({
          essl_id: esslId,
          command: `DATA UPDATE USER PIN=${esslId} Group=99 EndDateTime=20261231235959`,
          status: 'pending',
          payload: JSON.stringify({ reason: 'auto_expired', triggered_by: 'attendance_gate' })
        })
      }

      // Log the denied attempt for audit
      await supabase.from('blocked_attempts').insert({
        essl_id: esslId,
        attempted_at: now.toISOString(),
        reason: isBlockedByFlag ? 'manually_blocked' : 'plan_expired'
      })

      // ← THIS IS THE FIX: return BEFORE anything else
      return respond({
        blocked: true,
        reason: isBlockedByFlag ? 'Account blocked by admin' : `Plan expired ${expiry?.toDateString()}`
      }, 403)
    }

    // ─── DUPLICATE PUNCH CHECK ────────────────────────────────────
    const todayMidnight = new Date(now)
    todayMidnight.setHours(0, 0, 0, 0)

    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('essl_id', esslId)
      .gte('check_in', todayMidnight.toISOString())
      .maybeSingle()

    if (existing) return respond({ message: 'Already punched today' }, 200)

    // ─── CREATE RECORD — only reaches here if active ──────────────
    await supabase.from('attendance').insert({
      essl_id: esslId,
      profile_id: profile.id,
      check_in: now.toISOString(),
    })

    return respond({ success: true, user: profile.username }, 201)

  } catch (err) {
    console.error(err)
    return respond({ error: 'Internal error' }, 500)
  }
})

function respond(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

