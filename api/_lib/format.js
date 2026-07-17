// Reuses the app's own formatting helpers instead of re-implementing peso
// formatting here — single source of truth. src/lib/utils.js is pure JS
// (no Vite-only syntax), and date-fns is a runtime `dependency` (not
// devDependency), so Vercel's function bundler can trace this import
// cleanly from api/*.js entrypoints.
// formatTime is safe to reuse as-is (unlike formatDateTime/formatTime's
// timestamptz-formatting cousins): it only ever sets/reads back a LOCAL
// hour/minute on a throwaway Date, with no UTC-instant conversion in
// between — self-consistent regardless of the runtime's own timezone, so
// it correctly formats a bare "HH:MM" wall-clock value (like
// bookings.event_time, which has no associated timezone of its own) the
// same way whether it runs in a PH browser or a UTC Vercel function.
export { formatCurrency, formatDate, formatTime } from '../../src/lib/utils.js'

// Deliberately NOT re-exporting src/lib/utils.js's formatTime/formatDateTime
// here — those call toLocaleTimeString/toLocaleString WITHOUT an explicit
// timeZone, so they only read as PH-correct today because they've only
// ever run in a browser physically in the Philippines. Vercel functions
// run in UTC; reusing them unchanged would silently print UTC time in a
// Telegram alert — the same bug class already caught once in this
// project's Telegram bot date parsing. Always pass timeZone explicitly.
export function formatTimePH(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

