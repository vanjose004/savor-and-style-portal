import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Spinner from '../components/ui/Spinner'
import Logo from '../components/ui/Logo'
import { BUSINESS } from '../lib/constants'
import EventSummaryCard from '../components/client/EventSummaryCard'
import DefaultInclusionsCard from '../components/client/DefaultInclusionsCard'
import FreebiesCard from '../components/client/FreebiesCard'
import PaymentStatusCard from '../components/client/PaymentStatusCard'
import ClientMenuCard from '../components/client/ClientMenuCard'
import ClientUpdatesCard from '../components/client/ClientUpdatesCard'
import ChangeRequestCard from '../components/client/ChangeRequestCard'
import ContractStatusCard from '../components/client/ContractStatusCard'
import ContactCard from '../components/client/ContactCard'

export default function ClientPortal() {
  const { access_token: accessToken } = useParams()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_booking_by_token', { p_access_token: accessToken })
      if (cancelled) return
      if (error || !data || data.length === 0) {
        setNotFound(true)
      } else {
        setBooking(data[0])
      }
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [accessToken])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (notFound || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-4 text-center">
        <Logo className="w-12 h-12 text-wine mb-3" />
        <h1 className="text-xl font-bold text-wine mb-1">Booking Not Found</h1>
        <p className="text-sm text-text-muted">
          This link may be invalid or expired. Please contact us at {BUSINESS.phone}.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-wine text-warm-white">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-warm-white/80 mb-2">
            <Logo className="w-5 h-5 text-warm-white" />
            <span className="font-heading font-semibold text-sm">{BUSINESS.name}</span>
          </div>
          <h1 className="text-2xl font-bold">Hello {booking.client_first_name}, here are your event details</h1>
          <p className="text-warm-white/70 text-sm mt-1">Booking {booking.booking_code}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <EventSummaryCard booking={booking} />
        <DefaultInclusionsCard />
        <FreebiesCard freebies={booking.freebies} />
        <PaymentStatusCard accessToken={accessToken} booking={booking} />
        <ClientMenuCard accessToken={accessToken} menuConfirmed={booking.menu_confirmed} />
        <ClientUpdatesCard accessToken={accessToken} />
        <ChangeRequestCard accessToken={accessToken} />
        <ContractStatusCard booking={booking} />
        <ContactCard />
      </main>
    </div>
  )
}
