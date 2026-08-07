import { buildSystemPrompt } from './_lib/chatKnowledge.js'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-5'
const MAX_HISTORY_MESSAGES = 20

// Public endpoint (no auth) — called directly from the floating chat widget
// on /landing and /. Worst case for abuse is wasted API spend, not a data
// leak: the widget only ever sends free-text chat turns, and the system
// prompt is built server-side from public marketing data already shown on
// the pages the widget lives on.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[chat] ANTHROPIC_API_KEY is not configured')
    res.status(500).json({ error: 'Chat is not configured yet.' })
    return
  }

  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : []
  const messages = incoming
    .filter(
      (m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim()
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.trim() }))

  if (messages.length === 0) {
    res.status(400).json({ error: 'messages is required' })
    return
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: buildSystemPrompt(),
        messages,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[chat] Anthropic API error:', data)
      res.status(502).json({ error: 'Chat service is temporarily unavailable.' })
      return
    }

    const reply = data.content?.find((block) => block.type === 'text')?.text?.trim()
    if (!reply) {
      res.status(502).json({ error: 'Chat service is temporarily unavailable.' })
      return
    }

    res.status(200).json({ reply })
  } catch (err) {
    console.error('[chat] error:', err)
    res.status(500).json({ error: err.message })
  }
}
