import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { useClientMembership } from '../../hooks/useClientMembership'
import { formatDateTime, cn } from '../../lib/utils'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Textarea from '../../components/ui/Textarea'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const POLL_INTERVAL_MS = 15000

export default function Messages() {
  const { showToast } = useToast()
  const { membership } = useClientMembership()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const loadMessages = async (bookingId) => {
    const { data } = await supabase
      .from('portal_messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
  }

  useEffect(() => {
    if (!membership?.booking_id) return
    let cancelled = false

    async function load() {
      setLoading(true)
      await loadMessages(membership.booking_id)
      await supabase.rpc('client_mark_portal_messages_read', { p_booking_id: membership.booking_id })
      if (!cancelled) setLoading(false)
    }

    load()
    const interval = setInterval(() => loadMessages(membership.booking_id), POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [membership?.booking_id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    if (!body.trim() || !membership) return

    setSending(true)
    const { error } = await supabase.from('portal_messages').insert({
      booking_id: membership.booking_id,
      sender_member_id: membership.id,
      sender_is_admin: false,
      body: body.trim(),
    })
    setSending(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    const messageBody = body.trim()
    setBody('')
    loadMessages(membership.booking_id)

    const { data: sessionData } = await supabase.auth.getSession()
    fetch('/api/notify-portal-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData?.session?.access_token}` },
      body: JSON.stringify({ bookingId: membership.booking_id, body: messageBody }),
    }).catch(() => {})
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <Card title="Messages">
      <div className="h-[50vh] overflow-y-auto flex flex-col gap-3 pb-3">
        {messages.length === 0 ? (
          <EmptyState title="No messages yet" description="Send your coordinator a message — menu questions, styling updates, anything." />
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                m.sender_is_admin ? 'bg-cream border border-gold/20 text-text-dark' : 'ml-auto bg-wine text-warm-white'
              )}
            >
              {m.body}
              <p className={cn('text-xs mt-1', m.sender_is_admin ? 'text-text-muted' : 'text-warm-white/70')}>
                {formatDateTime(m.created_at)}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-gold/10 pt-4">
        <Textarea
          className="flex-1"
          rows={2}
          placeholder="Type a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button onClick={handleSend} disabled={sending || !body.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
