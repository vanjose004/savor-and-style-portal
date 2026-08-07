import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'

const CHECKBOX_CLASS = 'rounded border-gold/40 text-wine focus:ring-2 focus:ring-wine/30'

const MODEL_OPTIONS = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']

export default function ChatbotSettings() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      bot_name: 'Stella',
      greeting_message: '',
      system_prompt: '',
      is_enabled: true,
      model: 'gpt-4o-mini',
      max_tokens: 500,
    },
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('bot_name, greeting_message, system_prompt, is_enabled, model, max_tokens')
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

  const onSubmit = async (values) => {
    setSaving(true)
    const { error } = await supabase
      .from('chatbot_settings')
      .update({
        bot_name: values.bot_name.trim() || 'Stella',
        greeting_message: values.greeting_message.trim(),
        system_prompt: values.system_prompt.trim(),
        is_enabled: values.is_enabled,
        model: values.model,
        max_tokens: Number(values.max_tokens),
        updated_at: new Date().toISOString(),
      })
      .eq('id', true)
    setSaving(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast('Chatbot settings saved.')
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
        <h1 className="font-heading text-2xl font-bold text-wine">Chatbot Settings</h1>
        <p className="text-sm text-text-muted mt-1">
          Configure Stella, the floating chat widget on the home and landing pages.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card title="Behavior">
          <label className="flex items-center gap-2 text-sm font-medium text-text-dark mb-4">
            <input type="checkbox" className={CHECKBOX_CLASS} {...register('is_enabled')} />
            Enable chatbot on the website
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Bot Name"
              error={errors.bot_name?.message}
              {...register('bot_name', { required: 'Bot name is required' })}
            />
            <Select
              label="Model"
              options={MODEL_OPTIONS}
              {...register('model', { required: true })}
            />
            <Input
              label="Max Tokens"
              type="number"
              min={1}
              max={4000}
              error={errors.max_tokens?.message}
              {...register('max_tokens', {
                required: 'Max tokens is required',
                min: { value: 1, message: 'Must be at least 1' },
                max: { value: 4000, message: 'Must be at most 4000' },
              })}
            />
          </div>
        </Card>

        <Card title="Greeting Message">
          <p className="text-xs text-text-muted mb-3">Shown as Stella's first message when a visitor opens the chat.</p>
          <Textarea rows={3} {...register('greeting_message')} />
        </Card>

        <Card title="System Prompt">
          <p className="text-xs text-text-muted mb-3">
            Stella's tone and behavior instructions. Leave blank to use the default. Package pricing, inclusions,
            payment options, and soft reserve details are always appended automatically — no need to type them here.
          </p>
          <Textarea rows={12} className="font-mono text-xs" {...register('system_prompt')} />
        </Card>

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
      </form>
    </div>
  )
}
