import { getSupabaseAdmin } from '../supabaseAdmin.js'
import { sendMessage, editMessageText, inlineKeyboard } from '../telegram.js'
import { createPendingAction, updatePendingAction, deletePendingAction } from '../state.js'
import { formatCurrency, formatDate } from '../format.js'
import { EVENT_TYPES } from '../constants.js'
import { parseNewBookingMessage } from '../parseNewBooking.js'

// "Bagong booking — Maria Santos, Birthday, July 25, 50 pax, 35000" —
// always confirms before writing, same as every other bot write action.
// The actual insert is a single atomic RPC (create_admin_booking,
// migration 31) rather than two separate client/booking INSERTs from
// here, so a failure never leaves an orphaned client or risks a
// duplicate on retry.

function eventTypePickerButtons(stateId) {
  const rows = []
  for (let i = 0; i < EVENT_TYPES.length; i += 2) {
    const pair = [EVENT_TYPES[i], EVENT_TYPES[i + 1]].filter(Boolean)
    rows.push(
      pair.map((t) => ({ text: t, callback_data: `st:evtype:${stateId}:${EVENT_TYPES.indexOf(t)}` }))
    )
  }
  rows.push([{ text: '❌ Cancel', callback_data: `st:cancel:${stateId}` }])
  return inlineKeyboard(rows)
}

function confirmCardText(action) {
  return (
    `🆕 <b>New Booking</b>\n` +
    `Client: ${action.clientName}\n` +
    `Event: ${action.eventType ?? '—'}\n` +
    `Date: ${formatDate(action.eventDate)}\n` +
    `Pax: ${action.pax}\n` +
    `Amount: ${formatCurrency(action.totalAmount)}`
  )
}

function confirmCardButtons(stateId) {
  return inlineKeyboard([
    [{ text: '✅ Confirm', callback_data: `st:confirm:${stateId}` }],
    [{ text: '🎉 Change Event Type', callback_data: `st:showevtype:${stateId}` }],
    [{ text: '❌ Cancel', callback_data: `st:cancel:${stateId}` }],
  ])
}

export async function handleNewBookingMessage(chatId, text) {
  const parsed = parseNewBookingMessage(text)

  if (!parsed.ok) {
    await sendMessage({
      chat_id: chatId,
      text:
        'Di ko na-gets, boss. Format:\n<i>Bagong booking — Pangalan, Event Type, Date, Pax, Amount</i>\n\n' +
        'Hal: <i>Bagong booking — Maria Santos, Birthday, July 25, 50 pax, 35000</i>',
    })
    return
  }

  const action = {
    type: 'confirm_booking',
    clientName: parsed.clientName,
    eventType: parsed.eventType,
    eventDate: parsed.eventDate,
    pax: parsed.pax,
    totalAmount: parsed.totalAmount,
  }

  const state = await createPendingAction(chatId, action)

  if (!action.eventType) {
    await sendMessage({
      chat_id: chatId,
      text: `🆕 ${action.clientName} — ${formatDate(action.eventDate)}\n\nDi ko na-gets yung event type na "${parsed.eventTypeRaw}". Alin dito?`,
      reply_markup: eventTypePickerButtons(state.id),
    })
    return
  }

  await sendMessage({ chat_id: chatId, text: confirmCardText(action), reply_markup: confirmCardButtons(state.id) })
}

export async function handleNewBookingCallback(pending, chatId, messageId, action, extra) {
  const stateId = pending.id

  if (action === 'showevtype') {
    await editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: `🆕 ${pending.pending_action.clientName} — ${formatDate(pending.pending_action.eventDate)}\n\nAlin ang event type?`,
      reply_markup: eventTypePickerButtons(stateId),
    })
    return
  }

  if (action === 'evtype') {
    const eventType = EVENT_TYPES[Number(extra)]
    if (!eventType) return
    const updated = await updatePendingAction(stateId, { eventType })
    await editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: confirmCardText(updated.pending_action),
      reply_markup: confirmCardButtons(stateId),
    })
    return
  }

  if (action === 'confirm') {
    const a = pending.pending_action
    const { data, error } = await getSupabaseAdmin().rpc('create_admin_booking', {
      p_client_name: a.clientName,
      p_event_type: a.eventType,
      p_event_date: a.eventDate,
      p_pax: a.pax,
      p_total_amount: a.totalAmount,
    })

    if (error) {
      // The RPC is a single transaction — nothing was inserted, so
      // tapping Confirm again is always safe to retry.
      await editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: `${confirmCardText(a)}\n\n⚠️ Hindi na-save: ${error.message}`,
        reply_markup: confirmCardButtons(stateId),
      })
      return
    }

    const booking = data?.[0]
    await deletePendingAction(stateId)
    await editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text:
        `✅ Nagawa na! <b>${booking?.booking_code}</b>\n` +
        `${a.clientName} — ${a.eventType} — ${formatDate(a.eventDate)} — ${a.pax} pax — ${formatCurrency(a.totalAmount)}`,
    })
  }
}
