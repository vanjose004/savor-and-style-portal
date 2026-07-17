import { getSupabaseAdmin } from '../supabaseAdmin.js'
import { sendMessage } from '../telegram.js'
import { formatCurrency } from '../format.js'
import { totalsForRange } from '../accounting.js'
import { toDateString, getThisMonthBounds, monthLabel } from '../dateParsing.js'

// "Meron pa ba?" / "Magkano pera ko?" — running cash on hand, all-time
// income minus all-time expenses (not scoped to a month, unlike /summary).
export async function netCash(chatId) {
  const { income, expenses, net } = await totalsForRange()
  await sendMessage({
    chat_id: chatId,
    text:
      `💰 <b>Cash on hand</b> (all-time)\n\n` +
      `Kinita: ${formatCurrency(income)}\n` +
      `Nagastos: ${formatCurrency(expenses)}\n` +
      `<b>Meron ka: ${formatCurrency(net)}</b>`,
  })
}

// "Magkano utang ko?" — outstanding payables (money the business owes).
export async function payablesSummary(chatId) {
  const { data } = await getSupabaseAdmin()
    .from('payables')
    .select('creditor_name, balance, status')
    .neq('status', 'paid')
    .order('balance', { ascending: false })
    .limit(10)

  const rows = data ?? []
  if (rows.length === 0) {
    await sendMessage({ chat_id: chatId, text: '✅ Wala kang utang, boss. Clear!' })
    return
  }

  const total = rows.reduce((sum, r) => sum + Number(r.balance), 0)
  const lines = rows.map((r) => `• ${r.creditor_name} — ${formatCurrency(r.balance)} (${r.status})`)

  await sendMessage({
    chat_id: chatId,
    text: `📋 <b>Utang mo</b>\n\n${lines.join('\n')}\n\n<b>Total: ${formatCurrency(total)}</b>`,
  })
}

// "Magkano na nakuha natin?" / "Magkano total sa buwan na to?" — income this month.
export async function incomeThisMonth(chatId) {
  const today = new Date()
  const { start } = getThisMonthBounds()
  const { income } = await totalsForRange(start, toDateString(today))
  await sendMessage({
    chat_id: chatId,
    text: `💰 Income this ${monthLabel(today.getMonth())}: <b>${formatCurrency(income)}</b>`,
  })
}

// "Magkano nagastos?" — expenses this month.
export async function expensesThisMonth(chatId) {
  const today = new Date()
  const { start } = getThisMonthBounds()
  const { expenses } = await totalsForRange(start, toDateString(today))
  await sendMessage({
    chat_id: chatId,
    text: `💸 Expenses this ${monthLabel(today.getMonth())}: <b>${formatCurrency(expenses)}</b>`,
  })
}
