import { supabase } from '../lib/supabase'

// Inserts directly into the accounting tracker's `expenses` table — same
// Supabase project, RLS-gated by is_admin() there too, so this only ever
// succeeds when called from an admin session (payroll report approval,
// bahay team log save).
//
// `expense_code` is intentionally omitted: the accounting tracker's own
// `expenses_before_insert` trigger generates a unique EXP-YYYY-XXXX code
// when the column is left null. Re-implementing code generation here would
// duplicate that logic and risk colliding with it.

/** Called when an admin approves a TL's event payroll report. */
export async function insertPayrollExpense({ eventName, eventDate, bookingRef, totalAmount }) {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      category: 'staff_labor',
      description: `Event payroll — ${eventName} (${eventDate})`,
      amount: totalAmount,
      is_event_expense: true,
      booking_ref: bookingRef,
      payment_method: 'Cash',
      expense_date: new Date().toISOString().slice(0, 10),
    })
    .select('expense_code')
    .single()

  if (error) throw error
  return data.expense_code
}

/** Called when an admin saves a bahay team log entry. */
export async function insertBahayTeamExpense({ workerName, workerType, workDate, amount }) {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      category: 'staff_labor',
      description: `Bahay team — ${workerType} (${workerName}) ${workDate}`,
      amount,
      is_event_expense: false,
      booking_ref: null,
      payment_method: 'Cash',
      expense_date: workDate,
    })
    .select('expense_code')
    .single()

  if (error) throw error
  return data.expense_code
}
