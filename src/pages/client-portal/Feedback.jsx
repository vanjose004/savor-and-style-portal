import { useEffect, useState } from 'react'
import { Star, Send, ExternalLink, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { getDaysUntil } from '../../lib/utils'
import { BUSINESS } from '../../lib/constants'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Textarea from '../../components/ui/Textarea'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const RATING_LABELS = { food: 'Food', service: 'Service', styling: 'Styling', coordination: 'Coordination', overall: 'Overall' }

function StarRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-dark">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} stars`}>
            <Star className={`w-5 h-5 ${n <= value ? 'fill-gold text-gold' : 'text-gold/30'}`} />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Feedback() {
  const { showToast } = useToast()
  const [bookingId, setBookingId] = useState(null)
  const [eventDate, setEventDate] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data: bookingRows } = await supabase.rpc('get_my_booking_summary')
      const current = bookingRows?.[0]
      if (cancelled || !current) {
        setLoading(false)
        return
      }
      setBookingId(current.id)
      setEventDate(current.event_date)
      const { data: existing } = await supabase.from('portal_feedback').select('*').eq('booking_id', current.id).maybeSingle()
      setFeedback(existing ?? { ratings: {}, comment: '', allow_testimonial: false })
      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const setRating = (key, value) => setFeedback((prev) => ({ ...prev, ratings: { ...prev.ratings, [key]: value } }))

  const submit = async () => {
    setSubmitting(true)
    const { error } = await supabase
      .from('portal_feedback')
      .upsert({ booking_id: bookingId, ...feedback }, { onConflict: 'booking_id' })
    setSubmitting(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    showToast('Thank you for your feedback!')
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (eventDate && getDaysUntil(eventDate) > 0) {
    return (
      <Card>
        <EmptyState icon={ImageIcon} title="Available after your event" description="Share your feedback once your event is done." />
      </Card>
    )
  }

  const alreadySubmitted = !!feedback?.created_at

  return (
    <div className="space-y-6">
      <Card title="Feedback & Review">
        <div className="space-y-3 mb-4">
          {Object.entries(RATING_LABELS).map(([key, label]) => (
            <StarRow key={key} label={label} value={feedback.ratings?.[key] ?? 0} onChange={(v) => setRating(key, v)} />
          ))}
        </div>

        <Textarea
          label="Comments"
          value={feedback.comment ?? ''}
          onChange={(e) => setFeedback((prev) => ({ ...prev, comment: e.target.value }))}
        />

        <label className="flex items-center gap-2 text-sm text-text-dark mt-3">
          <input
            type="checkbox"
            checked={feedback.allow_testimonial}
            onChange={(e) => setFeedback((prev) => ({ ...prev, allow_testimonial: e.target.checked }))}
          />
          You may feature this as a testimonial
        </label>

        <div className="flex justify-end mt-4">
          <Button onClick={submit} disabled={submitting}>
            <Send className="w-4 h-4" />
            {alreadySubmitted ? 'Update Feedback' : 'Submit Feedback'}
          </Button>
        </div>
      </Card>

      {alreadySubmitted && (
        <Card>
          <p className="text-sm text-text-dark mb-3">Thank you! We'd love it if you also left us a review:</p>
          <Button as="a" href={BUSINESS.facebookUrl} target="_blank" rel="noopener noreferrer" variant="secondary">
            <ExternalLink className="w-4 h-4" />
            Leave a Facebook Review
          </Button>
        </Card>
      )}
    </div>
  )
}
