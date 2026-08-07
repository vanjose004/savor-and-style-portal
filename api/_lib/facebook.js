// Thin wrappers over the Facebook Messenger Send API + Graph API — plain
// fetch(), no SDK needed, same approach as api/_lib/telegram.js.

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0'

function requireToken() {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!token) throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN is not configured')
  return token
}

/** @param {{ recipientId: string, text: string }} params */
export async function sendMessage({ recipientId, text }) {
  const token = requireToken()
  const res = await fetch(`${GRAPH_API_BASE}/me/messages?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('[facebook] sendMessage failed:', data)
  }
  return data
}

/**
 * Best-effort sender display name for the "Recent Conversations" admin
 * panel — never throws, just returns null on any failure so a lookup
 * hiccup never blocks the actual reply.
 */
export async function getUserProfile(psid) {
  try {
    const token = requireToken()
    const res = await fetch(
      `${GRAPH_API_BASE}/${psid}?fields=first_name,last_name&access_token=${encodeURIComponent(token)}`
    )
    if (!res.ok) return null
    const data = await res.json()
    const name = [data.first_name, data.last_name].filter(Boolean).join(' ')
    return name || null
  } catch (err) {
    console.error('[facebook] getUserProfile failed:', err.message)
    return null
  }
}
