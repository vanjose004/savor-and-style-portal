import { getSupabaseAdmin } from './supabaseAdmin.js'

/**
 * Sums transactions (income) and expenses over a date range, or all-time
 * if startDate/endDate are omitted. Shared by summary.js and the NLU
 * financial query handlers so "this month's income" always means the
 * same thing everywhere in the bot.
 */
export async function totalsForRange(startDate, endDate) {
  const supabase = getSupabaseAdmin()

  let incomeQuery = supabase.from('transactions').select('amount')
  let expenseQuery = supabase.from('expenses').select('amount')

  if (startDate && endDate) {
    incomeQuery = incomeQuery.gte('transaction_date', startDate).lte('transaction_date', endDate)
    expenseQuery = expenseQuery.gte('expense_date', startDate).lte('expense_date', endDate)
  }

  const [incomeRes, expenseRes] = await Promise.all([incomeQuery, expenseQuery])

  const income = (incomeRes.data ?? []).reduce((sum, r) => sum + Number(r.amount), 0)
  const expenses = (expenseRes.data ?? []).reduce((sum, r) => sum + Number(r.amount), 0)
  return { income, expenses, net: income - expenses }
}
