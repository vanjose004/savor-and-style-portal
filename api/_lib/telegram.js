// Thin wrappers over the Telegram Bot API — plain fetch(), no SDK needed
// for the handful of methods this bot uses. parse_mode is HTML throughout
// (not MarkdownV2) since MarkdownV2 requires escaping ~18 special
// characters, a real footgun for freeform text like client names or
// expense descriptions the admin types in.

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot'

function apiUrl(method) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured')
  return `${TELEGRAM_API_BASE}${token}/${method}`
}

async function callTelegram(method, body) {
  const res = await fetch(apiUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ok === false) {
    console.error(`[telegram] ${method} failed:`, data.description ?? res.statusText)
  }
  return data
}

/** @param {{ chat_id: string|number, text: string, reply_markup?: object }} params */
export function sendMessage({ chat_id, text, reply_markup }) {
  return callTelegram('sendMessage', { chat_id, text, parse_mode: 'HTML', reply_markup })
}

/** @param {{ chat_id: string|number, message_id: number, text: string, reply_markup?: object }} params */
export function editMessageText({ chat_id, message_id, text, reply_markup }) {
  return callTelegram('editMessageText', { chat_id, message_id, text, parse_mode: 'HTML', reply_markup })
}

/** @param {{ callback_query_id: string, text?: string, show_alert?: boolean }} params */
export function answerCallbackQuery({ callback_query_id, text, show_alert }) {
  return callTelegram('answerCallbackQuery', { callback_query_id, text, show_alert })
}

/** Builds a Telegram inline_keyboard reply_markup from a 2D array of { text, callback_data }. */
export function inlineKeyboard(rows) {
  return { inline_keyboard: rows }
}
