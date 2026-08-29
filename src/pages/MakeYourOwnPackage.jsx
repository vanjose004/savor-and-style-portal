import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { BUSINESS } from '../lib/constants'
import {
  CATERING_TIERS,
  COORDINATION_FEE,
  VENUE_ZONES,
  getCateringPrice,
  getSupplierSummary,
  getSuppliers,
  getTransportLabel,
  initialSupplierSelections,
} from '../lib/customPackage'
import Logo from '../components/ui/Logo'
import VenueSection from '../components/custom-package/VenueSection'
import CateringSection from '../components/custom-package/CateringSection'
import SuppliersSection from '../components/custom-package/SuppliersSection'
import RunningTotalPanel from '../components/custom-package/RunningTotalPanel'
import PackagePreviewModal from '../components/custom-package/PackagePreviewModal'

// Renders both /wedding-quote (eventCategory="wedding") and /debut-quote
// (eventCategory="debut") — see src/App.jsx. The two differ only in title,
// whether the Wedding/Birthday toggle shows at all, and a handful of
// supplier prices/descriptions (see getSuppliers in customPackage.js).
export default function MakeYourOwnPackage({ eventCategory = 'wedding' }) {
  const isDebut = eventCategory === 'debut'
  const pageTitle = isDebut ? 'Build Your Debut Package' : 'Make Your Own Package'
  const builderBadge = isDebut ? 'Debut Package Builder' : 'Wedding Package Builder'

  const suppliers = useMemo(() => getSuppliers(eventCategory), [eventCategory])

  const [venueId, setVenueId] = useState(null)
  const [pax, setPax] = useState(null)
  const [tierId, setTierId] = useState(null)
  const [isWedding, setIsWedding] = useState(false)
  const [beefSwap, setBeefSwap] = useState(false)
  const [selections, setSelections] = useState(() => initialSupplierSelections(suppliers))
  const [modalOpen, setModalOpen] = useState(false)

  const venueZone = useMemo(() => VENUE_ZONES.find((z) => z.id === venueId) ?? null, [venueId])
  const tier = useMemo(() => CATERING_TIERS.find((t) => t.id === tierId) ?? null, [tierId])
  const eventTypeLabel = isDebut ? 'Debut' : isWedding ? 'Wedding' : 'Birthday / Gathering'

  const handleTierChange = (id) => {
    setTierId(id)
    if (id !== 'gold') setBeefSwap(false)
  }

  const toggleSupplier = (id) => {
    setSelections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const chooseSupplierOption = (id, optionId) => {
    setSelections((prev) => ({ ...prev, [id]: optionId }))
  }

  const toggleHmua = (id) => {
    setSelections((prev) => ({ ...prev, [id]: { ...prev[id], enabled: !prev[id].enabled } }))
  }

  const changeHmuaHeads = (id, heads) => {
    setSelections((prev) => ({ ...prev, [id]: { ...prev[id], extraHeads: heads } }))
  }

  // Turning a quantity-type supplier (e.g. Tiffany Chair Upgrade) on always
  // resets its quantity to the currently-selected pax, per spec.
  const toggleQtySupplier = (id, currentPax) => {
    setSelections((prev) => {
      const enabling = !prev[id].enabled
      return { ...prev, [id]: { enabled: enabling, qty: enabling ? currentPax || 0 : prev[id].qty } }
    })
  }

  const changeQtySupplierQty = (id, qty) => {
    setSelections((prev) => ({ ...prev, [id]: { ...prev[id], qty } }))
  }

  const transportFee = venueZone?.fee ?? 0
  const transportLabel = getTransportLabel(venueZone)
  const cateringPrice = getCateringPrice({ tier, pax, beefSwap })
  const { total: suppliersTotal, items: supplierItems } = getSupplierSummary(selections, suppliers)
  const grandTotal = cateringPrice + suppliersTotal + transportFee + COORDINATION_FEE
  const canRequest = Boolean(venueZone && tier && pax)

  const summary = {
    pageTitle,
    eventTypeLabel,
    venueZone,
    transportLabel,
    tier,
    pax,
    isWedding,
    beefSwap,
    supplierItems,
    grandTotal,
  }

  return (
    <div className="min-h-screen bg-cream pb-28 lg:pb-12">
      <header className="sticky top-0 z-30 backdrop-blur-sm border-b border-gold/30 bg-wine">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <Logo className="h-9 w-9" />
            <span className="font-heading font-bold text-lg text-white tracking-wide hidden sm:inline">
              {BUSINESS.name}
            </span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-3xl mx-auto text-center px-4 pt-12 pb-6"
      >
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-gold bg-wine px-4 py-1.5 rounded-full">
          {builderBadge}
        </span>
        <h1 className="font-heading font-bold text-3xl sm:text-4xl text-wine mt-4">{pageTitle}</h1>
        <p className="mt-3 text-text-muted text-lg">
          Choose your venue, catering tier, and the suppliers you need — your Grand Total is revealed when you're
          ready.
        </p>
      </motion.div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start">
        <div className="space-y-12">
          <VenueSection venueId={venueId} onVenueChange={setVenueId} />

          <CateringSection
            eventCategory={eventCategory}
            venueSelected={Boolean(venueZone)}
            pax={pax}
            onPaxChange={setPax}
            tierId={tierId}
            onTierChange={handleTierChange}
            isWedding={isWedding}
            onWeddingChange={setIsWedding}
            beefSwap={beefSwap}
            onBeefSwapChange={setBeefSwap}
          />

          <SuppliersSection
            suppliers={suppliers}
            pax={pax}
            selections={selections}
            onToggle={toggleSupplier}
            onChoose={chooseSupplierOption}
            onHmuaToggle={toggleHmua}
            onHmuaHeadsChange={changeHmuaHeads}
            onQtyToggle={toggleQtySupplier}
            onQtyChange={changeQtySupplierQty}
          />

          {/* Full summary inline for mobile/tablet — the sidebar (right column) covers desktop. */}
          <div className="lg:hidden">
            <RunningTotalPanel
              venueZone={venueZone}
              transportLabel={transportLabel}
              tier={tier}
              pax={pax}
              beefSwap={beefSwap}
              supplierItems={supplierItems}
              canRequest={canRequest}
              onRequest={() => setModalOpen(true)}
            />
          </div>
        </div>

        <div className="hidden lg:block sticky top-24">
          <RunningTotalPanel
            venueZone={venueZone}
            transportLabel={transportLabel}
            tier={tier}
            pax={pax}
            beefSwap={beefSwap}
            supplierItems={supplierItems}
            canRequest={canRequest}
            onRequest={() => setModalOpen(true)}
          />
        </div>
      </div>

      {/* Sticky bottom bar — mobile/tablet only. No total shown, ever, per the page's design. */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-wine border-t border-gold/30 shadow-[0_-4px_16px_rgba(0,0,0,0.15)]">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <p className="text-sm text-white/80">Ready to see your price?</p>
          <button
            type="button"
            disabled={!canRequest}
            onClick={() => setModalOpen(true)}
            className="font-semibold px-5 py-2.5 rounded-full bg-gold text-wine-dark transition-all hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create My Package
          </button>
        </div>
      </div>

      <PackagePreviewModal open={modalOpen} onClose={() => setModalOpen(false)} summary={summary} />
    </div>
  )
}
