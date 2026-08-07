import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { cn, formatDateTime } from '../../lib/utils'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Textarea from '../../components/ui/Textarea'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'

const CHECKBOX_CLASS = 'rounded border-gold/40 text-wine focus:ring-2 focus:ring-wine/30'

export default function MessengerBot() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [conversations, setConversations] = useState([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [activeConversation, setActiveConversation] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
  } = useForm({
    defaultValues: {
      is_enabled: true,
      system_prompt: '',
      greeting_message: '',
    },
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('messenger_bot_settings')
        .select('is_enabled, system_prompt, greeting_message')
        .eq('id', true)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        showToast(error.message, 'error')
      } else if (data) {
        reset(data)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadConversations = async () => {
    setConversationsLoading(true)
    const { data, error } = await supabase
      .from('messenger_conversations')
      .select('id, sender_id, sender_name, messages, updated_at')
      .order('updated_at', { ascending: false })
      .limit(20)

    if (error) {
      showToast(error.message, 'error')
    } else {
      setConversations(data ?? [])
    }
    setConversationsLoading(false)
  }

  useEffect(() => {
    loadConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSubmit = async (values) => {
    setSaving(true)
    const { error } = await supabase
      .from('messenger_bot_settings')
      .update({
        is_enabled: values.is_enabled,
        system_prompt: values.system_prompt.trim(),
        greeting_message: values.greeting_message.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', true)
    setSaving(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast('Messenger bot settings saved.')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-wine">Messenger Bot</h1>
        <p className="text-sm text-text-muted mt-1">
          Configure the Facebook Messenger auto-reply bot for the Savor and Style page.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card title="Behavior">
          <label className="flex items-center gap-2 text-sm font-medium text-text-dark mb-4">
            <input type="checkbox" className={CHECKBOX_CLASS} {...register('is_enabled')} />
            Enable auto-replies on Messenger
          </label>
        </Card>

        <Card title="Greeting Message">
          <p className="text-xs text-text-muted mb-3">
            Sent automatically the first time someone messages the page.
          </p>
          <Textarea rows={3} {...register('greeting_message')} />
        </Card>

        <Card title="System Prompt">
          <p className="text-xs text-text-muted mb-3">
            Tone and behavior instructions. Leave blank to use the default. Package pricing, inclusions, payment
            options, and soft reserve details are always appended automatically — no need to type them here.
          </p>
          <Textarea rows={12} className="font-mono text-xs" {...register('system_prompt')} />
        </Card>

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
      </form>

      <Card title="Recent Conversations">
        {conversationsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-6 h-6" />
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="Messages from Facebook Messenger will show up here once someone chats with the page."
          />
        ) : (
          <div className="divide-y divide-gold/10">
            {conversations.map((c) => {
              const lastMessage = c.messages?.[c.messages.length - 1]
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveConversation(c)}
                  className="w-full text-left py-3 flex items-start justify-between gap-3 hover:bg-cream/50 transition-colors -mx-2 px-2 rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-dark truncate">
                      {c.sender_name || `Messenger user ${c.sender_id.slice(-6)}`}
                    </p>
                    {lastMessage && (
                      <p className="text-xs text-text-muted truncate mt-0.5">{lastMessage.content}</p>
                    )}
                  </div>
                  <span className="text-xs text-text-muted shrink-0">{formatDateTime(c.updated_at)}</span>
                </button>
              )
            })}
          </div>
        )}
      </Card>

      <Modal
        open={!!activeConversation}
        onClose={() => setActiveConversation(null)}
        title={
          activeConversation?.sender_name || `Messenger user ${activeConversation?.sender_id?.slice(-6) ?? ''}`
        }
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {(activeConversation?.messages ?? []).map((m, i) => (
            <div
              key={i}
              className={cn(
                'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                m.role === 'user' ? 'ml-auto bg-wine text-white' : 'bg-cream border border-gold/20 text-text-dark'
              )}
            >
              {m.content}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
