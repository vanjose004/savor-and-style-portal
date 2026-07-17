import { sendMessage } from './_lib/telegram.js'
import { formatTimePH } from './_lib/format.js'

// Called from src/pages/HomeCheckin.jsx / EventCheckin.jsx right after a
// successful record_home_checkin/record_event_checkin RPC call
// (fire-and-forget — the check-in is already logged regardless of this
// call's outcome, same fail-soft philosophy as notify-new-booking.js).
// Takes the RPC's own return row directly, forwarded by the frontend, so
// this needs no second DB round trip — the RPC is the source of truth
// for what was actually inserted.
//
// Public/unauthenticated by nature, same accepted risk as
// notify-new-booking.js — worst case is a spoofed/duplicate alert, no
// data exposed back to the caller.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { location_type, staff_name, checked_in_at, booking_code, venue } = req.body ?? {}

  if (!location_type || !staff_name || !checked_in_at) {
    res.status(400).json({ error: 'location_type, staff_name, and checked_in_at are required' })
    return
  }

  try {
    const time = formatTimePH(checked_in_at)
    const location = location_type === 'home' ? 'Bahay/Home' : `${venue ?? 'Event'} (${booking_code ?? '—'})`

    const text = `Si ${staff_name} naka-log in sa ${location} — ${time}`

    await sendMessage({ chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID, text })

    res.status(200).json({ sent: true })
  } catch (err) {
    console.error('[notify-checkin] error:', err)
    res.status(500).json({ error: err.message })
  }
}
