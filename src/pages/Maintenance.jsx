import { Wrench, Phone, MessageCircle } from 'lucide-react'
import Logo from '../components/ui/Logo'
import { BUSINESS } from '../lib/constants'

// Deliberately has zero dependency on Supabase, routing, or any async
// data — this needs to render instantly and correctly even when the
// backend is completely unreachable, which is the exact situation it
// exists for. See src/maintenanceMode.js for the on/off switch.
export default function Maintenance() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md text-center">
        <Logo className="h-16 w-16 mx-auto mb-6 text-wine" />

        <div className="w-14 h-14 rounded-full bg-wine/10 text-wine flex items-center justify-center mx-auto mb-5">
          <Wrench className="w-6 h-6" />
        </div>

        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-wine mb-3">
          We're doing some improvements
        </h1>
        <p className="text-text-muted leading-relaxed mb-8">
          Our site is briefly down for maintenance. We'll be back shortly — thank you for your patience!
        </p>

        <div className="bg-warm-white rounded-xl border border-gold/20 shadow-sm p-5">
          <p className="text-sm font-medium text-text-dark mb-3">Need to reach us right away?</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <a
              href={BUSINESS.phoneTel}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium bg-wine text-warm-white hover:bg-wine-dark transition-colors"
            >
              <Phone className="w-4 h-4" />
              {BUSINESS.phone}
            </a>
            <a
              href={BUSINESS.messengerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium bg-warm-white text-wine border border-gold/40 hover:bg-cream transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Message us
            </a>
          </div>
        </div>

        <p className="text-xs text-text-muted mt-8">{BUSINESS.name}</p>
      </div>
    </div>
  )
}
