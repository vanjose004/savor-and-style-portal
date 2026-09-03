import { getSupabaseAdmin } from './supabaseAdmin.js'

// Verifies the caller is a logged-in Supabase Auth user who's also a row in
// `admins` — same check as the is_admin() Postgres function the rest of the
// schema's RLS policies use, just done here in JS because these are plain
// Vercel functions, not Postgres RPCs. The browser sends the current
// session's access token as `Authorization: Bearer <token>` (see
// src/pages/admin/Gallery.jsx). Returns the admin's user id, or null if the
// request isn't from a valid admin session.
export async function requireAdmin(req) {
  const authHeader = req.headers.authorization ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null

  const supabaseAdmin = getSupabaseAdmin()

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) return null

  const { data: adminRow } = await supabaseAdmin.from('admins').select('id').eq('id', userData.user.id).maybeSingle()
  if (!adminRow) return null

  return userData.user.id
}
