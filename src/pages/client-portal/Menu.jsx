import { useEffect, useMemo, useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import StatusBadge from '../../components/ui/StatusBadge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function Menu() {
  const [items, setItems] = useState([])
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data: bookingRows } = await supabase.rpc('get_my_booking_summary')
      const current = bookingRows?.[0]
      if (cancelled || !current) {
        setLoading(false)
        return
      }
      const [{ data: menuItems }, { data: guestRows }] = await Promise.all([
        supabase.rpc('get_my_menu_items'),
        supabase.from('portal_guests').select('meal_pref').eq('booking_id', current.id),
      ])
      if (cancelled) return
      setItems(menuItems ?? [])
      setGuests(guestRows ?? [])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const dietarySummary = useMemo(() => {
    const counts = {}
    for (const g of guests) {
      if (!g.meal_pref?.trim()) continue
      counts[g.meal_pref] = (counts[g.meal_pref] ?? 0) + 1
    }
    return Object.entries(counts)
  }, [guests])

  const grouped = useMemo(() => {
    const byCategory = {}
    for (const item of items) {
      byCategory[item.category] = byCategory[item.category] ?? []
      byCategory[item.category].push(item)
    }
    return byCategory
  }, [items])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {dietarySummary.length > 0 && (
        <Card title="Dietary Summary (from Guest List)">
          <div className="flex flex-wrap gap-2">
            {dietarySummary.map(([pref, count]) => (
              <Badge key={pref} color="gold">
                {count} {pref}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Card title="Your Menu">
        {items.length === 0 ? (
          <EmptyState icon={UtensilsCrossed} title="No menu items yet" description="Your coordinator will add your package menu here." />
        ) : (
          Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category} className="mb-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">{category}</p>
              <ul className="space-y-2">
                {categoryItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-dark">{item.dish_name}</span>
                    <StatusBadge status={item.status} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
        <p className="text-xs text-text-muted mt-2 pt-3 border-t border-gold/10">
          Want to suggest a change? Send your coordinator a message.
        </p>
      </Card>
    </div>
  )
}
