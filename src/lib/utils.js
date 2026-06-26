/** Merge class names, skipping falsy values. */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/** Format a number as Philippine peso currency, e.g. ₱5,000.00 */
export function formatCurrency(amount) {
  const value = Number(amount) || 0
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(value)
}

/** Format an ISO date string (YYYY-MM-DD) as e.g. "January 5, 2026" */
export function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(`${dateString}T00:00:00`)
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Format a time string (HH:MM:SS) as e.g. "2:30 PM" */
export function formatTime(timeString) {
  if (!timeString) return ''
  const [hours, minutes] = timeString.split(':')
  const date = new Date()
  date.setHours(Number(hours), Number(minutes), 0)
  return date.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** Format a timestamp as e.g. "January 5, 2026, 2:30 PM" */
export function formatDateTime(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** Number of calendar days between today and an ISO date string (negative if in the past). */
export function getDaysUntil(dateString) {
  if (!dateString) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${dateString}T00:00:00`)
  return Math.round((target - today) / 86400000)
}

/** Compute paid amount and progress percentage from a booking total and balance. */
export function getPaymentProgress(totalAmount, balance) {
  const total = Number(totalAmount) || 0
  const remaining = Number(balance) || 0
  const paid = Math.max(total - remaining, 0)
  const percent = total > 0 ? Math.min(Math.round((paid / total) * 100), 100) : 0
  return { paid, remaining, percent }
}
