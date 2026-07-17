import { findBookingCandidates } from '../parseBooking.js'
import { sendMessage, editMessageText, inlineKeyboard } from '../telegram.js'
import { createPendingAction, deletePendingAction } from '../state.js'
import { formatCurrency, formatDate } from '../format.js'

// callback_data stays well under Telegram's 64-byte limit by referencing
// a candidate's INDEX into pending_action.candidates (stored server-side),
// never the booking's own UUID — "st:pick:<state_id>:<index>", not
// "st:pick:<state_id>:<booking_uuid>" (which alone would blow the budget).

export function bookingSummaryLine(b) {
  return `${b.clients?.name ?? 'Unknown'} — ${b.event_type} — ${formatDate(b.event_date)} — ${b.booking_code}`
}

export function bookingDetailCard(b) {
  return (
    `📋 <b>${b.booking_code}</b>\n` +
    `Client: ${b.clients?.name ?? '—'}\n` +
    `Phone: ${b.clients?.phone ?? '—'}\n` +
    `Event: ${b.event_type} — ${formatDate(b.event_date)}\n` +
    `Venue: ${b.venue ?? '—'}\n` +
    `Pax: ${b.pax ?? '—'}\n` +
    `Status: ${b.status}\n` +
    `Total: ${formatCurrency(b.total_amount)}\n` +
    `Balance: ${formatCurrency(b.balance)}`
  )
}

export async function booking(chatId, term) {
  if (!term) {
    await sendMessage({ chat_id: chatId, text: 'Sino/ano hahanapin? Format: /booking <pangalan o code>' })
    return
  }

  const { candidates } = await findBookingCandidates(term)

  if (candidates.length === 0) {
    await sendMessage({ chat_id: chatId, text: `Wala akong nahanap na booking para sa "${term}".` })
    return
  }

  if (candidates.length === 1) {
    await sendMessage({ chat_id: chatId, text: bookingDetailCard(candidates[0]) })
    return
  }

  const capped = candidates.slice(0, 8)
  const state = await createPendingAction(chatId, { type: 'pick_booking', purpose: 'search', candidates: capped })
  const rows = capped.map((b, idx) => [{ text: bookingSummaryLine(b), callback_data: `st:pick:${state.id}:${idx}` }])
  rows.push([{ text: '❌ Cancel', callback_data: `st:cancel:${state.id}` }])

  await sendMessage({
    chat_id: chatId,
    text: `May ${candidates.length} nahanap ako para sa "${term}". Alin?`,
    reply_markup: inlineKeyboard(rows),
  })
}

/** Resolves a "search" purpose pick_booking callback — just shows the chosen booking's detail card. */
export async function resolveSearchPick(pending, chatId, messageId, index) {
  const b = pending.pending_action.candidates?.[index]
  await deletePendingAction(pending.id)
  if (!b) {
    await editMessageText({ chat_id: chatId, message_id: messageId, text: '⌛ Expired na ito. Type mo ulit yung /booking mo.' })
    return
  }
  await editMessageText({ chat_id: chatId, message_id: messageId, text: bookingDetailCard(b) })
}
