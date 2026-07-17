import { sendMessage } from '../telegram.js'
import { formatCurrency } from '../format.js'
import { totalsForRange } from '../accounting.js'
import { toDateString, getThisMonthBounds, monthLabel } from '../dateParsing.js'

export async function summary(chatId) {
  const today = new Date()
  const todayStr = toDateString(today)
  const { start: monthStartStr } = getThisMonthBounds()

  const [todayTotals, monthTotals] = await Promise.all([
    totalsForRange(todayStr, todayStr),
    totalsForRange(monthStartStr, todayStr),
  ])

  const text =
    `📊 <b>Summary</b> as of ${today.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}\n\n` +
    `<b>Today:</b>\n` +
    `💰 Income: ${formatCurrency(todayTotals.income)}\n` +
    `💸 Expenses: ${formatCurrency(todayTotals.expenses)}\n` +
    `📈 Net: ${formatCurrency(todayTotals.net)}\n\n` +
    `<b>This Month (${monthLabel(today.getMonth())}):</b>\n` +
    `💰 Income: ${formatCurrency(monthTotals.income)}\n` +
    `💸 Expenses: ${formatCurrency(monthTotals.expenses)}\n` +
    `📈 Net: ${formatCurrency(monthTotals.net)}`

  await sendMessage({ chat_id: chatId, text })
}
