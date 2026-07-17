import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Logo from '../components/ui/Logo'
import SearchableSelect from '../components/ui/SearchableSelect'
import { BUSINESS } from '../lib/constants'

export default function HomeCheckin() {
  const { showToast } = useToast()
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [staffId, setStaffId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase.rpc('get_active_staff_list')
      if (cancelled) return
      if (!error) setStaffList(data ?? [])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!staffId) {
      showToast('Piliin muna ang pangalan mo.', 'error')
      return
    }

    setSubmitting(true)
    const { data, error } = await supabase.rpc('record_home_checkin', { p_staff_id: staffId })
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
          location_type: 'home',
          staff_name: record.staff_name,
          checked_in_at: record.checked_in_at,
        }),
      }).catch(() => {})
    }
  }

  if (result) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
        <Card className="max-w-sm w-full text-center py-10">
          <CheckCircle2 className="w-14 h-14 text-success mx-auto mb-4" />
          <h1 className="text-xl font-bold text-wine mb-2">Naka-log in ka na!</h1>
          <p className="text-sm text-text-muted">{result.staff_name} — Bahay/Home</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <Card className="max-w-sm w-full">
        <div className="text-center mb-6">
          <Logo className="w-14 h-14 text-wine mx-auto mb-3" />
          <h1 className="text-xl font-bold text-wine">Home Check-in</h1>
          <p className="text-sm text-text-muted mt-1">{BUSINESS.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SearchableSelect label="Pangalan Mo" options={staffList} value={staffId} onChange={setStaffId} />
          <Button type="submit" className="w-full" disabled={submitting || loading}>
            {submitting ? 'Nagla-log in…' : 'Log In'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
