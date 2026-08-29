import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { CheckCircle2 } from 'lucide-react'
import { generateCustomPackagePDF } from '../../lib/pdf'
import { BUSINESS, EVENT_TYPES } from '../../lib/constants'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// Same inline mark used by Footer.jsx — lucide-react's icon set doesn't
// include brand/logo glyphs.
function FacebookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.13 8.44 9.94v-7.03H7.9v-2.91h2.54V9.91c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.78-.81 8.44-4.94 8.44-9.94Z" />
    </svg>
  )
}

export default function PackageDownloadModal({ open, onClose, summary }) {
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { name: '', event_type: summary.isWedding ? 'Wedding' : '', event_date: '', venue: '' },
  })

  const handleClose = () => {
    onClose()
    // Reset after the close animation-less unmount so a reopen starts fresh.
    setTimeout(() => {
      setDownloaded(false)
      reset()
    }, 200)
  }

  const onSubmit = async (values) => {
    setDownloading(true)

    await generateCustomPackagePDF({
      clientName: values.name.trim(),
      eventType: values.event_type,
      eventDate: values.event_date,
      venue: values.venue.trim(),
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
    setDownloaded(true)
  }

  if (downloaded) {
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
            Your package summary has been downloaded! Send it to us on Facebook Messenger to confirm your booking.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Download Your Package Summary"
      footer={
        <Button type="submit" form="package-download-form" className="w-full" disabled={downloading}>
          {downloading ? 'Preparing…' : 'Download My Package'}
        </Button>
      }
    >
      <p className="text-sm text-text-muted -mt-2 mb-4">
        We'll put together a summary you can send us on Facebook Messenger to confirm your booking.
      </p>

      <form id="package-download-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Name"
          className="sm:col-span-2"
          error={errors.name?.message}
          {...register('name', { required: 'Name is required' })}
        />
        <Select
          label="Event Type"
          placeholder="Select event type"
          options={EVENT_TYPES}
          error={errors.event_type?.message}
          {...register('event_type', { required: 'Event type is required' })}
        />
        <Input
          label="Event Date"
          type="date"
          min={todayStr()}
          error={errors.event_date?.message}
          {...register('event_date', { required: 'Event date is required' })}
        />
        <Input
          label="Venue"
          className="sm:col-span-2"
          error={errors.venue?.message}
          {...register('venue', { required: 'Venue is required' })}
        />
      </form>

      <p className="text-xs text-text-muted mt-4">
        Questions? Message us anytime at {BUSINESS.phone} or on{' '}
        <a href={BUSINESS.messengerUrl} target="_blank" rel="noopener noreferrer" className="text-wine underline">
          Messenger
        </a>
        .
      </p>
    </Modal>
  )
}
