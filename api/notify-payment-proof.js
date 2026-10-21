import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { requireBookingMember } from './_lib/requireBookingMember.js'
import { sendMessage } from './_lib/telegram.js'
import { formatCurrency } from './_lib/format.js'

// Called from src/pages/client-portal/Payments.jsx right after a client
// uploads a proof-of-payment screenshot (fire-and-forget — the
// payment_submissions row is already saved regardless).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { bookingId, amount, method } = req.body ?? {}
  if (!bookingId || !amount || !method) {
    res.status(400).json({ error: 'bookingId, amount, and method are required' })
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
      `🧾 <b>Payment proof submitted</b>\n\n` +
      `${booking?.clients?.name ?? 'Client'} (${booking?.booking_code ?? bookingId})\n` +
      `${formatCurrency(amount)} via ${method}\n\n` +
      `Review it on the booking's My Event Portal card in the admin portal.`

    await sendMessage({ chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID, text })

    res.status(200).json({ sent: true })
  } catch (err) {
    console.error('[notify-payment-proof] error:', err)
    res.status(500).json({ error: err.message })
  }
}
