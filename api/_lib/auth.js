// Single hardcoded admin chat — every other chat_id is silently ignored
// (no reply at all), and every webhook request must carry the secret
// token Telegram was configured (via setWebhook) to send back, so a
// spoofed POST to the public webhook URL can't reach the handler logic.

export function isAuthorizedChat(chatId) {
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (!adminChatId || !chatId) return false
  return String(chatId) === String(adminChatId)
}

export function isValidWebhookSecret(req) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!expected) return false
  return req.headers['x-telegram-bot-api-secret-token'] === expected
}
