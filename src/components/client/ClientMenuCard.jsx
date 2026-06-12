import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, UtensilsCrossed } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import Select from '../ui/Select'
import Textarea from '../ui/Textarea'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import EmptyState from '../ui/EmptyState'
import { MENU_CATEGORIES } from '../../lib/constants'

function SuggestDishModal({ open, onClose, onSubmit, submitting }) {
  const [dishes, setDishes] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState(MENU_CATEGORIES[0])
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: { dish_name: '', notes: '' } })

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data, error } = await supabase.from('menu_master').select('*').eq('is_available', true).order('dish_name')
      if (cancelled) return
      if (!error) setDishes(data ?? [])
      setCategory(MENU_CATEGORIES[0])
      reset({ dish_name: '', notes: '' })
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [open, reset])

  const handleCategoryChange = (e) => {
    setCategory(e.target.value)
    setValue('dish_name', '')
  }

  const categoryDishes = dishes.filter((dish) => dish.category === category)

  const submitWithCategory = (values) => onSubmit({ ...values, category })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Suggest a Dish"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submitWithCategory)} disabled={submitting || loading}>
            {submitting ? 'Submitting…' : 'Submit Suggestion'}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner className="w-6 h-6" />
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(submitWithCategory)}>
          <Select label="Category" options={MENU_CATEGORIES} value={category} onChange={handleCategoryChange} />
          <Select
            label="Dish"
            placeholder="Select a dish…"
            options={categoryDishes.map((dish) => dish.dish_name)}
            error={errors.dish_name?.message}
            {...register('dish_name', { required: 'Please select a dish' })}
          />
          <Textarea label="Notes (optional)" {...register('notes')} />
        </form>
      )}
    </Modal>
  )
}

export default function ClientMenuCard({ accessToken, menuConfirmed }) {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadItems = async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_booking_menu_items_by_token', { p_access_token: accessToken })
    if (!error) setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  const confirmed = items.filter((item) => item.status === 'confirmed')
  const ownSuggestions = items.filter((item) => item.suggested_by === 'client' && item.status === 'suggested')

  const grouped = MENU_CATEGORIES.map((category) => ({
    category,
    dishes: confirmed.filter((item) => item.category === category),
  })).filter((group) => group.dishes.length > 0)

  const handleSubmitSuggestion = async (values) => {
    setSubmitting(true)
    const { error } = await supabase.rpc('submit_menu_suggestion_by_token', {
      p_access_token: accessToken,
      p_dish_name: values.dish_name,
      p_category: values.category,
      p_notes: values.notes?.trim() || null,
    })
    setSubmitting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast('Suggestion submitted. Thank you!')
    setModalOpen(false)
    loadItems()
  }

  return (
    <Card
      title="Menu"
      actions={
        <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Suggest a Dish
        </Button>
      }
    >
      {!menuConfirmed && (
        <div className="rounded-lg bg-warning/10 text-warning text-sm px-3 py-2 mb-3">
          Menu pending confirmation. Your caterer will finalize the menu before your event.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner className="w-6 h-6" />
        </div>
      ) : confirmed.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="No dishes yet" description="Your confirmed menu will appear here once finalized." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {grouped.map(({ category, dishes }) => (
            <div key={category}>
              <p className="text-sm font-semibold text-wine mb-1">{category}</p>
              <ul className="text-sm text-text-dark space-y-0.5">
                {dishes.map((dish) => (
                  <li key={dish.id}>{dish.dish_name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {ownSuggestions.length > 0 && (
        <div className="mt-5 pt-5 border-t border-gold/10">
          <p className="text-sm font-semibold text-wine mb-2">Your Suggestions</p>
          <ul className="space-y-2">
            {ownSuggestions.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm text-text-dark">
                {item.dish_name} <span className="text-text-muted">({item.category})</span>
                <Badge color="warning">Pending Review</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      <SuggestDishModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmitSuggestion}
        submitting={submitting}
      />
    </Card>
  )
}
