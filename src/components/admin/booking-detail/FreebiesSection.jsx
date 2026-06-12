import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import Input from '../../ui/Input'
import { DEFAULT_FREEBIES } from '../../../lib/constants'

const CHECKBOX_CLASS = 'rounded border-gold/40 text-wine focus:ring-2 focus:ring-wine/30'

export default function FreebiesSection({ booking, onChange }) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [customInput, setCustomInput] = useState('')

  const freebies = booking.freebies ?? []
  const customFreebies = freebies.filter((item) => !DEFAULT_FREEBIES.includes(item))

  const saveFreebies = async (next) => {
    setSaving(true)
    const { error } = await supabase.from('bookings').update({ freebies: next }).eq('id', booking.id)
    setSaving(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    onChange()
  }

  const toggleDefault = (item) => {
    const next = freebies.includes(item) ? freebies.filter((f) => f !== item) : [...freebies, item]
    saveFreebies(next)
  }

  const handleAddCustom = () => {
    const name = customInput.trim()
    if (!name || freebies.includes(name)) return
    setCustomInput('')
    saveFreebies([...freebies, name])
  }

  const handleRemoveCustom = (item) => {
    saveFreebies(freebies.filter((f) => f !== item))
  }

  return (
    <Card title="Freebies">
      <p className="text-xs text-text-muted mb-3">
        Tick items to include. Only ticked items appear on the client portal and contract.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DEFAULT_FREEBIES.map((item) => (
          <label key={item} className="flex items-center gap-2 text-sm text-text-dark">
            <input
              type="checkbox"
              className={CHECKBOX_CLASS}
              checked={freebies.includes(item)}
              disabled={saving}
              onChange={() => toggleDefault(item)}
            />
            {item}
          </label>
        ))}
      </div>

      {customFreebies.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gold/10 space-y-2">
          <p className="text-sm font-semibold text-wine">Custom Freebies</p>
          {customFreebies.map((item) => (
            <div key={item} className="flex items-center justify-between gap-3 text-sm text-text-dark">
              <span>{item}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger/10"
                disabled={saving}
                onClick={() => handleRemoveCustom(item)}
                aria-label={`Remove ${item}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gold/10 flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Add custom freebie"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddCustom()
              }
            }}
            disabled={saving}
            className="w-full"
          />
        </div>
        <Button variant="secondary" onClick={handleAddCustom} disabled={saving || !customInput.trim()}>
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>
    </Card>
  )
}
