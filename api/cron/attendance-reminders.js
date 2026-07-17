import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { sendMessage } from '../_lib/telegram.js'
import { formatTime } from '../_lib/format.js'

// Triggered by .github/workflows/attendance-reminders.yml every ~10
// minutes (NOT Vercel Cron — Hobby tier is daily-granularity only, too
// coarse for a "30 minutes before" check). Auth is a shared secret, not
// Telegram's webhook secret — this endpoint has nothing to do with
// Telegram's own webhook delivery.
//
// Finds today's bookings starting in ~20-40 minutes (a band, not exactly
// 30, since the cron itself only runs every ~10 min), cross-references
// event_assignments against attendance_logs to find assigned-but-not-
// checked-in active staff, and warns once per (booking, staff) pair via
// attendance_reminder_log's unique constraint as the dedupe.

const REMINDER_WINDOW_MIN_MINUTES = 20
const REMINDER_WINDOW_MAX_MINUTES = 40

function isAuthorized(req) {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  return req.headers.authorization === `Bearer ${expected}`
}

// The Philippines has no DST, so a fixed +8h offset from UTC always gives
// PH wall-clock time — same idiom already proven in the bot's
// dateParsing.js after this exact bug class was caught once before.
function phNow() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000)
}

function phTodayString() {
  const ph = phNow()
  const y = ph.getUTCFullYear()
  const m = String(ph.getUTCMonth() + 1).padStart(2, '0')
  const d = String(ph.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// event_date/event_time are PH-local wall-clock values with no timezone
// of their own — subtracting 8h converts that wall-clock reading to the
// equivalent real UTC instant, comparable against Date.now(). Out-of-range
// hour values (e.g. hour - 8 going negative for a very-early event_time)
// are normalized correctly by JS's Date engine, no manual rollover needed.
function minutesUntilEvent(eventDate, eventTime) {
  const [year, month, day] = eventDate.split('-').map(Number)
  const [hour, minute] = eventTime.split(':').map(Number)
  const eventUtcMs = Date.UTC(year, month - 1, day, hour - 8, minute)
  return (eventUtcMs - Date.now()) / 60000
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const supabase = getSupabaseAdmin()
    const todayStr = phTodayString()

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, booking_code, event_type, event_date, event_time, venue')
      .eq('event_date', todayStr)
      .neq('status', 'cancelled')
      .not('event_time', 'is', null)

    if (bookingsError) throw bookingsError

    const candidates = (bookings ?? []).filter((b) => {
      const mins = minutesUntilEvent(b.event_date, b.event_time)
      return mins >= REMINDER_WINDOW_MIN_MINUTES && mins <= REMINDER_WINDOW_MAX_MINUTES
    })

    let remindersSent = 0

    for (const booking of candidates) {
      const [{ data: assignments }, { data: checkedIn }] = await Promise.all([
        supabase.from('event_assignments').select('staff_id, staff(name, is_active)').eq('booking_id', booking.id),
        supabase
          .from('attendance_logs')
          .select('staff_id')
          .eq('booking_id', booking.id)
          .eq('location_type', 'event'),
      ])

      const checkedInIds = new Set((checkedIn ?? []).map((r) => r.staff_id))
      const missing = (assignments ?? []).filter((a) => a.staff?.is_active && !checkedInIds.has(a.staff_id))

      for (const m of missing) {
        // Dedupe: the unique(booking_id, staff_id) constraint means a
        // second insert attempt for the same pair fails with 23505
        // (unique violation) — that's the expected "already reminded"
        // case, not a real error, so only warn on genuinely new inserts.
        const { data: inserted, error: insertError } = await supabase
          .from('attendance_reminder_log')
          .insert({ booking_id: booking.id, staff_id: m.staff_id })
          .select()

        if (insertError) {
          if (insertError.code !== '23505') {
            console.error('[attendance-reminders] insert error:', insertError)
          }
          continue
        }
        if (!inserted || inserted.length === 0) continue

        await sendMessage({
          chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID,
          text:
            `⏰ Paalala: hindi pa naka-check-in si ${m.staff?.name ?? 'Unknown'} para sa ` +
            `${booking.event_type} (${booking.booking_code}) sa ${booking.venue ?? 'TBD'} — ` +
            `${formatTime(booking.event_time)} na lang.`,
        })
        remindersSent++
      }
    }

    res.status(200).json({ checked: candidates.length, remindersSent })
  } catch (err) {
    console.error('[attendance-reminders] error:', err)
    res.status(500).json({ error: err.message })
  }
}
