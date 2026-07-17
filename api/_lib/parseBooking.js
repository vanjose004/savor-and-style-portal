import { getSupabaseAdmin } from './supabaseAdmin.js'

const SELECT_COLS =
  'id, booking_code, event_type, event_date, venue, pax, status, total_amount, balance, clients!inner(name, phone)'

/**
 * Fuzzy-finds bookings by booking_code or client name — same ILIKE
 * pattern used in src/pages/admin/BookingsList.jsx (clients!inner join
 * required for the .ilike('clients.name', ...) filter to work).
 *
 * When `paymentEligibleOnly` is set (payment flow only), candidates are
 * pre-filtered to bookings with an open balance and not cancelled —
 * paying a settled/cancelled booking is almost certainly a mistake.
 * Falls back to the unfiltered set (with `filtered: false`) if that
 * yields nothing, so the flow never silently dead-ends.
 *
 * @returns {{ candidates: object[], filtered: boolean }}
 */
export async function findBookingCandidates(term, { paymentEligibleOnly = false } = {}) {
  const trimmed = term.trim()
  if (!trimmed) return { candidates: [], filtered: false }

  const supabase = getSupabaseAdmin()
  const [byCode, byName] = await Promise.all([
    supabase.from('bookings').select(SELECT_COLS).ilike('booking_code', `%${trimmed}%`).limit(10),
    supabase.from('bookings').select(SELECT_COLS).ilike('clients.name', `%${trimmed}%`).limit(10),
  ])

  const merged = new Map()
  for (const row of [...(byCode.data ?? []), ...(byName.data ?? [])]) {
    merged.set(row.id, row)
  }
  const candidates = [...merged.values()]

  if (paymentEligibleOnly) {
    const eligible = candidates.filter((b) => Number(b.balance) > 0 && b.status !== 'cancelled')
    if (eligible.length > 0) return { candidates: eligible, filtered: true }
  }

  return { candidates, filtered: false }
}

/** Looks up a single booking by its exact (or ilike-normalized) booking_code, for expense booking_ref linking. */
export async function findBookingByCode(bookingCode) {
  const { data } = await getSupabaseAdmin()
    .from('bookings')
    .select('id, booking_code')
    .ilike('booking_code', `%${bookingCode}%`)
    .limit(1)
    .maybeSingle()
  return data ?? null
}
