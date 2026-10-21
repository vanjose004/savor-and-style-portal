import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, LayoutGrid, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { SEATING_TABLE_TYPES, SEATING_TABLE_TYPE_LABELS } from '../../lib/constants'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function Seating() {
  const { showToast } = useToast()
  const [bookingId, setBookingId] = useState(null)
  const [tables, setTables] = useState([])
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { table_type: 'regular', capacity: 8 } })

  const loadAll = async (id) => {
    const [{ data: tableRows }, { data: guestRows }] = await Promise.all([
      supabase.from('portal_seating_tables').select('*').eq('booking_id', id).order('sort'),
      supabase.from('portal_guests').select('id, full_name, rsvp_status, table_id').eq('booking_id', id),
    ])
    setTables(tableRows ?? [])
    setGuests(guestRows ?? [])
  }

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
      setBookingId(current.id)
      await loadAll(current.id)
      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const onAddTable = async (values) => {
    setSubmitting(true)
    const { error } = await supabase.from('portal_seating_tables').insert({ booking_id: bookingId, sort: tables.length, ...values })
    setSubmitting(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    reset({ table_type: 'regular', capacity: 8 })
    loadAll(bookingId)
  }

  const deleteTable = async (id) => {
    const { error } = await supabase.from('portal_seating_tables').delete().eq('id', id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadAll(bookingId)
  }

  const assignGuest = async (guestId, tableId) => {
    const { error } = await supabase.from('portal_guests').update({ table_id: tableId || null }).eq('id', guestId)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadAll(bookingId)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  const confirmedGuests = guests.filter((g) => g.rsvp_status === 'confirmed')
  const unassignedCount = confirmedGuests.filter((g) => !g.table_id).length
  const tableOptions = [{ value: '', label: 'Unassigned' }, ...tables.map((t) => ({ value: t.id, label: t.label }))]

  return (
    <div className="space-y-6">
      <Card title="Seating Planner">
        {unassignedCount > 0 && (
          <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2 mb-4 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {unassignedCount} confirmed guest{unassignedCount > 1 ? 's' : ''} not yet assigned to a table.
          </p>
        )}

        <form onSubmit={handleSubmit(onAddTable)} className="grid grid-cols-3 gap-2 mb-4">
          <Input placeholder="Table name" className="col-span-1" error={errors.label?.message} {...register('label', { required: true })} />
          <Select options={SEATING_TABLE_TYPES.map((t) => ({ value: t, label: SEATING_TABLE_TYPE_LABELS[t] }))} {...register('table_type')} />
          <Input type="number" placeholder="Capacity" {...register('capacity')} />
          <Button type="submit" size="sm" disabled={submitting} className="col-span-3 justify-self-end">
            <Plus className="w-4 h-4" />
            Add Table
          </Button>
        </form>

        {tables.length === 0 ? (
          <EmptyState icon={LayoutGrid} title="No tables yet" description="Add your tables, then assign guests below." />
        ) : (
          <ul className="divide-y divide-gold/10">
            {tables.map((table) => {
              const seated = guests.filter((g) => g.table_id === table.id).length
              const overCapacity = seated > table.capacity
              return (
                <li key={table.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-dark">
                      {table.label} · {SEATING_TABLE_TYPE_LABELS[table.table_type]}
                    </p>
                    <p className={`text-xs ${overCapacity ? 'text-danger font-medium' : 'text-text-muted'}`}>
                      {seated}/{table.capacity} seated{overCapacity ? ' — over capacity' : ''}
                    </p>
                  </div>
                  <button onClick={() => deleteTable(table.id)} aria-label="Remove table">
                    <Trash2 className="w-4 h-4 text-danger" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card title="Assign Guests">
        {confirmedGuests.length === 0 ? (
          <EmptyState title="No confirmed guests yet" description="Confirm guests on the Guests page first." />
        ) : (
          <ul className="divide-y divide-gold/10">
            {confirmedGuests.map((guest) => (
              <li key={guest.id} className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-sm text-text-dark truncate">{guest.full_name}</span>
                <Select
                  className="w-40"
                  options={tableOptions}
                  value={guest.table_id ?? ''}
                  onChange={(e) => assignGuest(guest.id, e.target.value)}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
