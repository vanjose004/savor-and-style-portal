import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check } from 'lucide-react'
import { useToast } from '../../../hooks/useToast'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import { BUSINESS } from '../../../lib/constants'

export default function EventCheckinQRCard({ booking }) {
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)

  // BUSINESS.siteUrl (hardcoded), not window.location.origin — this QR
  // gets shared to the staff group chat and screenshotted/saved, so it
  // must never accidentally bake in a preview-deploy domain.
  const checkinUrl = `${BUSINESS.siteUrl}/attendance/event/${booking.qr_token}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(checkinUrl)
      setCopied(true)
      showToast('Link copied to clipboard.')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('Could not copy link.', 'error')
    }
  }

  return (
    <Card title="Event Check-in QR">
      <p className="text-xs text-text-muted mb-3">
        I-send sa staff group chat bago ang event. Valid lang 4 hours bago hanggang 8 hours pagkatapos ng event time.
      </p>
      <div className="flex justify-center bg-warm-white p-3 rounded-lg border border-gold/20 mb-3">
        <QRCodeSVG value={checkinUrl} size={160} />
      </div>
      <p className="text-xs text-text-dark break-all bg-cream rounded-lg px-3 py-2 border border-gold/20 mb-3">
        {checkinUrl}
      </p>
      <Button size="sm" variant="secondary" onClick={handleCopy} className="w-full">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copied' : 'Copy Link'}
      </Button>
    </Card>
  )
}
