import { parseBookingDate } from './dateParsing.js'
import { EVENT_TYPES } from './constants.js'

// "Bagong booking — Maria Santos, Birthday, July 25, 50 pax, 35000"
// Trigger phrase + exactly 5 comma-separated fields, in this fixed order
// (matches the spec exactly — no attempt at reordering/fuzzy field
// detection, so behavior stays predictable).
const TRIGGER_PATTERN = /^bagong\s+booking\s*[-–—:]*\s*(.*)$/i

const EVENT_TYPE_KEYWORDS = {
  'Adult Birthday': ['birthday', 'bday'],
  Debut: ['debut'],
  'Kiddie Party': ['kiddie', 'kids party', 'kiddo'],
  'Christening/Dedication': ['christening', 'dedication', 'binyag'],
  Wedding: ['wedding', 'kasal'],
  'House Blessing': ['house blessing', 'blessing', 'bahay'],
  Corporate: ['corporate', 'company'],
}

export function isNewBookingMessage(text) {
  return TRIGGER_PATTERN.test(text.trim())
}

/**
 * Splits on the first `maxFields - 1` commas only, so the LAST field can
 * safely contain its own commas — needed because the amount field is
 * routinely written with a thousands separator ("65,000"), which a plain
 * `.split(',')` would otherwise shred into extra bogus fields, silently
 * truncating the amount (e.g. "65,000" -> ["65", "000"] -> amount 65).
 */
function splitIntoFields(text, maxFields) {
  const fields = []
  let remaining = text
  for (let i = 0; i < maxFields - 1; i++) {
    const commaIdx = remaining.indexOf(',')
    if (commaIdx === -1) break
    fields.push(remaining.slice(0, commaIdx).trim())
    remaining = remaining.slice(commaIdx + 1)
  }
  fields.push(remaining.trim())
  return fields
}

/** Exact match against the real enum first, then keyword guess. Returns null if unrecognized (caller asks). */
function guessEventType(text) {
  const trimmed = text.trim()
  const exact = EVENT_TYPES.find((t) => t.toLowerCase() === trimmed.toLowerCase())
  if (exact) return exact

  const lower = trimmed.toLowerCase()
  for (const [type, keywords] of Object.entries(EVENT_TYPE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return type
  }
  return null
}

/**
 * @returns {{ ok: true, clientName: string, eventType: string|null, eventTypeRaw: string, eventDate: string, pax: number, totalAmount: number } | { ok: false, reason: string }}
 */
export function parseNewBookingMessage(text) {
  const match = text.trim().match(TRIGGER_PATTERN)
  if (!match) return { ok: false, reason: 'no_trigger' }

  const parts = splitIntoFields(match[1], 5).filter(Boolean)

  if (parts.length < 5) return { ok: false, reason: 'incomplete' }

  const [namePart, eventPart, datePart, paxPart, amountPart] = parts

  if (!namePart) return { ok: false, reason: 'invalid_fields' }

  const paxMatch = paxPart.match(/(\d+)/)
  const amountMatch = amountPart.match(/([\d,]+(?:\.\d{1,2})?)/)
  const eventDate = parseBookingDate(datePart)

  if (!paxMatch || !amountMatch || !eventDate) return { ok: false, reason: 'invalid_fields' }

  const pax = Number(paxMatch[1])
  const totalAmount = Number(amountMatch[1].replace(/,/g, ''))
  if (pax <= 0 || totalAmount <= 0) return { ok: false, reason: 'invalid_fields' }

  return {
    ok: true,
    clientName: namePart,
    eventType: guessEventType(eventPart),
    eventTypeRaw: eventPart,
    eventDate,
    pax,
    totalAmount,
  }
}
