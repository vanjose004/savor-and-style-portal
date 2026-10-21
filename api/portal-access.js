import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { requireAdmin } from './_lib/requireAdmin.js'
import { WEDDING_CHECKLIST_TEMPLATE } from '../src/lib/constants.js'

// Admin-only control panel for a booking's "My Event" portal logins —
// called from src/components/admin/booking-detail/WeddingPortalCard.jsx.
// Creates/resets the Supabase Auth accounts a booking's client(s) log into
// at /my-event/login, using synthetic internal emails (the client may not
// have a real one on file) the same way `username` resolves to a real
// email for staff via get_email_for_username() — here the lookup is
// get_email_for_booking_code(), matched against booking_members.login_code
// rather than bookings.booking_code directly, since a booking can have
// more than one member (co-planners) each with their own login string
// ("SS-2026-001", "SS-2026-001-2", ...).
//
// Password is generated here, returned once in the response, and never
// stored by us — Supabase Auth is the sole owner of it from this point on,
// same as every other account in this app.

const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I — avoids transcription mistakes
const TEMP_PASSWORD_LENGTH = 8
const VALID_ACTIONS = ['generate', 'addCoplanner', 'reset', 'disable', 'enable']

function generateTempPassword() {
  let password = ''
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
    password += TEMP_PASSWORD_CHARS[Math.floor(Math.random() * TEMP_PASSWORD_CHARS.length)]
  }
  return password
}

function syntheticEmailFor(loginCode) {
  return `${loginCode.toLowerCase()}@clients.savorandstylecatering.internal`
}

async function createMember(supabaseAdmin, { bookingId, loginCode }) {
  const tempPassword = generateTempPassword()
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: syntheticEmailFor(loginCode),
    password: tempPassword,
    email_confirm: true,
    user_metadata: { role: 'client' },
  })
  if (createError) throw createError

  const { error: insertError } = await supabaseAdmin.from('booking_members').insert({
    booking_id: bookingId,
    auth_user_id: created.user.id,
    login_code: loginCode,
    role: 'owner',
    must_change_password: true,
    active: true,
  })
  if (insertError) throw insertError

  return tempPassword
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

  const { bookingId, memberId, action } = req.body ?? {}
  if (!bookingId || !VALID_ACTIONS.includes(action)) {
    res.status(400).json({ error: 'bookingId and a valid action are required' })
    return
  }

  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('id, booking_code, event_date')
      .eq('id', bookingId)
      .maybeSingle()
    if (bookingError || !booking) {
      res.status(404).json({ error: 'Booking not found' })
      return
    }

    const { data: existingMembers } = await supabaseAdmin
      .from('booking_members')
      .select('id, auth_user_id, active, login_code')
      .eq('booking_id', bookingId)
      .order('created_at')

    if (action === 'disable' || action === 'enable') {
      const target = existingMembers?.find((m) => m.id === memberId)
      if (!target) {
        res.status(404).json({ error: 'Member not found for this booking' })
        return
      }
      await supabaseAdmin.from('booking_members').update({ active: action === 'enable' }).eq('id', target.id)
      res.status(200).json({ [action + 'd']: true })
      return
    }

    if (action === 'generate') {
      if (existingMembers?.length > 0) {
        res.status(400).json({ error: 'Portal access already exists for this booking — use Reset Password instead.' })
        return
      }

      const tempPassword = await createMember(supabaseAdmin, { bookingId, loginCode: booking.booking_code })

      await supabaseAdmin
        .from('booking_portal_settings')
        .upsert({ booking_id: bookingId, portal_enabled: true }, { onConflict: 'booking_id' })

      // Seed the Wedding checklist template once, with due dates computed
      // relative to the event date. If the booking is already close to (or
      // past) a template item's offset, its due date lands in the past —
      // the client UI flags those as "Do ASAP" rather than backdating them
      // away, so nothing here needs to special-case a late-booked wedding.
      if (booking.event_date) {
        const eventDate = new Date(`${booking.event_date}T00:00:00`)
        const tasks = WEDDING_CHECKLIST_TEMPLATE.map((item, index) => {
          const dueDate = new Date(eventDate)
          dueDate.setDate(dueDate.getDate() + item.offsetDays)
          return {
            booking_id: bookingId,
            title: item.title,
            category: item.category,
            owner: item.owner,
            due_date: dueDate.toISOString().slice(0, 10),
            sort: index,
          }
        })
        await supabaseAdmin.from('portal_checklist_tasks').insert(tasks)
      }

      res.status(200).json({ loginCode: booking.booking_code, tempPassword })
      return
    }

    if (action === 'addCoplanner') {
      if (!existingMembers || existingMembers.length === 0) {
        res.status(400).json({ error: 'Generate the primary portal access first.' })
        return
      }
      const loginCode = `${booking.booking_code}-${existingMembers.length + 1}`
      const tempPassword = await createMember(supabaseAdmin, { bookingId, loginCode })
      res.status(200).json({ loginCode, tempPassword })
      return
    }

    // action === 'reset'
    const target = existingMembers?.find((m) => m.id === memberId)
    if (!target) {
      res.status(404).json({ error: 'Member not found for this booking' })
      return
    }

    const tempPassword = generateTempPassword()
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(target.auth_user_id, {
      password: tempPassword,
    })
    if (updateError) throw updateError

    await supabaseAdmin.from('booking_members').update({ must_change_password: true, active: true }).eq('id', target.id)

    res.status(200).json({ loginCode: target.login_code, tempPassword })
  } catch (err) {
    console.error('[portal-access] error:', err)
    res.status(500).json({ error: err.message })
  }
}
