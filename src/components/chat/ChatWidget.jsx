import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { BUSINESS } from '../../lib/constants'
import { cn } from '../../lib/utils'

const STORAGE_KEY = 'ss-chat-history'
const MAROON = '#6B1A1A'
const GOLD = '#B8962E'

const GREETING = {
  role: 'assistant',
  content: `Kumusta! 👋 Ako si Stella, ang virtual assistant ng ${BUSINESS.name}. Tanong lang tungkol sa packages, pricing, soft reserve, o kahit ano about sa amin!`,
}

function loadHistory() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [GREETING]
  } catch {
    return [GREETING]
  }
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(loadHistory)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {
      // sessionStorage unavailable (private mode etc.) — chat still works, just isn't persisted.
    }
  }, [messages])

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open, sending])

  const handleSend = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return

    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      if (!res.ok || !data.reply) throw new Error(data.error || 'Chat failed')
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, medyo nagka-problema sa chat. Pwede mo kaming i-message diretso sa Facebook: ${BUSINESS.messengerUrl}`,
        },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        className="fixed bottom-20 right-5 md:bottom-5 z-40 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105"
        style={{ backgroundColor: MAROON }}
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
      </button>

      {open && (
        <div
          className="fixed bottom-36 right-5 md:bottom-24 z-40 w-[90vw] max-w-sm h-[65vh] md:h-[70vh] max-h-[560px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border"
          style={{ borderColor: 'rgba(184,150,46,0.4)' }}
        >
          <div className="px-4 py-3 flex items-center gap-2 shrink-0" style={{ backgroundColor: MAROON }}>
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
            <div className="min-w-0">
              <p className="font-heading font-semibold text-sm text-white truncate">Stella · Savor and Style</p>
              <p className="text-xs text-white/70">Usually replies instantly</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ backgroundColor: '#faf6ee' }}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                  m.role === 'user' ? 'ml-auto text-white' : 'bg-white border border-gold/20 text-text-dark'
                )}
                style={m.role === 'user' ? { backgroundColor: GOLD } : undefined}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="bg-white border border-gold/20 rounded-2xl px-3.5 py-2 text-sm text-text-muted w-fit">
                Nagta-type…
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-gold/20 flex gap-2 shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              disabled={sending}
              className="flex-1 min-w-0 rounded-full border border-gold/30 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wine/20"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-40 shrink-0 transition-opacity"
              style={{ backgroundColor: MAROON }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
