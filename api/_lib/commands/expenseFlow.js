import { parseExpenseMessage } from '../parseExpense.js'
import { findBookingByCode } from '../parseBooking.js'
import { sendMessage, editMessageText, inlineKeyboard } from '../telegram.js'
import { createPendingAction, updatePendingAction, deletePendingAction } from '../state.js'
import { getSupabaseAdmin } from '../supabaseAdmin.js'
import { formatCurrency } from '../format.js'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, EXPENSE_PAYMENT_METHODS } from '../constants.js'

// Default handler for any message that isn't a recognized command or
// "Bayad ..." payment message — the bot always confirms before writing,
// never guesses-and-saves silently. Category is picked explicitly if the
// keyword parser in parseExpense.js couldn't guess one with confidence.

function categoryPickerButtons(stateId) {
  const rows = []
  for (let i = 0; i < EXPENSE_CATEGORIES.length; i += 2) {
    const pair = [EXPENSE_CATEGORIES[i], EXPENSE_CATEGORIES[i + 1]].filter(Boolean)
    rows.push(
      pair.map((cat) => ({
        text: EXPENSE_CATEGORY_LABELS[cat],
        callback_data: `st:cat:${stateId}:${EXPENSE_CATEGORIES.indexOf(cat)}`,
      }))
    )
  }
  rows.push([{ text: '❌ Cancel', callback_data: `st:cancel:${stateId}` }])
  return inlineKeyboard(rows)
}

function confirmCardText(action) {
  const category = action.category ? (EXPENSE_CATEGORY_LABELS[action.category] ?? action.category) : '—'
  let bookingLine = ''
  if (action.bookingRef) {
    bookingLine = action.bookingRefMatched
      ? `\nBooking: ${action.bookingRef} ✓`
      : `\nBooking: ${action.bookingRef} ⚠️ (walang nahanap na booking, check mo baka mali)`
  }
  return (
    `📝 <b>Expense</b>\n` +
    `${action.description} — ${formatCurrency(action.amount)}\n` +
    `Category: ${category}\n` +
    `Payment: ${action.paymentMethod}` +
    bookingLine
  )
}

function confirmCardButtons(stateId) {
  return inlineKeyboard([
    [{ text: '✅ Confirm', callback_data: `st:confirm:${stateId}` }],
    [{ text: '🏷️ Change Category', callback_data: `st:showcat:${stateId}` }],
    [{ text: '💳 Change Payment', callback_data: `st:paycycle:${stateId}` }],
    [{ text: '❌ Cancel', callback_data: `st:cancel:${stateId}` }],
  ])
}

export async function handleExpenseMessage(chatId, text) {
  const parsed = parseExpenseMessage(text)
  if (!parsed.ok) {
    await sendMessage({
      chat_id: chatId,
      text: 'Di ko na-gets, boss. Format: <i>Ingredients 1500</i> o <i>Food 12000 SS-032</i>',
    })
    return
  }

  // booking_ref is free text on the expenses table (no real FK — same as
  // the existing admin ExpenseNew.jsx form), but resolving it against a
  // real booking here lets the confirmation card flag a typo'd reference
  // before it's saved, and normalizes shorthand ("SS-032") to the full
  // stored booking_code ("SS-2026-032") when a match is found.
  let bookingRef = parsed.bookingRef
  let bookingRefMatched = false
  if (bookingRef) {
    const match = await findBookingByCode(bookingRef)
    if (match) {
      bookingRef = match.booking_code
      bookingRefMatched = true
    }
  }

  const action = {
    type: 'confirm_expense',
    description: parsed.description,
    amount: parsed.amount,
    bookingRef,
    bookingRefMatched,
    category: parsed.category,
    paymentMethod: EXPENSE_PAYMENT_METHODS[0],
  }

  const state = await createPendingAction(chatId, action)

  if (!action.category) {
    await sendMessage({
      chat_id: chatId,
      text: `📝 ${action.description} — ${formatCurrency(action.amount)}\n\nAnong category?`,
      reply_markup: categoryPickerButtons(state.id),
    })
    return
  }

  await sendMessage({ chat_id: chatId, text: confirmCardText(action), reply_markup: confirmCardButtons(state.id) })
}

// Note: "cancel" is intercepted centrally in api/telegram-webhook.js
// before it ever reaches here (deletes the pending row + generic reply),
// since that behavior is identical across every flow.
export async function handleExpenseCallback(pending, chatId, messageId, action, extra) {
  const stateId = pending.id

  if (action === 'showcat') {
    await editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: `📝 ${pending.pending_action.description} — ${formatCurrency(pending.pending_action.amount)}\n\nAnong category?`,
      reply_markup: categoryPickerButtons(stateId),
    })
    return
  }

  if (action === 'cat') {
    const category = EXPENSE_CATEGORIES[Number(extra)]
    if (!category) return
    const updated = await updatePendingAction(stateId, { category })
    await editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: confirmCardText(updated.pending_action),
      reply_markup: confirmCardButtons(stateId),
    })
    return
  }

  if (action === 'paycycle') {
    const currentIdx = EXPENSE_PAYMENT_METHODS.indexOf(pending.pending_action.paymentMethod)
    const nextMethod = EXPENSE_PAYMENT_METHODS[(currentIdx + 1) % EXPENSE_PAYMENT_METHODS.length]
    const updated = await updatePendingAction(stateId, { paymentMethod: nextMethod })
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
    const { data, error } = await getSupabaseAdmin()
      .from('expenses')
      .insert({
        category: a.category,
        description: a.description,
        amount: a.amount,
        is_event_expense: !!a.bookingRef,
        booking_ref: a.bookingRef,
        payment_method: a.paymentMethod,
      })
      .select('expense_code')
      .single()

    if (error) {
      // Keep the pending row alive so the admin's input isn't lost — they can retry.
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
      text: `✅ Na-save na! ${data.expense_code} · ${formatCurrency(a.amount)} · ${EXPENSE_CATEGORY_LABELS[a.category] ?? a.category}`,
    })
  }
}
