import { isAuthorizedChat, isValidWebhookSecret } from './_lib/auth.js'
import { getPendingAction, cleanupExpiredForChat, clearPendingForChat, deletePendingAction } from './_lib/state.js'
import { sendMessage, answerCallbackQuery, editMessageText } from './_lib/telegram.js'
import { summary } from './_lib/commands/summary.js'
import { events } from './_lib/commands/events.js'
import { booking, resolveSearchPick } from './_lib/commands/booking.js'
import { help } from './_lib/commands/help.js'
import { handleExpenseMessage, handleExpenseCallback } from './_lib/commands/expenseFlow.js'
import { handlePaymentMessage, handlePaymentCallback, resolvePaymentBookingPick } from './_lib/commands/paymentFlow.js'
import { handleNewBookingMessage, handleNewBookingCallback } from './_lib/commands/createBookingFlow.js'
import { isNewBookingMessage } from './_lib/parseNewBooking.js'
import { tryHandleQuery } from './_lib/nlu.js'

// Telegram-facing webhook entrypoint. Every handler below is fully
// awaited before this function responds — Vercel doesn't guarantee a
// function keeps running after its HTTP response flushes, so
// respond-then-continue-working is unsafe here (unlike a persistent
// server). Always responds 200 to Telegram, even on internal error
// (logged + best-effort admin DM instead), so a bug on our end doesn't
// trigger a Telegram retry-storm.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!isValidWebhookSecret(req)) {
    res.status(401).json({ error: 'Invalid secret token' })
    return
  }

  const update = req.body ?? {}

  try {
    const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id

    if (!chatId || !isAuthorizedChat(chatId)) {
      console.log(`[telegram-webhook] ignored update from unauthorized/missing chat_id=${chatId}`)
      res.status(200).json({ ok: true })
      return
    }

    await cleanupExpiredForChat(chatId)

    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query, chatId)
    } else if (update.message?.text) {
      await handleMessage(update.message, chatId)
    }

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[telegram-webhook] unhandled error:', err)
    try {
      const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
      if (adminChatId) {
        await sendMessage({ chat_id: adminChatId, text: '⚠️ May error sa bot, boss. Check mo yung logs.' })
      }
    } catch (notifyErr) {
      console.error('[telegram-webhook] failed to notify admin of error:', notifyErr)
    }
    res.status(200).json({ ok: true })
  }
}

async function handleMessage(message, chatId) {
  const text = message.text.trim()

  if (text.startsWith('/summary')) {
    await clearPendingForChat(chatId)
    await summary(chatId)
    return
  }
  if (text.startsWith('/events')) {
    await clearPendingForChat(chatId)
    await events(chatId)
    return
  }
  if (text.startsWith('/booking')) {
    await clearPendingForChat(chatId)
    await booking(chatId, text.slice('/booking'.length).trim())
    return
  }
  if (text.startsWith('/start') || text.startsWith('/help')) {
    await clearPendingForChat(chatId)
    await help(chatId)
    return
  }

  // "Bayad ..." always starts a fresh payment flow; "Bagong booking ..."
  // starts a fresh booking-creation flow; a recognized read-only query
  // (see nlu.js) answers directly; anything else is treated as an
  // expense-logging attempt. None of these resume a pending flow via
  // free text — only button taps resume; a fresh message always means a
  // fresh intent.
  if (/^bayad\b/i.test(text)) {
    await clearPendingForChat(chatId)
    await handlePaymentMessage(chatId, text)
    return
  }

  if (isNewBookingMessage(text)) {
    await clearPendingForChat(chatId)
    await handleNewBookingMessage(chatId, text)
    return
  }

  await clearPendingForChat(chatId)
  const handled = await tryHandleQuery(chatId, text)
  if (handled) return

  await handleExpenseMessage(chatId, text)
}

async function handleCallbackQuery(callbackQuery, chatId) {
  const messageId = callbackQuery.message?.message_id
  const [, action, stateId, extra] = (callbackQuery.data ?? '').split(':')

  // Ack immediately to clear Telegram's loading spinner — separate API
  // call from the HTTP response to our caller, not a race on it.
  await answerCallbackQuery({ callback_query_id: callbackQuery.id })

  const pending = stateId ? await getPendingAction(stateId) : null

  if (!pending) {
    if (messageId) {
      await editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: '⌛ Expired na ito. Ulitin mo yung command/message mo.',
      })
    }
    return
  }

  if (action === 'cancel') {
    await deletePendingAction(pending.id)
    if (messageId) {
      await editMessageText({ chat_id: chatId, message_id: messageId, text: 'Okay, kinansel. 👍' })
    }
    return
  }

  const type = pending.pending_action.type

  if (type === 'pick_booking') {
    if (pending.pending_action.purpose === 'search') {
      await resolveSearchPick(pending, chatId, messageId, Number(extra))
    } else if (pending.pending_action.purpose === 'payment') {
      await resolvePaymentBookingPick(pending, chatId, messageId, Number(extra))
    }
    return
  }

  if (type === 'confirm_expense') {
    await handleExpenseCallback(pending, chatId, messageId, action, extra)
    return
  }

  if (type === 'confirm_payment') {
    await handlePaymentCallback(pending, chatId, messageId, action, extra)
    return
  }

  if (type === 'confirm_booking') {
    await handleNewBookingCallback(pending, chatId, messageId, action, extra)
  }
}
