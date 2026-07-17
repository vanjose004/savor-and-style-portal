import { getSupabaseAdmin } from '../supabaseAdmin.js'
import { sendMessage } from '../telegram.js'
import { formatDate } from '../format.js'

function toDateString(date) {
  return date.toISOString().slice(0, 10)
}

// Same "next 30 days" window as the admin dashboard's Upcoming Events card
// (src/pages/admin/AdminDashboard.jsx), so /events matches what's already
// shown there.
export async function events(chatId) {
  const supabase = getSupabaseAdmin()
  const today = new Date()
  const todayStr = toDateString(today)
  const in30Days = new Date(today)
  in30Days.setDate(in30Days.getDate() + 30)
  const in30DaysStr = toDateString(in30Days)

  const { data, count } = await supabase
    .from('bookings')
    .select('booking_code, event_type, event_date, venue, pax, status, clients(name)', { count: 'exact' })
    .gte('event_date', todayStr)
    .lte('event_date', in30DaysStr)
    .neq('status', 'cancelled')
    .order('event_date', { ascending: true })
    .limit(10)

  if (!data || data.length === 0) {
    await sendMessage({ chat_id: chatId, text: '📅 Walang upcoming events sa susunod 30 days, boss.' })
    return
  }

  const lines = data.map(
    (b, i) =>
      `${i + 1}. ${formatDate(b.event_date)} — ${b.clients?.name ?? 'Unknown'}'s ${b.event_type} (${b.booking_code}) — ${b.pax ?? '—'} pax — ${b.status}`
  )

  const suffix = count && count > data.length ? `\n\n…at ${count - data.length} pa.` : ''

  await sendMessage({
    chat_id: chatId,
    text: `📅 <b>Upcoming Events (next 30 days)</b>\n\n${lines.join('\n')}${suffix}`,
  })
}
