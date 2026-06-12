import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ListChecks } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { useStaffProfile } from '../../hooks/useStaffProfile'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'
import Field from '../../components/ui/Field'
import { formatDate, formatTime } from '../../lib/utils'
import { MENU_CATEGORIES, CHECKLIST_CATEGORIES, CHECKLIST_CATEGORY_LABELS, STAFF_ROLE_LABELS } from '../../lib/constants'

export default function StaffEventDetail() {
  const { id } = useParams()
  const { showToast } = useToast()
  const { profile } = useStaffProfile()
  const [event, setEvent] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [checklist, setChecklist] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [eventRes, menuRes, checklistRes] = await Promise.all([
      supabase.from('staff_event_bookings').select('*').eq('id', id).single(),
      supabase.from('booking_menu_items').select('*').eq('booking_id', id).eq('status', 'confirmed').order('category'),
      supabase.from('checklists').select('*').eq('booking_id', id).order('category'),
    ])

    if (eventRes.error) {
      showToast(eventRes.error.message, 'error')
    } else {
      setEvent(eventRes.data)
    }
    if (!menuRes.error) setMenuItems(menuRes.data ?? [])
    if (!checklistRes.error) setChecklist(checklistRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleToggle = async (item) => {
    const isDone = !item.is_done
    const doneAt = isDone ? new Date().toISOString() : null
    setChecklist((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_done: isDone, done_at: doneAt } : i)))

    const { error } = await supabase.from('checklists').update({ is_done: isDone, done_at: doneAt }).eq('id', item.id)
    if (error) {
      showToast(error.message, 'error')
      load()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!event) {
    return <p className="text-sm text-text-muted">Event not found.</p>
  }

  const groupedMenu = MENU_CATEGORIES.map((category) => ({
    category,
    dishes: menuItems.filter((item) => item.category === category),
  })).filter((group) => group.dishes.length > 0)

  const groupedChecklist = CHECKLIST_CATEGORIES.map((category) => ({
    category,
    items: checklist.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0)

  const role = event.role_for_event || (profile?.role ? STAFF_ROLE_LABELS[profile.role] : null)

  return (
    <div className="space-y-4">
      <Link to="/staff/dashboard" className="inline-flex items-center gap-1 text-sm text-wine hover:underline">
        <ArrowLeft className="w-4 h-4" />
        Back to my events
      </Link>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-heading text-2xl font-bold text-wine">{event.event_type}</h1>
        <StatusBadge status={event.status} />
      </div>

      <Card title="Event Details">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Date" value={formatDate(event.event_date)} />
          <Field label="Time" value={event.event_time ? formatTime(event.event_time) : '—'} />
          <Field label="Venue" value={event.venue || '—'} />
          <Field label="Guests" value={event.pax ?? '—'} />
          <Field label="Service Hours" value={event.service_hours} />
          <Field label="Your Role" value={role || '—'} />
        </dl>
        {event.lechon_chopping && <p className="text-sm text-text-muted mt-3">Includes lechon chopping.</p>}
        {event.special_requests && (
          <div className="mt-4 pt-4 border-t border-gold/10">
            <p className="text-text-muted text-sm mb-1">Special Requests</p>
            <p className="text-sm text-text-dark whitespace-pre-wrap">{event.special_requests}</p>
          </div>
        )}
      </Card>

      <Card title="Menu">
        {!event.menu_confirmed ? (
          <p className="text-sm text-text-muted">Menu pending confirmation.</p>
        ) : groupedMenu.length === 0 ? (
          <p className="text-sm text-text-muted">No confirmed dishes yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groupedMenu.map(({ category, dishes }) => (
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
      </Card>

      <Card title="Checklist">
        {checklist.length === 0 ? (
          <EmptyState icon={ListChecks} title="No checklist items" description="Tasks for this event will appear here." />
        ) : (
          <div className="space-y-4">
            {groupedChecklist.map(({ category, items }) => (
              <div key={category}>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
                  {CHECKLIST_CATEGORY_LABELS[category]}
                </p>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item.id}>
                      <label className="flex items-center gap-2 text-sm text-text-dark">
                        <input
                          type="checkbox"
                          className="rounded border-gold/40 text-wine focus:ring-2 focus:ring-wine/30"
                          checked={item.is_done}
                          onChange={() => handleToggle(item)}
                        />
                        <span className={item.is_done ? 'line-through text-text-muted' : ''}>{item.item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
