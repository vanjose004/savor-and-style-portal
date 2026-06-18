import { STAFF_ROLE_LABELS } from '../lib/constants'
import { PAYROLL_ROLES } from '../config/payrollRates'

function normalize(text) {
  return (text ?? '').toLowerCase().replace(/_/g, ' ').trim()
}

/** The role to use for an assignment: the per-event override if set, else the staff member's home role label. */
export function effectiveRoleLabel(roleForEvent, staffRole) {
  return roleForEvent?.trim() || STAFF_ROLE_LABELS[staffRole] || staffRole
}

/** Whether an assignment's effective role is Team Leader (role_for_event is free text, so this compares loosely). */
export function isTeamLeaderAssignment(roleForEvent, staffRole) {
  return normalize(effectiveRoleLabel(roleForEvent, staffRole)) === 'team leader'
}

/** Maps a free-text effective role onto one of the four payroll rate keys, defaulting to Waiter. */
export function toCanonicalPayrollRole(label) {
  const normalized = normalize(label)
  return PAYROLL_ROLES.find((role) => normalized.includes(normalize(role))) ?? 'Waiter'
}
