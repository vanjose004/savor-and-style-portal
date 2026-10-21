import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { requireBookingMember } from './_lib/requireBookingMember.js'
import { sendMessage } from './_lib/telegram.js'

// Called from src/pages/client-portal/Messages.jsx right after a client
// sends a message (fire-and-forget — the message is already saved via the
// RLS-gated insert regardless of whether this alert succeeds).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { bookingId, body } = req.body ?? {}
  if (!bookingId || !body) {
    res.status(400).json({ error: 'bookingId and body are required' })
    return
  }

  const memberId = await requireBookingMember(req, bookingId)
  if (!memberId) {
    res.status(401).json({ error: 'Booking member session required' })
    return
  }

  try {
    const { data: booking } = await getSupabaseAdmin()
      .from('bookings')
      .select('booking_code, clients(name)')
      .eq('id', bookingId)
      .maybeSingle()

    const text =
      `💬 <b>New My Event Portal message</b>\n\n` +
      `${booking?.clients?.name ?? 'Client'} (${booking?.booking_code ?? bookingId})\n\n` +
      body.slice(0, 500)

    await sendMessage({ chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID, text })

    res.status(200).json({ sent: true })
  } catch (err) {
    console.error('[notify-portal-message] error:', err)
    res.status(500).json({ error: err.message })
  }
}
