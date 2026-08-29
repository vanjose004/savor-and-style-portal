import { useState } from 'react'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { generateCustomPackagePDF } from '../../lib/pdf'
import { formatCurrency } from '../../lib/utils'
import { BUSINESS } from '../../lib/constants'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

// Same inline mark used by Footer.jsx — lucide-react's icon set doesn't
// include brand/logo glyphs.
function FacebookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.13 8.44 9.94v-7.03H7.9v-2.91h2.54V9.91c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.78-.81 8.44-4.94 8.44-9.94Z" />
    </svg>
  )
}

// Two stages: 'reveal' (Grand Total shown the moment the modal opens,
// Download PDF button) -> 'done' (post-download confirmation). No name/date
// form — the client provides those when they message to confirm, so the
// grand total is revealed immediately on open with nothing to fill in first.
export default function PackageDownloadModal({ open, onClose, summary }) {
  const [stage, setStage] = useState('reveal')
  const [downloading, setDownloading] = useState(false)

  const handleClose = () => {
    onClose()
    // Reset after the close animation-less unmount so a reopen starts fresh.
    setTimeout(() => setStage('reveal'), 200)
  }

  const handleDownload = async () => {
    setDownloading(true)

    await generateCustomPackagePDF({
      venueZoneLabel: summary.venueZone?.label ?? '',
      transportLabel: summary.transportLabel,
      catering: summary.tier
        ? {
            tier: summary.tier.name,
            pax: summary.pax,
            wedding: summary.isWedding,
            beefSwap: summary.beefSwap,
          }
        : null,
      supplierLabels: summary.supplierLabels,
      grandTotal: summary.grandTotal,
    })

    setDownloading(false)
    setStage('done')
  }

  if (stage === 'done') {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Package Summary Downloaded!"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
            <Button as="a" href={BUSINESS.facebookUrl} target="_blank" rel="noopener noreferrer">
              <FacebookIcon className="w-4 h-4" />
              Message Us on Facebook
            </Button>
          </>
        }
      >
        <div className="text-center py-2">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
          <p className="text-sm text-text-muted">
            Your package summary has been downloaded! Send it to us on Facebook Messenger with your name and event
            date to confirm your booking.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Your Grand Total"
      footer={
        <Button className="w-full" onClick={handleDownload} disabled={downloading}>
          {downloading ? 'Preparing…' : 'Download PDF Summary'}
        </Button>
      }
    >
      <div className="text-center py-4">
        <Sparkles className="w-10 h-10 text-gold mx-auto mb-3" />
        <p className="text-sm text-text-muted mb-2">Here's your custom package total:</p>
        <p className="font-heading font-extrabold text-4xl text-wine">{formatCurrency(summary.grandTotal)}</p>
        <p className="text-xs text-text-muted mt-4">
          Download your package summary as a PDF and send it to us on Facebook Messenger — just include your name
          and event date there to confirm.
        </p>
      </div>

      <p className="text-xs text-text-muted mt-4 text-center">
        Questions? Message us anytime at {BUSINESS.phone} or on{' '}
        <a href={BUSINESS.messengerUrl} target="_blank" rel="noopener noreferrer" className="text-wine underline">
          Messenger
        </a>
        .
      </p>
    </Modal>
  )
}
