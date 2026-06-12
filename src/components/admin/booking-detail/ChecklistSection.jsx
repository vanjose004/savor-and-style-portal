import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, ListChecks } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import Input from '../../ui/Input'
import Select from '../../ui/Select'
import Spinner from '../../ui/Spinner'
import EmptyState from '../../ui/EmptyState'
import { CHECKLIST_CATEGORIES, CHECKLIST_CATEGORY_LABELS } from '../../../lib/constants'

const CATEGORY_OPTIONS = CHECKLIST_CATEGORIES.map((value) => ({ value, label: CHECKLIST_CATEGORY_LABELS[value] }))

export default function ChecklistSection({ bookingId }) {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const { register, handleSubmit, reset, getValues } = useForm({
    defaultValues: { item: '', category: CHECKLIST_CATEGORIES[0] },
  })

  const loadItems = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('checklists').select('*').eq('booking_id', bookingId).order('category')

    if (error) {
      showToast(error.message, 'error')
    } else {
      setItems(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])

  const handleToggle = async (item) => {
    const isDone = !item.is_done
    const doneAt = isDone ? new Date().toISOString() : null
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_done: isDone, done_at: doneAt } : i)))

    const { error } = await supabase.from('checklists').update({ is_done: isDone, done_at: doneAt }).eq('id', item.id)
    if (error) {
      showToast(error.message, 'error')
      loadItems()
    }
  }

  const handleAdd = async (values) => {
    setAdding(true)
    const { error } = await supabase.from('checklists').insert({
      booking_id: bookingId,
      item: values.item.trim(),
      category: values.category,
    })
    setAdding(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    reset({ item: '', category: getValues('category') })
    loadItems()
  }

  const handleDelete = async (item) => {
    const { error } = await supabase.from('checklists').delete().eq('id', item.id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id))
  }

  const grouped = CHECKLIST_CATEGORIES.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0)

  return (
    <Card title="Checklist">
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner className="w-6 h-6" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={ListChecks} title="No checklist items" description="Add prep, equipment, and service tasks below." />
      ) : (
        <div className="space-y-4 mb-4">
          {grouped.map(({ category, items: categoryItems }) => (
            <div key={category}>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
                {CHECKLIST_CATEGORY_LABELS[category]}
              </p>
              <ul className="space-y-1">
                {categoryItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm text-text-dark min-w-0">
                      <input
                        type="checkbox"
                        className="rounded border-gold/40 text-wine focus:ring-2 focus:ring-wine/30 shrink-0"
                        checked={item.is_done}
                        onChange={() => handleToggle(item)}
                      />
                      <span className={item.is_done ? 'line-through text-text-muted' : ''}>{item.item}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="text-text-muted hover:text-danger transition-colors shrink-0"
                      aria-label={`Delete ${item.item}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit(handleAdd)} className="space-y-2 pt-3 border-t border-gold/10">
        <Input placeholder="New checklist item" {...register('item', { required: true })} />
        <Select options={CATEGORY_OPTIONS} {...register('category')} />
        <Button type="submit" size="sm" className="w-full" disabled={adding}>
          <Plus className="w-4 h-4" />
          {adding ? 'Adding…' : 'Add Item'}
        </Button>
      </form>
    </Card>
  )
}
