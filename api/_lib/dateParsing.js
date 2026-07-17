// Shared Taglish date/period parsing for the NLU query handlers.
//
// "May" is both an English month name AND the extremely common Tagalog
// word "may" (there is/are) — it appears in almost every booking query
// ("May event ba bukas?"). To avoid every query false-matching "May" as
// the month, the May pattern requires a following day number ("may 20"),
// which the Tagalog usage never has (always followed by a noun, never a
// bare digit).

const MONTH_PATTERNS = [
  { index: 0, re: /\bjan(?:uary)?\b/i },
  { index: 1, re: /\bfeb(?:ruary)?\b/i },
  { index: 2, re: /\bmar(?:ch)?\b/i },
  { index: 3, re: /\bapr(?:il)?\b/i },
  { index: 4, re: /\bmay\s+\d{1,2}\b/i },
  { index: 5, re: /\bjun(?:e)?\b/i },
  { index: 6, re: /\bjul(?:y)?\b/i },
  { index: 7, re: /\baug(?:ust)?\b/i },
  { index: 8, re: /\bsep(?:t(?:ember)?)?\b/i },
  { index: 9, re: /\boct(?:ober)?\b/i },
  { index: 10, re: /\bnov(?:ember)?\b/i },
  { index: 11, re: /\bdec(?:ember)?\b/i },
]

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Deliberately NOT `date.toISOString().slice(0, 10)` — that reads the
// date back in UTC, which silently shifts it back a day for any date
// built from local y/m/d components (`new Date(year, month, day)`)
// whenever the runtime's local timezone offset is positive — including
// the Philippines (UTC+8), where this bot's users actually are. Reading
// the same local getters the date was constructed from keeps the two
// symmetric regardless of timezone.
export function toDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function monthLabel(monthIndex) {
  return MONTH_LABELS[monthIndex] ?? ''
}

/** Returns 0-11, or -1 if no month name is found in the text. */
export function findMonthIndex(text) {
  for (const { index, re } of MONTH_PATTERNS) {
    if (re.test(text)) return index
  }
  return -1
}

export function getMonthBounds(monthIndex, year = new Date().getFullYear()) {
  const start = new Date(year, monthIndex, 1)
  const end = new Date(year, monthIndex + 1, 0)
  return { start: toDateString(start), end: toDateString(end) }
}

export function getThisMonthBounds() {
  const now = new Date()
  return getMonthBounds(now.getMonth(), now.getFullYear())
}

/** Today through the next 6 days (7-day window), for "this week" queries. */
export function getThisWeekBounds() {
  const today = new Date()
  const end = new Date(today)
  end.setDate(end.getDate() + 6)
  return { start: toDateString(today), end: toDateString(end) }
}

/**
 * Parses "bukas" (tomorrow), "ngayon"/"today", or a month-name + day
 * ("July 20", "may 20") into a single YYYY-MM-DD date string.
 * Returns null if no specific date is found in the text.
 */
export function parseSpecificDate(text) {
  const lower = text.toLowerCase()
  const today = new Date()

  if (/\bbukas\b/.test(lower)) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return toDateString(tomorrow)
  }
  if (/\bngayon\b|\btoday\b/.test(lower)) {
    return toDateString(today)
  }

  const monthIdx = findMonthIndex(text)
  if (monthIdx === -1) return null

  const dayMatch = text.match(/\b(\d{1,2})\b/)
  if (!dayMatch) return null

  const day = Number(dayMatch[1])
  if (day < 1 || day > 31) return null

  return toDateString(new Date(today.getFullYear(), monthIdx, day))
}

/**
 * Parses a single date field for booking creation ("July 25", "2026-07-25",
 * "bukas") — same month/day parsing as parseSpecificDate, plus ISO format
 * and an explicit year if given. Unlike parseSpecificDate (used for
 * read-only "what's happening on this date" queries, where the current
 * year is always the right assumption), this rolls the year forward by
 * one when no year was given and the resulting date has already passed:
 * a booking dated "July 25" mentioned in December almost certainly means
 * next July, not five months ago. Returns null if nothing parseable.
 */
export function parseBookingDate(text) {
  const trimmed = text.trim()

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return isoMatch[0]

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (/\bbukas\b/i.test(trimmed)) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return toDateString(tomorrow)
  }
  if (/\bngayon\b|\btoday\b/i.test(trimmed)) {
    return toDateString(today)
  }

  const monthIdx = findMonthIndex(trimmed)
  if (monthIdx === -1) return null

  const dayMatch = trimmed.match(/\b(\d{1,2})\b/)
  if (!dayMatch) return null
  const day = Number(dayMatch[1])
  if (day < 1 || day > 31) return null

  const yearMatch = trimmed.match(/\b(20\d{2})\b/)
  const year = yearMatch ? Number(yearMatch[1]) : today.getFullYear()

  let date = new Date(year, monthIdx, day)
  if (!yearMatch && date < today) {
    date = new Date(year + 1, monthIdx, day)
  }

  return toDateString(date)
}
