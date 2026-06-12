import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Textarea from '../../components/ui/Textarea'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { cn } from '../../lib/utils'
import { MENU_CATEGORIES } from '../../lib/constants'

function DishFormModal({ open, onClose, onSave, saving, item, defaultCategory }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      dish_name: item?.dish_name ?? '',
      category: item?.category ?? defaultCategory ?? MENU_CATEGORIES[0],
      is_available: item?.is_available ?? true,
      notes: item?.notes ?? '',
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? 'Edit Dish' : 'Add Dish'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSave)} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSave)}>
        <Input
          label="Dish Name"
          error={errors.dish_name?.message}
          {...register('dish_name', { required: 'Dish name is required' })}
        />
        <Select label="Category" options={MENU_CATEGORIES} {...register('category', { required: true })} />
        <Textarea label="Notes" {...register('notes')} />
        <label className="flex items-center gap-2 text-sm font-medium text-text-dark">
          <input
            type="checkbox"
            className="rounded border-gold/40 text-wine focus:ring-2 focus:ring-wine/30"
            {...register('is_available')}
          />
          Available
        </label>
      </form>
    </Modal>
  )
}

export default function MenuManager() {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalState, setModalState] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadItems = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('menu_master').select('*').order('dish_name')
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
  }, [])

  const handleToggleAvailability = async (item) => {
    const { error } = await supabase
      .from('menu_master')
      .update({ is_available: !item.is_available })
      .eq('id', item.id)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i)))
  }

  const handleSave = async (values) => {
    setSaving(true)

    const payload = {
      dish_name: values.dish_name.trim(),
      category: values.category,
      is_available: values.is_available,
      notes: values.notes?.trim() || null,
    }

    const editingItem = modalState?.item

    const { error } = editingItem
      ? await supabase.from('menu_master').update(payload).eq('id', editingItem.id)
      : await supabase.from('menu_master').insert(payload)

    setSaving(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast(editingItem ? 'Dish updated.' : 'Dish added.')
    setModalState(null)
    loadItems()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('menu_master').delete().eq('id', deleteTarget.id)
    setDeleting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id))
    setDeleteTarget(null)
    showToast('Dish deleted.')
  }

  const grouped = MENU_CATEGORIES.map((category) => ({
    category,
    dishes: items.filter((i) => i.category === category),
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-wine">Master Menu</h1>
          <p className="text-sm text-text-muted mt-1">
            Manage the dish list available for booking menus and client suggestions.
          </p>
        </div>
        <Button onClick={() => setModalState({ item: null })}>
          <Plus className="w-4 h-4" />
          Add Dish
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="w-8 h-8" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No dishes yet" description="Add your first dish to get started." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {grouped.map(({ category, dishes }) => (
            <Card
              key={category}
              title={`${category} (${dishes.length})`}
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalState({ item: null, defaultCategory: category })}
                  aria-label={`Add dish to ${category}`}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              }
            >
              {dishes.length === 0 ? (
                <p className="text-sm text-text-muted">No dishes in this category.</p>
              ) : (
                <ul className="divide-y divide-gold/10">
                  {dishes.map((dish) => (
                    <li key={dish.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-dark">{dish.dish_name}</p>
                        {dish.notes && <p className="text-xs text-text-muted mt-0.5">{dish.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleAvailability(dish)}
                          className={cn(
                            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                            dish.is_available
                              ? 'bg-success/10 text-success hover:bg-success/20'
                              : 'bg-cream text-text-muted hover:bg-gold/20'
                          )}
                        >
                          {dish.is_available ? 'Available' : 'Unavailable'}
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit ${dish.dish_name}`}
                          onClick={() => setModalState({ item: dish })}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger/10"
                          aria-label={`Delete ${dish.dish_name}`}
                          onClick={() => setDeleteTarget(dish)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      {modalState && (
        <DishFormModal
          open
          onClose={() => setModalState(null)}
          onSave={handleSave}
          saving={saving}
          item={modalState.item}
          defaultCategory={modalState.defaultCategory}
        />
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Dish"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-dark">
          Are you sure you want to delete <strong>{deleteTarget?.dish_name}</strong> from the master menu?
          This won&apos;t affect dishes already added to existing bookings.
        </p>
      </Modal>
    </div>
  )
}
