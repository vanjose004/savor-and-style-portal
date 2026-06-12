import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { useToast } from '../../../hooks/useToast'
import Card from '../../ui/Card'
import Button from '../../ui/Button'

export default function ClientPortalCard({ booking }) {
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)

  const portalUrl = `${window.location.origin}/booking/${booking.access_token}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl)
      setCopied(true)
      showToast('Link copied to clipboard.')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('Could not copy link.', 'error')
    }
  }

  return (
    <Card title="Client Portal">
      <p className="text-xs text-text-muted mb-2">Share this link with the client to view their booking.</p>
      <p className="text-sm text-text-dark break-all bg-cream rounded-lg px-3 py-2 border border-gold/20">
        {portalUrl}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={handleCopy}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy Link'}
        </Button>
        <Button as="a" href={portalUrl} target="_blank" rel="noopener noreferrer" size="sm" variant="outline">
          <ExternalLink className="w-4 h-4" />
          View as Client
        </Button>
      </div>
    </Card>
  )
}
