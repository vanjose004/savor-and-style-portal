import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Truck, Phone } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { formatCurrency } from '../../lib/utils'
import { PORTAL_VENDOR_STATUSES, PORTAL_VENDOR_STATUS_LABELS, BUSINESS } from '../../lib/constants'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const STATUS_COLOR = { inquiry: 'warning', booked: 'gold', confirmed: 'success' }

export default function Vendors() {
  const { showToast } = useToast()
  const [bookingId, setBookingId] = useState(null)
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { status: 'inquiry' } })

  const loadVendors = async (id) => {
    const { data } = await supabase.from('portal_vendors').select('*').eq('booking_id', id).order('created_at')
    setVendors(data ?? [])
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
      await loadVendors(current.id)
      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const onAdd = async (values) => {
    setSubmitting(true)
    const { error } = await supabase.from('portal_vendors').insert({ booking_id: bookingId, ...values })
    setSubmitting(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    reset({ status: 'inquiry' })
    loadVendors(bookingId)
  }

  const deleteVendor = async (id) => {
    const { error } = await supabase.from('portal_vendors').delete().eq('id', id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadVendors(bookingId)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card title="Savor & Style Team">
        <div className="flex items-center gap-3">
          <Truck className="w-5 h-5 text-wine shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-dark">{BUSINESS.name}</p>
            <p className="text-xs text-text-muted">{BUSINESS.phone} · Catering, styling & coordination</p>
          </div>
        </div>
      </Card>

      <Card title="Your Other Vendors">
        <form onSubmit={handleSubmit(onAdd)} className="grid grid-cols-2 gap-3 mb-4">
          <Input
            placeholder="Vendor name"
            className="col-span-2"
            error={errors.name?.message}
            {...register('name', { required: 'Enter a vendor name' })}
          />
          <Input placeholder="Category (e.g. Photo/Video)" {...register('category')} />
          <Input placeholder="Contact person" {...register('contact_person')} />
          <Input placeholder="Phone" {...register('phone')} />
          <Input type="number" placeholder="Contract amount" {...register('contract_amount')} />
          <Select options={PORTAL_VENDOR_STATUSES.map((v) => ({ value: v, label: PORTAL_VENDOR_STATUS_LABELS[v] }))} {...register('status')} />
          <div className="col-span-2 flex justify-end">
            <Button type="submit" size="sm" disabled={submitting}>
              <Plus className="w-4 h-4" />
              Add Vendor
            </Button>
          </div>
        </form>

        {vendors.length === 0 ? (
          <EmptyState icon={Truck} title="No vendors added yet" description="Add your photographer, florist, HMUA, and other suppliers here." />
        ) : (
          <ul className="divide-y divide-gold/10">
            {vendors.map((v) => (
              <li key={v.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-dark truncate">
                    {v.name}
                    {v.category ? ` · ${v.category}` : ''}
                  </p>
                  <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                    {v.phone && (
                      <>
                        <Phone className="w-3 h-3" />
                        {v.phone}
                      </>
                    )}
                    {v.contract_amount ? ` · ${formatCurrency(v.contract_amount)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge color={STATUS_COLOR[v.status]}>{PORTAL_VENDOR_STATUS_LABELS[v.status]}</Badge>
                  <button onClick={() => deleteVendor(v.id)} aria-label="Remove vendor">
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
