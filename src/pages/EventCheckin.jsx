import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Logo from '../components/ui/Logo'
import SearchableSelect from '../components/ui/SearchableSelect'
import { formatDate, formatTime } from '../lib/utils'

export default function EventCheckin() {
  const { qr_token: qrToken } = useParams()
  const { showToast } = useToast()
  const [booking, setBooking] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [staffId, setStaffId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [bookingRes, staffRes] = await Promise.all([
        supabase.rpc('get_event_checkin_info', { p_qr_token: qrToken }),
        supabase.rpc('get_active_staff_list'),
      ])
      if (cancelled) return

      const bookingRow = bookingRes.data?.[0]
      if (bookingRes.error || !bookingRow) {
        setNotFound(true)
      } else {
        setBooking(bookingRow)
      }
      setStaffList(staffRes.data ?? [])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [qrToken])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!staffId) {
      showToast('Piliin muna ang pangalan mo.', 'error')
      return
    }

    setSubmitting(true)
    const { data, error } = await supabase.rpc('record_event_checkin', {
      p_qr_token: qrToken,
      p_staff_id: staffId,
    })
    setSubmitting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    const record = data?.[0]
    setResult(record)

    // Best-effort — the check-in is already logged even if this fails.
    if (record) {
      fetch('/api/notify-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_type: 'event',
          staff_name: record.staff_name,
          booking_code: record.booking_code,
          venue: record.venue,
          checked_in_at: record.checked_in_at,
        }),
      }).catch(() => {})
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 text-center">
        <Logo className="w-12 h-12 text-wine mb-3" />
        <h1 className="text-xl font-bold text-wine mb-1">Hindi Mahanap</h1>
        <p className="text-sm text-text-muted">Invalid o expired na itong QR code.</p>
      </div>
    )
  }

  if (result) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
        <Card className="max-w-sm w-full text-center py-10">
          <CheckCircle2 className="w-14 h-14 text-success mx-auto mb-4" />
          <h1 className="text-xl font-bold text-wine mb-2">Naka-log in ka na!</h1>
          <p className="text-sm text-text-muted">
            {result.staff_name} — {result.venue} ({result.booking_code})
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <Card className="max-w-sm w-full">
        <div className="text-center mb-6">
          <Logo className="w-14 h-14 text-wine mx-auto mb-3" />
          <h1 className="text-xl font-bold text-wine">Event Check-in</h1>
          <p className="text-sm text-text-muted mt-1">
            {booking.event_type} — {formatDate(booking.event_date)}
            {booking.event_time ? ` · ${formatTime(booking.event_time)}` : ''}
          </p>
          <p className="text-xs text-text-muted">{booking.venue}</p>
        </div>

        {!booking.is_within_window && (
          <div className="flex items-start gap-2 bg-warning/10 text-warning rounded-lg px-3 py-2 mb-4 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Wala pa o lampas na sa valid na oras ng QR code na ito.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <SearchableSelect label="Pangalan Mo" options={staffList} value={staffId} onChange={setStaffId} />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Nagla-log in…' : 'Log In'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
