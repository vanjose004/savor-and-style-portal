// Admin-only: permanently deletes a self-registered staff member's Supabase
// Auth account. staff.id has `references auth.users(id) on delete cascade`,
// so deleting the auth user also removes the staff row — no separate delete
// needed. Must run server-side: only the service role can delete another
// user's auth account, and that key must never reach the browser.
//
// Deploy: supabase functions deploy reject-staff-registration

import { createClient } from 'npm:@supabase/supabase-js@2'

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

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await callerClient.auth.getUser()
  if (userError || !userData?.user) {
    return json({ error: 'Invalid session' }, 401)
  }

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

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(staffId)
  if (deleteError) {
    return json({ error: deleteError.message }, 400)
  }

  return json({ success: true })
})
