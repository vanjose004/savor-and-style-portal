import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import Input from '../../ui/Input'
import { DEFAULT_FREEBIES } from '../../../lib/constants'

const CHECKBOX_CLASS = 'rounded border-gold/40 text-wine focus:ring-2 focus:ring-wine/30'
const QUANTITY_CLASS =
  'w-16 rounded-lg border border-gold/30 bg-warm-white px-2 py-1 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-wine/30 focus:border-wine'

export default function FreebiesSection({ booking, onChange }) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [customInput, setCustomInput] = useState('')

  const freebies = booking.freebies ?? []
  const customFreebies = freebies.filter((item) => !DEFAULT_FREEBIES.some((d) => d.name === item.name))

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
    const isChecked = freebies.some((f) => f.name === item.name)
    const next = isChecked
      ? freebies.filter((f) => f.name !== item.name)
      : [...freebies, { name: item.name, ...(item.unit ? { quantity: 1 } : {}) }]
    saveFreebies(next)
  }

  const handleQuantityChange = (item, value) => {
    const quantity = Math.max(1, Number(value) || 1)
    const next = freebies.map((f) => (f.name === item.name ? { ...f, quantity } : f))
    saveFreebies(next)
  }

  const handleAddCustom = () => {
    const name = customInput.trim()
    if (!name || freebies.some((f) => f.name === name)) return
    setCustomInput('')
    saveFreebies([...freebies, { name }])
  }

  const handleRemoveCustom = (name) => {
    saveFreebies(freebies.filter((f) => f.name !== name))
  }

  return (
    <Card title="Freebies">
      <p className="text-xs text-text-muted mb-3">
        Tick items to include. Only ticked items appear on the client portal and contract.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DEFAULT_FREEBIES.map((item) => {
          const entry = freebies.find((f) => f.name === item.name)
          const checked = Boolean(entry)
          return (
            <label key={item.name} className="flex items-center gap-2 text-sm text-text-dark">
              <input
                type="checkbox"
                className={CHECKBOX_CLASS}
                checked={checked}
                disabled={saving}
                onChange={() => toggleDefault(item)}
              />
              {item.name}
              {item.unit && checked && (
                <input
                  key={`${item.name}-${entry.quantity ?? 1}`}
                  type="number"
                  min={1}
                  defaultValue={entry.quantity ?? 1}
                  disabled={saving}
                  onBlur={(e) => handleQuantityChange(item, e.target.value)}
                  className={QUANTITY_CLASS}
                  aria-label={`${item.name} quantity (${item.unit}s)`}
                />
              )}
              {item.unit && checked && <span className="text-xs text-text-muted">{item.unit}(s)</span>}
            </label>
          )
        })}
      </div>

      {customFreebies.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gold/10 space-y-2">
          <p className="text-sm font-semibold text-wine">Custom Freebies</p>
          {customFreebies.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-3 text-sm text-text-dark">
              <span>{item.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger/10"
                disabled={saving}
                onClick={() => handleRemoveCustom(item.name)}
                aria-label={`Remove ${item.name}`}
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
