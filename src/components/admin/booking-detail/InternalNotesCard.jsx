import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import Textarea from '../../ui/Textarea'

export default function InternalNotesCard({ booking, onChange }) {
  const { showToast } = useToast()
  const [value, setValue] = useState(booking.notes ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(booking.notes ?? '')
  }, [booking.notes])

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('bookings').update({ notes: value.trim() || null }).eq('id', booking.id)
    setSaving(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast('Notes saved.')
    onChange()
  }

  const dirty = (booking.notes ?? '') !== value

  return (
    <Card title="Internal Notes">
      <p className="text-xs text-text-muted mb-2">Admin only — never shown to the client.</p>
      <Textarea rows={6} value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save Notes'}
        </Button>
      </div>
    </Card>
  )
}
