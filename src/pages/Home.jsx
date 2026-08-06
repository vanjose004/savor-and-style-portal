import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { BUSINESS } from '../lib/constants'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Logo from '../components/ui/Logo'

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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image + overlay */}
      <div className="absolute inset-0">
        <img src="/hero.jpg" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#2a0808]/70 to-black/85" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 py-24 text-center max-w-xl mx-auto">
        <div className="rounded-full overflow-hidden ring-4 ring-[#B8962E] shadow-2xl w-28 h-28 sm:w-32 sm:h-32">
          <Logo className="w-full h-full" />
        </div>

        <p
          className="mt-6 font-heading italic text-xl sm:text-2xl"
          style={{ color: '#B8962E' }}
        >
          Masarap. Maayos. Mapagkakatiwalaan.
        </p>

        <p className="mt-2 text-sm text-white/70 tracking-wide">{BUSINESS.displayLocation}</p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Link
            to="/book"
            className="w-full sm:w-auto text-center font-semibold px-9 py-3.5 rounded-full shadow-lg transition-all hover:scale-[1.03]"
            style={{ backgroundColor: '#B8962E', color: '#2a1a00' }}
          >
            Book Now
          </Link>
          <button
            type="button"
            onClick={openModal}
            className="w-full sm:w-auto text-center font-semibold px-9 py-3.5 rounded-full border-2 border-white/70 text-white transition-all hover:bg-white/10 hover:border-white"
          >
            View My Booking
          </button>
        </div>

        <div className="mt-8 flex items-center gap-4 text-xs tracking-widest uppercase">
          <Link to="/admin/login" className="text-white/50 hover:text-[#B8962E] transition-colors">
            Admin Login
          </Link>
          <span className="text-white/25">•</span>
          <Link to="/staff/login" className="text-white/50 hover:text-[#B8962E] transition-colors">
            Staff Login
          </Link>
        </div>
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
