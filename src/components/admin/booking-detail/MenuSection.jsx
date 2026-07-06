import { useEffect, useState } from 'react'
import { Plus, Check, X, UtensilsCrossed } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import Badge from '../../ui/Badge'
import Modal from '../../ui/Modal'
import Spinner from '../../ui/Spinner'
import EmptyState from '../../ui/EmptyState'
import { MENU_CATEGORIES } from '../../../lib/constants'
import { cn } from '../../../lib/utils'

const CHECKBOX_CLASS = 'rounded border-gold/40 text-wine focus:ring-2 focus:ring-wine/30'

function dishKey(dish) {
  return `${dish.category}::${dish.dish_name}`
}

function MenuBuilderModal({ open, onClose, onSave, saving, confirmedItems }) {
  const [menuMaster, setMenuMaster] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())

  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function load() {
      setLoading(true)
      const { data, error } = await supabase.from('menu_master').select('*').eq('is_available', true).order('dish_name')
      if (cancelled) return
      if (!error) setMenuMaster(data ?? [])
      setSelected(new Set(confirmedItems.map(dishKey)))
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSave = () => {
    onSave(menuMaster.filter((dish) => selected.has(dishKey(dish))))
  }

  const grouped = MENU_CATEGORIES.map((category) => ({
    category,
    dishes: menuMaster.filter((dish) => dish.category === category),
  })).filter((group) => group.dishes.length > 0)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Confirmed Menu"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save Menu'}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner className="w-6 h-6" />
        </div>
      ) : (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {grouped.map(({ category, dishes }) => (
            <div key={category}>
              <p className="text-sm font-semibold text-wine mb-1.5">{category}</p>
              <div className="space-y-1">
                {dishes.map((dish) => (
                  <label key={dish.id} className="flex items-center gap-2 text-sm text-text-dark">
                    <input
                      type="checkbox"
                      className={CHECKBOX_CLASS}
                      checked={selected.has(dishKey(dish))}
                      onChange={() => toggle(dishKey(dish))}
                    />
                    {dish.dish_name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

export default function MenuSection({ bookingId, menuConfirmed, onChange }) {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [decidingId, setDecidingId] = useState(null)
  const [togglingConfirmed, setTogglingConfirmed] = useState(false)

  const loadItems = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('booking_menu_items')
      .select('*')
      .eq('booking_id', bookingId)
      .order('category')

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

  const confirmed = items.filter((item) => item.status === 'confirmed')
  const suggestions = items.filter((item) => item.status === 'suggested')

  const grouped = MENU_CATEGORIES.map((category) => ({
    category,
    dishes: confirmed.filter((item) => item.category === category),
  })).filter((group) => group.dishes.length > 0)

  const handleSaveMenu = async (selectedDishes) => {
    setSaving(true)

    const selectedKeys = new Set(selectedDishes.map(dishKey))
    const currentKeys = new Set(confirmed.map(dishKey))

    const toAdd = selectedDishes.filter((dish) => !currentKeys.has(dishKey(dish)))
    const toRemove = confirmed.filter((item) => !selectedKeys.has(dishKey(item)))

    if (toAdd.length > 0) {
      const { error } = await supabase.from('booking_menu_items').insert(
        toAdd.map((dish) => ({
          booking_id: bookingId,
          dish_name: dish.dish_name,
          category: dish.category,
          suggested_by: 'admin',
          status: 'confirmed',
        }))
      )
      if (error) {
        showToast(error.message, 'error')
        setSaving(false)
        return
      }
    }

    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('booking_menu_items')
        .delete()
        .in('id', toRemove.map((item) => item.id))
      if (error) {
        showToast(error.message, 'error')
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setBuilderOpen(false)
    showToast('Menu updated.')
    loadItems()
  }

  const handleDecision = async (item, status) => {
    setDecidingId(item.id)
    const { error } = await supabase.from('booking_menu_items').update({ status }).eq('id', item.id)
    setDecidingId(null)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast(status === 'confirmed' ? 'Suggestion approved.' : 'Suggestion rejected.')
    loadItems()
  }

  const handleToggleConfirmed = async () => {
    setTogglingConfirmed(true)
    const { error } = await supabase.from('bookings').update({ menu_confirmed: !menuConfirmed }).eq('id', bookingId)
    setTogglingConfirmed(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    onChange()
  }

  return (
    <Card
      title="Menu"
      actions={
        <div className="flex items-center gap-2">
          {menuConfirmed ? <Badge color="success">Menu Confirmed</Badge> : <Badge color="warning">Pending Confirmation</Badge>}
          <Button variant="ghost" size="sm" onClick={handleToggleConfirmed} disabled={togglingConfirmed}>
            {menuConfirmed ? 'Unconfirm' : 'Confirm Menu'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setBuilderOpen(true)}>
            <Plus className="w-4 h-4" />
            Edit Menu
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner className="w-6 h-6" />
        </div>
      ) : (
        <>
          {confirmed.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="No dishes confirmed yet"
              description="Use Edit Menu to add dishes from the master menu."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {grouped.map(({ category, dishes }) => (
                <div key={category}>
                  <p className="text-sm font-semibold text-wine mb-1">{category}</p>
                  <ul className="text-sm text-text-dark space-y-0.5">
                    {dishes.map((dish) => (
                      <li key={dish.id} className="flex gap-1.5">
                        <span aria-hidden="true">•</span>
                        <span>{dish.dish_name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {suggestions.length > 0 && (
            <div className={cn('mt-5 pt-5 border-t border-gold/10', confirmed.length === 0 && 'mt-0 pt-0 border-t-0')}>
              <p className="text-sm font-semibold text-wine mb-2">Client Suggestions</p>
              <ul className="divide-y divide-gold/10">
                {suggestions.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-dark">
                        {item.dish_name} <span className="text-text-muted font-normal">({item.category})</span>
                      </p>
                      {item.notes && <p className="text-xs text-text-muted mt-0.5">{item.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-success hover:bg-success/10"
                        disabled={decidingId === item.id}
                        onClick={() => handleDecision(item, 'confirmed')}
                        aria-label={`Approve ${item.dish_name}`}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger/10"
                        disabled={decidingId === item.id}
                        onClick={() => handleDecision(item, 'rejected')}
                        aria-label={`Reject ${item.dish_name}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <MenuBuilderModal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onSave={handleSaveMenu}
        saving={saving}
        confirmedItems={confirmed}
      />
    </Card>
  )
}
