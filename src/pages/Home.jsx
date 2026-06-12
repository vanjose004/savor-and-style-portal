import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UtensilsCrossed, Search } from 'lucide-react'
import { BUSINESS } from '../lib/constants'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const ACCESS_TOKEN_PATTERN = /^[0-9a-f]{32}$/i

function resolveBookingInput(rawValue) {
  const value = rawValue.trim()
  const urlMatch = value.match(/\/booking\/([0-9a-f]{32})/i)
  if (urlMatch) return { type: 'token', value: urlMatch[1] }
  if (ACCESS_TOKEN_PATTERN.test(value)) return { type: 'token', value }
  return { type: 'code', value: value.toUpperCase() }
}

export default function Home() {
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const openModal = () => {
    setValue('')
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!value.trim()) {
      setError('Please enter your booking code or access link.')
      return
    }

    const resolved = resolveBookingInput(value)

    if (resolved.type === 'token') {
      navigate(`/booking/${resolved.value}`)
      return
    }

    setSubmitting(true)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('get_access_token_by_booking_code', {
      p_booking_code: resolved.value,
    })
    setSubmitting(false)

    if (rpcError || !data) {
      setError('Booking not found. Please check your booking code and try again.')
      return
    }

    navigate(`/booking/${data}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-4 text-center">
      <UtensilsCrossed className="w-12 h-12 text-wine mb-4" />
      <h1 className="text-4xl font-bold text-wine mb-2">{BUSINESS.name}</h1>
      <p className="text-text-muted mb-8">{BUSINESS.displayLocation}</p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/admin/login"
          className="px-6 py-3 rounded-lg bg-wine text-warm-white font-medium hover:bg-wine-dark transition-colors"
        >
          Admin Login
        </Link>
        <Link
          to="/staff/login"
          className="px-6 py-3 rounded-lg border border-gold text-wine font-medium hover:bg-warm-white transition-colors"
        >
          Staff Login
        </Link>
        <button
          type="button"
          onClick={openModal}
          className="px-6 py-3 rounded-lg border border-gold text-wine font-medium hover:bg-warm-white transition-colors"
        >
          View My Booking
        </button>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="View My Booking">
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <p className="text-sm text-text-muted">
            Enter the booking code or access link from your confirmation message to view your event details.
          </p>
          <Input
            label="Booking Code or Access Link"
            placeholder="e.g. SS-2026-001"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={error}
            autoFocus
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            <Search className="w-4 h-4" />
            {submitting ? 'Searching…' : 'Find My Booking'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
