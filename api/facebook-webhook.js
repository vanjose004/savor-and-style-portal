import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { sendMessage, getUserProfile } from './_lib/facebook.js'
import { buildSystemPrompt } from './_lib/chatKnowledge.js'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'
const MAX_HISTORY_MESSAGES = 20
const FALLBACK_REPLY = 'Sorry, medyo nagka-problema. Paki-message ulit o hintayin na lang namin ma-reply personally.'

const DEFAULT_GREETING =
  'Kumusta! 👋 Ako si Stella, ang virtual assistant ng Savor and Style Catering Services. Tanong lang tungkol sa packages, pricing, soft reserve, o kahit ano about sa amin!'

async function loadSettings() {
  const { data, error } = await getSupabaseAdmin()
    .from('messenger_bot_settings')
    .select('is_enabled, system_prompt, greeting_message')
    .eq('id', true)
    .maybeSingle()

  if (error) {
    console.error('[facebook-webhook] Failed to load messenger_bot_settings, using defaults:', error.message)
  }

  return {
    isEnabled: data?.is_enabled ?? true,
    systemPrompt: data?.system_prompt ?? '',
    greetingMessage: data?.greeting_message?.trim() || DEFAULT_GREETING,
  }
}

async function loadConversation(senderId) {
  const { data, error } = await getSupabaseAdmin()
    .from('messenger_conversations')
    .select('sender_name, messages')
    .eq('sender_id', senderId)
    .maybeSingle()

  if (error) {
    console.error('[facebook-webhook] Failed to load conversation:', error.message)
  }
  return data ?? null
}

async function saveConversation({ senderId, senderName, messages }) {
  const { error } = await getSupabaseAdmin()
    .from('messenger_conversations')
    .upsert(
      {
        sender_id: senderId,
        sender_name: senderName ?? null,
        messages: messages.slice(-MAX_HISTORY_MESSAGES),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'sender_id' }
    )

  if (error) {
    console.error('[facebook-webhook] Failed to save conversation:', error.message)
  }
}

async function getAIReply(apiKey, settings, history) {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: buildSystemPrompt(settings) }, ...history],
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    console.error('[facebook-webhook] OpenAI API error:', data)
    return null
  }
  return data.choices?.[0]?.message?.content?.trim() ?? null
}

async function handleIncomingMessage({ senderId, messageText, apiKey, settings }) {
  const existing = await loadConversation(senderId)
  const isNewConversation = !existing

  let history = existing?.messages ?? []
  let senderName = existing?.sender_name ?? null

  if (isNewConversation) {
    senderName = await getUserProfile(senderId)
    await sendMessage({ recipientId: senderId, text: settings.greetingMessage })
    history = [{ role: 'assistant', content: settings.greetingMessage }]
  }

  const nextHistory = [...history, { role: 'user', content: messageText }]
  const reply = (await getAIReply(apiKey, settings, nextHistory)) || FALLBACK_REPLY

  await sendMessage({ recipientId: senderId, text: reply })
  await saveConversation({
    senderId,
    senderName,
    messages: [...nextHistory, { role: 'assistant', content: reply }],
  })
}

// Facebook webhook — GET verifies the subscription, POST delivers events.
// Public/unauthenticated by nature (Facebook calls this directly); the
// verify token on GET and the page access token used for outbound replies
// are the actual gate, not this endpoint's own auth.
export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Prefer Vercel's auto-parsed req.query (matches the old Express bot's
    // req.query['hub.mode'] semantics exactly); fall back to parsing
    // req.url manually in case query ever comes back empty/undefined.
    const query = req.query && Object.keys(req.query).length > 0
      ? req.query
      : Object.fromEntries(new URL(req.url, 'http://localhost').searchParams)

    const mode = query['hub.mode']
    const token = query['hub.verify_token']
    const challenge = query['hub.challenge']
    const expected = process.env.FACEBOOK_VERIFY_TOKEN

    console.log('[facebook-webhook] GET verify — full query:', JSON.stringify(query))
    console.log('[facebook-webhook] GET verify — mode:', mode)
    console.log('[facebook-webhook] GET verify — received hub.verify_token:', JSON.stringify(token))
    console.log('[facebook-webhook] GET verify — expected FACEBOOK_VERIFY_TOKEN:', JSON.stringify(expected))
    console.log('[facebook-webhook] GET verify — tokens match:', token === expected)

    if (mode === 'subscribe' && expected && token === expected) {
      res.setHeader('Content-Type', 'text/plain')
      res.status(200).send(challenge)
    } else {
      res.status(403).send('Forbidden')
    }
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const body = req.body
  if (body?.object !== 'page') {
    res.status(404).send('Not Found')
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('[facebook-webhook] OPENAI_API_KEY is not configured — skipping all replies.')
  } else {
    const settings = await loadSettings()

    if (settings.isEnabled) {
      for (const entry of body.entry ?? []) {
        for (const event of entry.messaging ?? []) {
          const senderId = event.sender?.id
          const messageText = event.message?.text
          const isEcho = event.message?.is_echo

          if (!senderId || !messageText || isEcho) continue

          try {
            await handleIncomingMessage({ senderId, messageText, apiKey, settings })
          } catch (err) {
            console.error('[facebook-webhook] error handling message:', err)
          }
        }
      }
    }
  }

  // Ack after processing completes — Vercel's serverless runtime can freeze
  // the function as soon as a response is sent, killing any pending awaits
  // (same reasoning as the old bot's app.js).
  res.status(200).send('EVENT_RECEIVED')
}
