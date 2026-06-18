// Admin-only: sets a new random temp password for a staff member's Supabase
// Auth account and flags must_change_password so they're forced to pick
// their own on next login. Must run server-side — only the service role key
// can set another user's password, and that key must never reach the
// browser, so this exists as an Edge Function instead of client code.
//
// Deploy: supabase functions deploy reset-staff-password
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are
// auto-provided to every Edge Function — no manual secret setup needed.)

import { createClient } from 'npm:@supabase/supabase-js@2'

const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

function generateTempPassword(length = 10) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const byte of bytes) out += TEMP_PASSWORD_CHARS[byte % TEMP_PASSWORD_CHARS.length]
  return out
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Missing authorization header' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Identify the caller from their own JWT (forwarded by supabase.functions.invoke).
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await callerClient.auth.getUser()
  if (userError || !userData?.user) {
    return json({ error: 'Invalid session' }, 401)
  }

  // Service-role client for the privileged checks/writes below — never exposed to the caller.
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: adminRow } = await adminClient
    .from('admins')
    .select('id')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (!adminRow) {
    return json({ error: 'Forbidden — admin access required' }, 403)
  }

  let staffId: string | undefined
  try {
    const body = await req.json()
    staffId = body?.staff_id
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (!staffId) {
    return json({ error: 'staff_id is required' }, 400)
  }

  const { data: staffRow } = await adminClient.from('staff').select('id').eq('id', staffId).maybeSingle()
  if (!staffRow) {
    return json({ error: 'Staff member not found' }, 404)
  }

  const tempPassword = generateTempPassword()

  const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(staffId, {
    password: tempPassword,
  })
  if (updateAuthError) {
    return json({ error: updateAuthError.message }, 400)
  }

  const { error: updateStaffError } = await adminClient
    .from('staff')
    .update({ must_change_password: true })
    .eq('id', staffId)
  if (updateStaffError) {
    return json({ error: updateStaffError.message }, 400)
  }

  return json({ temp_password: tempPassword })
})
