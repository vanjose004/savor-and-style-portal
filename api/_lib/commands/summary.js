import { getSupabaseAdmin } from '../supabaseAdmin.js'
import { sendMessage } from '../telegram.js'
import { formatCurrency } from '../format.js'

function toDateString(date) {
  return date.toISOString().slice(0, 10)
}

async function totalsForRange(supabase, startDate, endDate) {
  const [incomeRes, expenseRes] = await Promise.all([
    supabase.from('transactions').select('amount').gte('transaction_date', startDate).lte('transaction_date', endDate),
    supabase.from('expenses').select('amount').gte('expense_date', startDate).lte('expense_date', endDate),
  ])

  const income = (incomeRes.data ?? []).reduce((sum, r) => sum + Number(r.amount), 0)
  const expenses = (expenseRes.data ?? []).reduce((sum, r) => sum + Number(r.amount), 0)
  return { income, expenses, net: income - expenses }
}

export async function summary(chatId) {
  const supabase = getSupabaseAdmin()
  const today = new Date()
  const todayStr = toDateString(today)
  const monthStartStr = toDateString(new Date(today.getFullYear(), today.getMonth(), 1))

  const [todayTotals, monthTotals] = await Promise.all([
    totalsForRange(supabase, todayStr, todayStr),
    totalsForRange(supabase, monthStartStr, todayStr),
  ])

  const monthLabel = today.toLocaleDateString('en-PH', { month: 'long' })

  const text =
    `📊 <b>Summary</b> as of ${today.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}\n\n` +
    `<b>Today:</b>\n` +
    `💰 Income: ${formatCurrency(todayTotals.income)}\n` +
    `💸 Expenses: ${formatCurrency(todayTotals.expenses)}\n` +
    `📈 Net: ${formatCurrency(todayTotals.net)}\n\n` +
    `<b>This Month (${monthLabel}):</b>\n` +
    `💰 Income: ${formatCurrency(monthTotals.income)}\n` +
    `💸 Expenses: ${formatCurrency(monthTotals.expenses)}\n` +
    `📈 Net: ${formatCurrency(monthTotals.net)}`

  await sendMessage({ chat_id: chatId, text })
}
