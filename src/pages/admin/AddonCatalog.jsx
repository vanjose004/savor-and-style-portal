import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { formatCurrency } from '../../lib/utils'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const EMPTY_FORM = { name: '', description: '', starting_price: '', active: true }

export default function AddonCatalog() {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: EMPTY_FORM })

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('addon_catalog').select('*').order('sort')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const openNew = () => {
    setEditing(null)
    reset(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    reset(item)
    setModalOpen(true)
  }

  const onSave = async (values) => {
    setSaving(true)
    const payload = { ...values, starting_price: values.starting_price || null }
    const { error } = editing
      ? await supabase.from('addon_catalog').update(payload).eq('id', editing.id)
      : await supabase.from('addon_catalog').insert({ ...payload, sort: items.length })
    setSaving(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    showToast(editing ? 'Add-on updated.' : 'Add-on created.')
    setModalOpen(false)
    load()
  }

  const deleteItem = async (id) => {
    const { error } = await supabase.from('addon_catalog').delete().eq('id', id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    load()
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
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-wine">Add-On Catalog</h1>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          New Add-On
        </Button>
      </div>

      <Card>
        {items.length === 0 ? (
          <EmptyState title="No add-ons yet" description="Create the add-ons clients can request from their My Event Portal." />
        ) : (
          <ul className="divide-y divide-gold/10">
            {items.map((item) => (
              <li key={item.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-dark truncate">
                    {item.name}
                    {!item.active && <span className="text-xs text-text-muted"> (inactive)</span>}
                  </p>
                  {item.description && <p className="text-xs text-text-muted truncate">{item.description}</p>}
                  {item.starting_price && <p className="text-xs text-text-muted">Starting at {formatCurrency(item.starting_price)}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10" onClick={() => deleteItem(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Add-On' : 'New Add-On'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSave)} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSave)}>
          <Input label="Name" error={errors.name?.message} {...register('name', { required: 'Name is required' })} />
          <Textarea label="Description" {...register('description')} />
          <Input label="Starting Price (₱)" type="number" {...register('starting_price')} />
          <label className="flex items-center gap-2 text-sm text-text-dark">
            <input type="checkbox" {...register('active')} />
            Active (visible to clients)
          </label>
        </form>
      </Modal>
    </div>
  )
}
