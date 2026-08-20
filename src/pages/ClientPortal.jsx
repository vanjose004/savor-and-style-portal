import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Spinner from '../components/ui/Spinner'
import Logo from '../components/ui/Logo'
import { BUSINESS } from '../lib/constants'
import {
  DEMO_BOOKING_CODE,
  DEMO_BOOKING,
  DEMO_PACKAGE_NAME,
  DEMO_MENU_ITEMS,
  DEMO_PAID,
  DEMO_BALANCE,
  DEMO_TOTAL_AMOUNT,
} from '../lib/demoBooking'
import EventSummaryCard from '../components/client/EventSummaryCard'
import DefaultInclusionsCard from '../components/client/DefaultInclusionsCard'
import KidsMenuCard from '../components/client/KidsMenuCard'
import FreebiesCard from '../components/client/FreebiesCard'
import PaymentStatusCard from '../components/client/PaymentStatusCard'
import ClientMenuCard from '../components/client/ClientMenuCard'
import ClientUpdatesCard from '../components/client/ClientUpdatesCard'
import ChangeRequestCard from '../components/client/ChangeRequestCard'
import ContractStatusCard from '../components/client/ContractStatusCard'
import DocumentsCard from '../components/client/DocumentsCard'
import ContactCard from '../components/client/ContactCard'
import DemoMenuCard from '../components/client/DemoMenuCard'
import DemoPaymentCard from '../components/client/DemoPaymentCard'
import DemoDocumentsCard from '../components/client/DemoDocumentsCard'

export default function ClientPortal() {
  const { access_token: accessToken } = useParams()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const isDemo = accessToken?.trim().toUpperCase() === DEMO_BOOKING_CODE

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      if (isDemo) {
        setBooking(DEMO_BOOKING)
        setLoading(false)
        return
      }

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
  }, [accessToken, isDemo])

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
      {isDemo && (
        <div className="bg-warning/15 text-warning border-b border-warning/30 px-4 py-2.5 text-center text-sm font-semibold flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          DEMO MODE — sample data for preview only, no real booking exists
        </div>
      )}

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
        <KidsMenuCard booking={booking} />
        <FreebiesCard freebies={booking.freebies} />
        {isDemo ? (
          <>
            <DemoPaymentCard totalAmount={DEMO_TOTAL_AMOUNT} paid={DEMO_PAID} balance={DEMO_BALANCE} />
            <DemoMenuCard packageName={DEMO_PACKAGE_NAME} pax={booking.pax} items={DEMO_MENU_ITEMS} />
            <DemoDocumentsCard />
          </>
        ) : (
          <>
            <PaymentStatusCard accessToken={accessToken} booking={booking} />
            <ClientMenuCard accessToken={accessToken} menuConfirmed={booking.menu_confirmed} />
            <ClientUpdatesCard accessToken={accessToken} />
            <ChangeRequestCard accessToken={accessToken} />
            <DocumentsCard accessToken={accessToken} booking={booking} />
          </>
        )}
        <ContractStatusCard booking={booking} />
        <ContactCard />
      </main>
    </div>
  )
}
