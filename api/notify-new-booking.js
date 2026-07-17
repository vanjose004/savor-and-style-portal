import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { sendMessage } from './_lib/telegram.js'
import { formatDate } from './_lib/format.js'

// Called from src/pages/BookingRequest.jsx right after a public /book
// submission succeeds (fire-and-forget, same "booking is already saved
// regardless" philosophy as the send-booking-confirmation email). Looked
// up by access_token — same trust model as the rest of the client portal
// — not booking_id, to avoid an enumerable-primary-key lookup surface.
//
// This endpoint is public/unauthenticated by nature (called from the
// browser, no Telegram-facing secret applies here). Worst case for a
// guessed/replayed access_token is a duplicate Telegram alert — no data
// is exposed back to the caller either way (the response body is never
// read by the frontend, which swallows errors).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const accessToken = req.body?.access_token
  if (!accessToken) {
    res.status(400).json({ error: 'access_token is required' })
    return
  }

  try {
    const { data: booking, error } = await getSupabaseAdmin()
      .from('bookings')
      .select('booking_code, event_type, event_date, venue, pax, menu_package, clients(name, phone)')
      .eq('access_token', accessToken)
      .maybeSingle()

    if (error || !booking) {
      res.status(404).json({ error: 'Booking not found' })
      return
    }

    const text =
      `🔔 <b>May bagong booking!</b>\n\n` +
      `${booking.clients?.name ?? 'Unknown'} — ${booking.event_type}\n` +
      `📅 ${formatDate(booking.event_date)}\n` +
      `📍 ${booking.venue ?? 'TBD'}\n` +
      `👥 ${booking.pax ?? '—'} pax` +
      (booking.menu_package ? `\n🍽️ ${booking.menu_package}` : '') +
      `\n📞 ${booking.clients?.phone ?? '—'}\n\n` +
      `Ref: ${booking.booking_code}`

    await sendMessage({ chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID, text })

    res.status(200).json({ sent: true })
  } catch (err) {
    console.error('[notify-new-booking] error:', err)
    res.status(500).json({ error: err.message })
  }
}
