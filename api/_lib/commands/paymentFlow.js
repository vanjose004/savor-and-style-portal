import { findBookingCandidates } from '../parseBooking.js'
import { bookingSummaryLine } from './booking.js'
import { sendMessage, editMessageText, inlineKeyboard } from '../telegram.js'
import { createPendingAction, updatePendingAction, deletePendingAction } from '../state.js'
import { getSupabaseAdmin } from '../supabaseAdmin.js'
import { formatCurrency } from '../format.js'
import { PAYMENT_METHODS, PAYMENT_TYPES, PAYMENT_TYPE_LABELS } from '../constants.js'

// "Bayad <name> <amount>" — payment_method and payment_type are both
// required DB fields the terse message can't provide, so this flow ALWAYS
// asks for both before confirming (never guesses financial fields).

const BAYAD_PATTERN = /^bayad\s+(.+?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s*$/i

function methodPickerButtons(stateId) {
  const rows = []
  for (let i = 0; i < PAYMENT_METHODS.length; i += 2) {
    const pair = [PAYMENT_METHODS[i], PAYMENT_METHODS[i + 1]].filter(Boolean)
    rows.push(pair.map((m) => ({ text: m, callback_data: `st:method:${stateId}:${PAYMENT_METHODS.indexOf(m)}` })))
  }
  rows.push([{ text: '❌ Cancel', callback_data: `st:cancel:${stateId}` }])
  return inlineKeyboard(rows)
}

function typePickerButtons(stateId) {
  const rows = PAYMENT_TYPES.map((t, i) => [{ text: PAYMENT_TYPE_LABELS[t], callback_data: `st:type:${stateId}:${i}` }])
  rows.push([{ text: '❌ Cancel', callback_data: `st:cancel:${stateId}` }])
  return inlineKeyboard(rows)
}

function confirmCardText(action) {
  return (
    `💵 <b>Payment</b>\n` +
    `${action.clientName} — ${action.bookingCode}\n` +
    `Amount: ${formatCurrency(action.amount)}\n` +
    `Method: ${action.paymentMethod}\n` +
    `Type: ${PAYMENT_TYPE_LABELS[action.paymentType] ?? action.paymentType}`
  )
}

function confirmCardButtons(stateId) {
  return inlineKeyboard([
    [{ text: '✅ Confirm', callback_data: `st:confirm:${stateId}` }],
    [{ text: '❌ Cancel', callback_data: `st:cancel:${stateId}` }],
  ])
}

async function askPaymentMethod(chatId, booking, amount) {
  const action = {
    type: 'confirm_payment',
    step: 'awaiting_method',
    bookingId: booking.id,
    bookingCode: booking.booking_code,
    clientName: booking.clients?.name ?? 'Unknown',
    amount,
    paymentMethod: null,
    paymentType: null,
  }
  const state = await createPendingAction(chatId, action)
  await sendMessage({
    chat_id: chatId,
    text: `💵 ${action.clientName} (${action.bookingCode}) — ${formatCurrency(amount)}\n\nPaano binayaran?`,
    reply_markup: methodPickerButtons(state.id),
  })
}

export async function handlePaymentMessage(chatId, text) {
  const match = text.match(BAYAD_PATTERN)
  if (!match) {
    await sendMessage({ chat_id: chatId, text: 'Format: <i>Bayad &lt;pangalan&gt; &lt;amount&gt;</i> — hal. "Bayad Maria 15000"' })
    return
  }

  const nameTerm = match[1].trim()
  const amount = Number(match[2].replace(/,/g, ''))
  if (!Number.isFinite(amount) || amount <= 0) {
    await sendMessage({ chat_id: chatId, text: 'Di ko na-gets yung amount, boss.' })
    return
  }

  const { candidates, filtered } = await findBookingCandidates(nameTerm, { paymentEligibleOnly: true })

  if (candidates.length === 0) {
    await sendMessage({ chat_id: chatId, text: `Wala akong nahanap na booking para kay "${nameTerm}".` })
    return
  }

  if (candidates.length === 1) {
    await askPaymentMethod(chatId, candidates[0], amount)
    return
  }

  const capped = candidates.slice(0, 8)
  const state = await createPendingAction(chatId, { type: 'pick_booking', purpose: 'payment', amount, candidates: capped })
  const rows = capped.map((b, idx) => [{ text: bookingSummaryLine(b), callback_data: `st:pick:${state.id}:${idx}` }])
  rows.push([{ text: '❌ Cancel', callback_data: `st:cancel:${state.id}` }])

  const prefix = filtered
    ? `May ${candidates.length} bukas pa ang balance na booking para kay "${nameTerm}". Alin?`
    : `Wala akong open balance kay "${nameTerm}", pero eto lahat ng booking niya. Alin?`

  await sendMessage({ chat_id: chatId, text: prefix, reply_markup: inlineKeyboard(rows) })
}

/** Resolves a "payment" purpose pick_booking callback — moves straight into the method picker. */
export async function resolvePaymentBookingPick(pending, chatId, messageId, index) {
  const b = pending.pending_action.candidates?.[index]
  const amount = pending.pending_action.amount
  await deletePendingAction(pending.id)

  if (!b) {
    await editMessageText({ chat_id: chatId, message_id: messageId, text: '⌛ Expired na ito. Type mo ulit yung Bayad mo.' })
    return
  }

  const action = {
    type: 'confirm_payment',
    step: 'awaiting_method',
    bookingId: b.id,
    bookingCode: b.booking_code,
    clientName: b.clients?.name ?? 'Unknown',
    amount,
    paymentMethod: null,
    paymentType: null,
  }
  const state = await createPendingAction(chatId, action)
  await editMessageText({
    chat_id: chatId,
    message_id: messageId,
    text: `💵 ${action.clientName} (${action.bookingCode}) — ${formatCurrency(amount)}\n\nPaano binayaran?`,
    reply_markup: methodPickerButtons(state.id),
  })
}

// Note: "cancel" is intercepted centrally in api/telegram-webhook.js
// before it ever reaches here (deletes the pending row + generic reply),
// since that behavior is identical across every flow.
export async function handlePaymentCallback(pending, chatId, messageId, action, extra) {
  const stateId = pending.id

  if (action === 'method') {
    const method = PAYMENT_METHODS[Number(extra)]
    if (!method) return
    const updated = await updatePendingAction(stateId, { paymentMethod: method, step: 'awaiting_type' })
    await editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: `💵 ${updated.pending_action.clientName} (${updated.pending_action.bookingCode}) — ${formatCurrency(updated.pending_action.amount)}\n\nAnong klaseng bayad?`,
      reply_markup: typePickerButtons(stateId),
    })
    return
  }

  if (action === 'type') {
    const type = PAYMENT_TYPES[Number(extra)]
    if (!type) return
    const updated = await updatePendingAction(stateId, { paymentType: type, step: 'awaiting_confirm' })
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
    // Only insert into `payments` — bookings.balance recalc and the
    // matching `transactions` income row are both handled automatically
    // by existing DB triggers (trg_payments_recalc_balance,
    // trg_payments_sync_to_accounting). Inserting into `transactions`
    // here too would double-count income.
    const { error } = await getSupabaseAdmin().from('payments').insert({
      booking_id: a.bookingId,
      amount: a.amount,
      payment_type: a.paymentType,
      payment_method: a.paymentMethod,
    })

    if (error) {
      await editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: `${confirmCardText(a)}\n\n⚠️ Hindi na-save: ${error.message}`,
        reply_markup: confirmCardButtons(stateId),
      })
      return
    }

    await deletePendingAction(stateId)
    await editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: `✅ Nai-log na yung bayad! ${formatCurrency(a.amount)} mula kay ${a.clientName} (${a.bookingCode}) — ${PAYMENT_TYPE_LABELS[a.paymentType] ?? a.paymentType} via ${a.paymentMethod}.`,
    })
  }
}
