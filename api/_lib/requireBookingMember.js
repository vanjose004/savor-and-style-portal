import { getSupabaseAdmin } from './supabaseAdmin.js'

// Verifies the caller is a logged-in Supabase Auth user who's also an
// active row in `booking_members` for the given booking — same shape as
// requireAdmin.js, just scoped to one booking instead of the whole table.
// Used by the small server endpoints that only exist to fire a Telegram
// alert (the actual data writes go through RLS-gated Supabase calls
// straight from the browser, same as the rest of this app).
export async function requireBookingMember(req, bookingId) {
  const authHeader = req.headers.authorization ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token || !bookingId) return null

  const supabaseAdmin = getSupabaseAdmin()

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) return null

  const { data: memberRow } = await supabaseAdmin
    .from('booking_members')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('auth_user_id', userData.user.id)
    .eq('active', true)
    .maybeSingle()
  if (!memberRow) return null

  return memberRow.id
}
