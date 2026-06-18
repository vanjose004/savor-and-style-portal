// Default per-event pay rates. A staff member's `rate_override` (set on
// their profile, e.g. ₱900 for a senior waiter) wins over these when set.
export const PAYROLL_RATES = {
  'Team Leader': 1500,
  Waiter: 800,
  Cook: 700,
  Driver: 800,
}

export const PAYROLL_ROLES = Object.keys(PAYROLL_RATES)

// OT only applies to the Driver role, charged per hour past the baseline.
export const OT_RATE_DRIVER = 100
export const OT_BASELINE_HOURS = 8

export const BAHAY_TEAM_RATES = {
  labandera: 600,
  dishwasher: 400,
}

export const BAHAY_WORKER_TYPE_LABELS = {
  labandera: 'Labandera/Folder',
  dishwasher: 'Dishwasher',
}

/** base_rate = staff.rate_override ?? PAYROLL_RATES[role_at_event] */
export function getBaseRate(roleAtEvent, rateOverride) {
  if (rateOverride != null && rateOverride !== '') return Number(rateOverride)
  return PAYROLL_RATES[roleAtEvent] ?? 0
}

/** ot_pay = (role === 'Driver') ? ot_hours * 100 : 0 */
export function getOtPay(roleAtEvent, otHours) {
  if (roleAtEvent !== 'Driver') return 0
  return (Number(otHours) || 0) * OT_RATE_DRIVER
}
