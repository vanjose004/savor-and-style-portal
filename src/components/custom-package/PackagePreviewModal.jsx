import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { buildCustomPackagePDF } from '../../lib/pdf'
import { BUSINESS } from '../../lib/constants'
import Spinner from '../ui/Spinner'
import Button from '../ui/Button'
import MobilePackagePreview from './MobilePackagePreview'

// Same inline mark used by Footer.jsx — lucide-react's icon set doesn't
// include brand/logo glyphs.
function FacebookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.13 8.44 9.94v-7.03H7.9v-2.91h2.54V9.91c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.78-.81 8.44-4.94 8.44-9.94Z" />
    </svg>
  )
}

// Mobile browsers (notably iOS Safari and most in-app WebViews) can't render
// a PDF blob inside an <iframe> — the pane just stays blank. Detect via
// viewport width or a mobile user-agent match and fall back to an HTML
// preview (MobilePackagePreview) built from the same `summary` data instead.
function isMobileDevice() {
  if (typeof window === 'undefined') return false
  const uaIsMobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent)
  return window.innerWidth < 768 || uaIsMobile
}

// No name/date form — clicking "Create My Package" on the page opens this
// straight into a preview. Desktop gets a live PDF preview (rendered from
// the exact same jsPDF doc that gets downloaded, so preview and download can
// never drift apart); mobile gets an HTML preview instead (see
// isMobileDevice above) — the PDF still builds in the background either way
// so "Download PDF" always works.
export default function PackagePreviewModal({ open, onClose, summary }) {
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const pdfRef = useRef(null) // { doc, filename, blobUrl }
  const [blobUrl, setBlobUrl] = useState(null)

  useEffect(() => {
    if (!open) return
    setIsMobile(isMobileDevice())
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)

    async function build() {
      const { doc, filename } = await buildCustomPackagePDF({
        eventTypeLabel: summary.isWedding ? 'Wedding' : 'Birthday / Gathering',
        venueZoneLabel: summary.venueZone?.label ?? '',
        transportLabel: summary.transportLabel,
        catering: summary.tier
          ? {
              tier: summary.tier.name,
              pax: summary.pax,
              wedding: summary.isWedding,
              beefSwap: summary.beefSwap,
              mainDishes: summary.tier.mainDishes,
            }
          : null,
        supplierItems: summary.supplierItems,
        grandTotal: summary.grandTotal,
      })

      if (cancelled) return
      const url = doc.output('bloburl')
      pdfRef.current = { doc, filename, blobUrl: url }
      setBlobUrl(url)
      setLoading(false)
    }

    build()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild only when the modal opens
  }, [open])

  useEffect(() => {
    // Revoke the previous blob URL whenever we build a new one or unmount.
    return () => {
      if (pdfRef.current?.blobUrl) URL.revokeObjectURL(pdfRef.current.blobUrl)
    }
  }, [blobUrl])

  const handleClose = () => {
    onClose()
    setBlobUrl(null)
    pdfRef.current = null
  }

  const handleDownload = () => {
    pdfRef.current?.doc.save(pdfRef.current.filename)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-warm-white rounded-xl shadow-2xl w-full max-w-3xl h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gold/20 shrink-0">
          <h3 className="text-lg font-semibold text-wine">Your Package Preview</h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-text-muted hover:text-wine transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 bg-cream overflow-y-auto">
          {isMobile ? (
            <MobilePackagePreview summary={summary} />
          ) : loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <Spinner className="w-8 h-8" />
              <p className="text-sm text-text-muted">Preparing your package preview…</p>
            </div>
          ) : (
            <iframe src={blobUrl} title="Package PDF Preview" className="w-full h-full border-0" />
          )}
        </div>

        <div className="px-6 py-4 border-t border-gold/20 flex flex-col sm:flex-row gap-3 shrink-0">
          <Button className="flex-1" onClick={handleDownload} disabled={loading}>
            Download PDF
          </Button>
          <Button
            as="a"
            href={BUSINESS.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            className="flex-1"
          >
            <FacebookIcon className="w-4 h-4" />
            Message Us on Facebook
          </Button>
        </div>
      </div>
    </div>
  )
}
