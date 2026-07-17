import {
  netCash,
  payablesSummary,
  incomeThisMonth,
  expensesThisMonth,
} from './commands/financialQueries.js'
import {
  eventsOnDate,
  eventsForMonth,
  eventsThisWeek,
  pendingBookings,
  confirmedBookings,
  unpaidClients,
  bookingCountThisMonth,
  totalEventsCount,
  clientPaymentStatus,
  clientBalance,
  clientFullStatus,
} from './commands/bookingQueries.js'
import { parseSpecificDate, findMonthIndex } from './dateParsing.js'
import { formatDate } from './format.js'

// Rule-based Taglish intent classifier — no LLM call, kept fast/free/simple
// per the bot's existing design. Patterns are ordered MOST SPECIFIC FIRST
// (client-name lookups, then distinctive single keywords like "utang",
// then broader "events/booking + date" catch-alls last) since many
// queries share generic words like "magkano" — order is what prevents a
// specific query ("Magkano pa kulang ni Maria?") from being swallowed by
// a broader check ("magkano" + something else).
//
// Every check here was tested against the exact example phrases it's
// meant to handle before being considered done (see the test pass in the
// PR) — Taglish phrasing is ambiguous enough that "should work" isn't
// good enough without actually running it.

function extractName(text, patterns) {
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

/**
 * Tries to match `text` against a known read-only query intent and, if
 * matched, calls the handler and returns true. Returns false if nothing
 * matched — caller should fall through to expense-logging (the bot's
 * default for unrecognized free text).
 */
export async function tryHandleQuery(chatId, rawText) {
  const text = rawText.trim()

  // --- Client-specific lookups (most specific shape: "si X"/"ni X") ---
  let name = extractName(text, [/\bsi\s+(.+?)\s+bayad\s*na\s*ba\??$/i])
  if (name) {
    await clientPaymentStatus(chatId, name)
    return true
  }

  name = extractName(text, [
    /\bmagkano\s+(?:pa\s+)?kulang\s+ni\s+(.+?)\??$/i,
    /\bmagkano\s+(?:pa\s+)?(?:ang\s+)?balance\s+ni\s+(.+?)\??$/i,
  ])
  if (name) {
    await clientBalance(chatId, name)
    return true
  }

  name = extractName(text, [/\bano(?:ng)?\s+(?:ang\s+)?status\s+ni\s+(.+?)\??$/i])
  if (name) {
    await clientFullStatus(chatId, name)
    return true
  }

  // --- Financial (checked before generic bookings block) ---
  if (/\butang\b/i.test(text)) {
    await payablesSummary(chatId)
    return true
  }

  if (
    /\bmeron\s+pa\s+ba\b/i.test(text) ||
    /\bmagkano\s+(?:ang\s+)?pera\s+ko\b/i.test(text) ||
    /\bmay\s+pera\s+pa\s+ba\b/i.test(text)
  ) {
    await netCash(chatId)
    return true
  }

  if (
    /\bnakuha\b/i.test(text) ||
    /\bkinita\b/i.test(text) ||
    (/\bmagkano\b/i.test(text) && /\btotal\b/i.test(text) && /\bbuwan\b/i.test(text))
  ) {
    await incomeThisMonth(chatId)
    return true
  }

  if (/\b(na)?gastos\b/i.test(text) || /\bexpenses\b/i.test(text)) {
    await expensesThisMonth(chatId)
    return true
  }

  // --- Bookings: fixed lists ---
  if (/\bhindi\s+pa\s+nakakabayad\b/i.test(text)) {
    await unpaidClients(chatId)
    return true
  }

  if (/\bpending\s+bookings?\b/i.test(text)) {
    await pendingBookings(chatId)
    return true
  }

  if (/\bconfirmed\s+bookings?\b/i.test(text)) {
    await confirmedBookings(chatId)
    return true
  }

  if (/\bilang\s+booking/i.test(text) && /\bbuwan\b/i.test(text)) {
    await bookingCountThisMonth(chatId)
    return true
  }

  if (/\bilang\s+events?\b/i.test(text) && /\btotal\b/i.test(text)) {
    await totalEventsCount(chatId)
    return true
  }

  // --- Bookings: date/month/week (broadest — checked last) ---
  if (/\bevents?\b/i.test(text) || /\bbooking\b/i.test(text)) {
    if (/\blinggo\b/i.test(text)) {
      await eventsThisWeek(chatId)
      return true
    }

    const specificDate = parseSpecificDate(text)
    if (specificDate) {
      const label = /\bbukas\b/i.test(text)
        ? 'bukas'
        : /\bngayon\b|\btoday\b/i.test(text)
          ? 'ngayon'
          : formatDate(specificDate)
      await eventsOnDate(chatId, specificDate, label)
      return true
    }

    const monthIdx = findMonthIndex(text)
    if (monthIdx !== -1) {
      await eventsForMonth(chatId, monthIdx)
      return true
    }
  }

  return false
}
