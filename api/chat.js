import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { buildSystemPrompt } from './_lib/chatKnowledge.js'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_MAX_TOKENS = 500
const MAX_HISTORY_MESSAGES = 20

async function loadSettings() {
  const { data, error } = await getSupabaseAdmin()
    .from('chatbot_settings')
    .select('bot_name, system_prompt, is_enabled, model, max_tokens')
    .eq('id', true)
    .maybeSingle()

  if (error) {
    console.error('[chat] Failed to load chatbot_settings, using defaults:', error.message)
  }

  // Fail open with sane defaults — a missing/unreadable settings row
  // shouldn't take the whole widget down.
  return {
    botName: data?.bot_name ?? 'Stella',
    systemPrompt: data?.system_prompt ?? '',
    isEnabled: data?.is_enabled ?? true,
    model: data?.model || DEFAULT_MODEL,
    maxTokens: data?.max_tokens || DEFAULT_MAX_TOKENS,
  }
}

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

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('[chat] OPENAI_API_KEY is not configured')
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
    const settings = await loadSettings()

    if (!settings.isEnabled) {
      res.status(403).json({ error: 'Chat is currently disabled.' })
      return
    }

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: settings.maxTokens,
        messages: [
          { role: 'system', content: buildSystemPrompt(settings) },
          ...messages,
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[chat] OpenAI API error:', data)
      res.status(502).json({ error: 'Chat service is temporarily unavailable.' })
      return
    }

    const reply = data.choices?.[0]?.message?.content?.trim()
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
