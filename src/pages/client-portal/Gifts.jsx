import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Gift } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { formatCurrency, formatShortDate } from '../../lib/utils'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function Gifts() {
  const { showToast } = useToast()
  const [bookingId, setBookingId] = useState(null)
  const [gifts, setGifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  const loadGifts = async (id) => {
    const { data } = await supabase.from('portal_gifts').select('*').eq('booking_id', id).order('created_at', { ascending: false })
    setGifts(data ?? [])
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
      await loadGifts(current.id)
      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const onAdd = async (values) => {
    setSubmitting(true)
    const { error } = await supabase.from('portal_gifts').insert({ booking_id: bookingId, ...values })
    setSubmitting(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    reset()
    loadGifts(bookingId)
  }

  const toggleThankYou = async (gift) => {
    const { error } = await supabase.from('portal_gifts').update({ thank_you_sent: !gift.thank_you_sent }).eq('id', gift.id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadGifts(bookingId)
  }

  const deleteGift = async (id) => {
    const { error } = await supabase.from('portal_gifts').delete().eq('id', id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadGifts(bookingId)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  const totalCash = gifts.reduce((sum, g) => sum + Number(g.amount ?? 0), 0)

  return (
    <div className="space-y-6">
      <Card title="Gifts & Thank-Yous">
        {totalCash > 0 && <p className="text-sm text-text-muted mb-4">Total cash gifts: {formatCurrency(totalCash)}</p>}

        <form onSubmit={handleSubmit(onAdd)} className="grid grid-cols-2 gap-2 mb-4">
          <Input
            placeholder="From"
            error={errors.from_name?.message}
            {...register('from_name', { required: 'Enter who it was from' })}
          />
          <Input placeholder="Amount (if cash)" type="number" {...register('amount')} />
          <Input placeholder="Description (if item)" className="col-span-2" {...register('description')} />
          <Input type="date" {...register('received_at')} />
          <Button type="submit" size="sm" disabled={submitting} className="justify-self-end">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </form>

        {gifts.length === 0 ? (
          <EmptyState icon={Gift} title="No gifts logged yet" />
        ) : (
          <ul className="divide-y divide-gold/10">
            {gifts.map((gift) => (
              <li key={gift.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-dark truncate">{gift.from_name}</p>
                  <p className="text-xs text-text-muted">
                    {gift.amount ? formatCurrency(gift.amount) : gift.description}
                    {gift.received_at ? ` · ${formatShortDate(gift.received_at)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <label className="flex items-center gap-1 text-xs text-text-muted">
                    <input type="checkbox" checked={gift.thank_you_sent} onChange={() => toggleThankYou(gift)} />
                    Thank-you sent
                  </label>
                  <button onClick={() => deleteGift(gift.id)} aria-label="Remove gift">
                    <Trash2 className="w-4 h-4 text-danger" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
