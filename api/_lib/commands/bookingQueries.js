import { getSupabaseAdmin } from '../supabaseAdmin.js'
import { findBookingCandidates } from '../parseBooking.js'
import { sendMessage } from '../telegram.js'
import { formatCurrency, formatDate } from '../format.js'
import { getMonthBounds, getThisMonthBounds, getThisWeekBounds, monthLabel } from '../dateParsing.js'

const LIST_SELECT = 'booking_code, event_type, event_date, event_time, venue, pax, status, clients(name)'

function eventLine(b, { withTime = true } = {}) {
  const time = withTime && b.event_time ? ` · ${b.event_time.slice(0, 5)}` : ''
  return `• ${b.clients?.name ?? 'Unknown'} — ${b.event_type} (${b.booking_code})${time} — ${b.venue ?? '—'} — ${b.pax ?? '—'} pax`
}

async function sendBookingList(chatId, title, emptyText, query) {
  const { data } = await query.limit(10)
  const rows = data ?? []
  if (rows.length === 0) {
    await sendMessage({ chat_id: chatId, text: emptyText })
    return
  }
  await sendMessage({ chat_id: chatId, text: `${title}\n\n${rows.map((b) => eventLine(b)).join('\n')}` })
}

// "May event ba bukas?" / "May event July 20?" / "Sino may event ngayon?"
export async function eventsOnDate(chatId, dateStr, dateLabel) {
  await sendBookingList(
    chatId,
    `📅 <b>Events — ${dateLabel}</b>`,
    `Walang event sa ${dateLabel}, boss.`,
    getSupabaseAdmin().from('bookings').select(LIST_SELECT).eq('event_date', dateStr).neq('status', 'cancelled')
  )
}

// "May event ba sa [month]?"
export async function eventsForMonth(chatId, monthIndex) {
  const { start, end } = getMonthBounds(monthIndex)
  await sendBookingList(
    chatId,
    `📅 <b>Events — ${monthLabel(monthIndex)}</b>`,
    `Walang event sa ${monthLabel(monthIndex)}, boss.`,
    getSupabaseAdmin().from('bookings').select(LIST_SELECT).gte('event_date', start).lte('event_date', end).neq('status', 'cancelled')
  )
}

// "Anong events ngayong linggo?"
export async function eventsThisWeek(chatId) {
  const { start, end } = getThisWeekBounds()
  await sendBookingList(
    chatId,
    `📅 <b>Events this week</b>`,
    'Walang event this week, boss.',
    getSupabaseAdmin().from('bookings').select(LIST_SELECT).gte('event_date', start).lte('event_date', end).neq('status', 'cancelled')
  )
}

// "Pending bookings?"
export async function pendingBookings(chatId) {
  await sendBookingList(
    chatId,
    '📋 <b>Pending Bookings</b>',
    'Walang pending bookings, boss.',
    getSupabaseAdmin().from('bookings').select(LIST_SELECT).eq('status', 'pending').order('event_date')
  )
}

// "Confirmed bookings?"
export async function confirmedBookings(chatId) {
  await sendBookingList(
    chatId,
    '✅ <b>Confirmed Bookings</b>',
    'Walang confirmed bookings, boss.',
    getSupabaseAdmin().from('bookings').select(LIST_SELECT).eq('status', 'confirmed').order('event_date')
  )
}

// "Sino hindi pa nakakabayad?"
export async function unpaidClients(chatId) {
  const { data } = await getSupabaseAdmin()
    .from('bookings')
    .select(`${LIST_SELECT}, balance`)
    .gt('balance', 0)
    .neq('status', 'cancelled')
    .order('balance', { ascending: false })
    .limit(10)

  const rows = data ?? []
  if (rows.length === 0) {
    await sendMessage({ chat_id: chatId, text: '✅ Lahat bayad na, boss!' })
    return
  }

  const lines = rows.map(
    (b) => `• ${b.clients?.name ?? 'Unknown'} — ${b.booking_code} — ${formatCurrency(b.balance)} kulang`
  )
  await sendMessage({ chat_id: chatId, text: `⚠️ <b>Hindi pa nakakabayad</b>\n\n${lines.join('\n')}` })
}

// "Ilang booking ngayong buwan?"
export async function bookingCountThisMonth(chatId) {
  const today = new Date()
  const { start, end } = getThisMonthBounds()
  const { count } = await getSupabaseAdmin()
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .gte('event_date', start)
    .lte('event_date', end)
    .neq('status', 'cancelled')

  await sendMessage({
    chat_id: chatId,
    text: `📊 ${count ?? 0} bookings this ${monthLabel(today.getMonth())}.`,
  })
}

// "Ilang events total?"
export async function totalEventsCount(chatId) {
  const { count } = await getSupabaseAdmin()
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'cancelled')

  await sendMessage({ chat_id: chatId, text: `📊 ${count ?? 0} bookings total (all-time).` })
}

// Shared lookup for "Si Maria bayad na ba?" / "Magkano pa kulang ni Maria?" / "Ano status ni Maria?"
async function lookupClient(chatId, name, notFoundExtra = '') {
  const { candidates } = await findBookingCandidates(name)
  if (candidates.length === 0) {
    await sendMessage({ chat_id: chatId, text: `Wala akong nahanap na booking para kay "${name}".${notFoundExtra}` })
    return null
  }
  return candidates
}

// "Si Maria bayad na ba?"
export async function clientPaymentStatus(chatId, name) {
  const candidates = await lookupClient(chatId, name)
  if (!candidates) return

  const lines = candidates.map((b) => {
    const status = Number(b.balance) <= 0 ? 'Fully paid ✅' : `May balance pa: ${formatCurrency(b.balance)}`
    return `• ${b.booking_code} (${b.event_type}, ${formatDate(b.event_date)}) — ${status}`
  })
  await sendMessage({ chat_id: chatId, text: `💵 <b>${name}</b>\n\n${lines.join('\n')}` })
}

// "Magkano pa kulang ni [name]?"
export async function clientBalance(chatId, name) {
  const candidates = await lookupClient(chatId, name)
  if (!candidates) return

  const lines = candidates.map((b) => `• ${b.booking_code} — ${formatCurrency(b.balance)} kulang`)
  await sendMessage({ chat_id: chatId, text: `💵 <b>${name}</b>\n\n${lines.join('\n')}` })
}

// "Ano status ni [name]?" — full booking detail(s), reuses the same card style as /booking.
export async function clientFullStatus(chatId, name) {
  const candidates = await lookupClient(chatId, name)
  if (!candidates) return

  for (const b of candidates.slice(0, 3)) {
    await sendMessage({
      chat_id: chatId,
      text:
        `📋 <b>${b.booking_code}</b>\n` +
        `Client: ${b.clients?.name ?? '—'}\n` +
        `Phone: ${b.clients?.phone ?? '—'}\n` +
        `Event: ${b.event_type} — ${formatDate(b.event_date)}\n` +
        `Venue: ${b.venue ?? '—'}\n` +
        `Pax: ${b.pax ?? '—'}\n` +
        `Status: ${b.status}\n` +
        `Total: ${formatCurrency(b.total_amount)}\n` +
        `Balance: ${formatCurrency(b.balance)}`,
    })
  }
}
