import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { requireAdmin } from './_lib/requireAdmin.js'

// Admin-only control panel for a booking's "My Event" portal login —
// called from src/components/admin/booking-detail/WeddingPortalCard.jsx.
// Creates/resets the single Supabase Auth account a booking's client logs
// into at /my-event/login, using a synthetic internal email (the client
// may not have a real one on file) the same way `username` resolves to a
// real email for staff via get_email_for_username() — here the lookup is
// get_email_for_booking_code(), and the "username" is the booking code.
//
// Password is generated here, returned once in the response, and never
// stored by us — Supabase Auth is the sole owner of it from this point on,
// same as every other account in this app.

const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I — avoids transcription mistakes
const TEMP_PASSWORD_LENGTH = 8

function generateTempPassword() {
  let password = ''
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
    password += TEMP_PASSWORD_CHARS[Math.floor(Math.random() * TEMP_PASSWORD_CHARS.length)]
  }
  return password
}

function syntheticEmailFor(bookingCode) {
  return `${bookingCode.toLowerCase()}@clients.savorandstylecatering.internal`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const adminId = await requireAdmin(req)
  if (!adminId) {
    res.status(401).json({ error: 'Admin session required' })
    return
  }

  const { bookingId, action } = req.body ?? {}
  if (!bookingId || !['generate', 'reset', 'disable', 'enable'].includes(action)) {
    res.status(400).json({ error: 'bookingId and a valid action are required' })
    return
  }

  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('id, booking_code')
      .eq('id', bookingId)
      .maybeSingle()
    if (bookingError || !booking) {
      res.status(404).json({ error: 'Booking not found' })
      return
    }

    const { data: existingMember } = await supabaseAdmin
      .from('booking_members')
      .select('id, auth_user_id, active')
      .eq('booking_id', bookingId)
      .maybeSingle()

    if (action === 'disable') {
      if (!existingMember) {
        res.status(404).json({ error: 'No portal access exists for this booking yet' })
        return
      }
      await supabaseAdmin.from('booking_members').update({ active: false }).eq('id', existingMember.id)
      res.status(200).json({ disabled: true })
      return
    }

    if (action === 'enable') {
      if (!existingMember) {
        res.status(404).json({ error: 'No portal access exists for this booking yet' })
        return
      }
      await supabaseAdmin.from('booking_members').update({ active: true }).eq('id', existingMember.id)
      res.status(200).json({ enabled: true })
      return
    }

    if (action === 'generate' && existingMember) {
      res.status(400).json({ error: 'Portal access already exists for this booking — use Reset Password instead.' })
      return
    }
    if (action === 'reset' && !existingMember) {
      res.status(404).json({ error: 'No portal access exists for this booking yet — use Generate instead.' })
      return
    }

    const tempPassword = generateTempPassword()

    if (action === 'generate') {
      const email = syntheticEmailFor(booking.booking_code)
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { role: 'client' },
      })
      if (createError) throw createError

      const { error: insertError } = await supabaseAdmin.from('booking_members').insert({
        booking_id: bookingId,
        auth_user_id: created.user.id,
        role: 'owner',
        must_change_password: true,
        active: true,
      })
      if (insertError) throw insertError

      await supabaseAdmin
        .from('booking_portal_settings')
        .upsert({ booking_id: bookingId, portal_enabled: true }, { onConflict: 'booking_id' })

      res.status(200).json({ bookingCode: booking.booking_code, tempPassword })
      return
    }

    // action === 'reset'
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingMember.auth_user_id, {
      password: tempPassword,
    })
    if (updateError) throw updateError

    await supabaseAdmin
      .from('booking_members')
      .update({ must_change_password: true, active: true })
      .eq('id', existingMember.id)

    res.status(200).json({ bookingCode: booking.booking_code, tempPassword })
  } catch (err) {
    console.error('[portal-access] error:', err)
    res.status(500).json({ error: err.message })
  }
}
