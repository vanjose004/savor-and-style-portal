import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Search, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import { BUSINESS } from '../lib/constants'
import Spinner from '../components/ui/Spinner'
import Logo from '../components/ui/Logo'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Textarea from '../components/ui/Textarea'

export default function RsvpPublic() {
  const { slug } = useParams()
  const [eventInfo, setEventInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedGuest, setSelectedGuest] = useState(null)
  const [status, setStatus] = useState('confirmed')
  const [mealPref, setMealPref] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_rsvp_event_info', { p_slug: slug })
      if (cancelled) return
      if (!error && data?.[0]) setEventInfo(data[0])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  const search = async (value) => {
    setQuery(value)
    setSelectedGuest(null)
    if (value.trim().length < 2) {
      setResults([])
      return
    }
    const { data } = await supabase.rpc('search_rsvp_guests', { p_slug: slug, p_query: value.trim() })
    setResults(data ?? [])
  }

  const submit = async () => {
    if (!selectedGuest) return
    setSubmitting(true)
    const { error } = await supabase.rpc('submit_rsvp', {
      p_slug: slug,
      p_guest_id: selectedGuest.id,
      p_status: status,
      p_meal_pref: mealPref || null,
      p_notes: notes || null,
    })
    setSubmitting(false)
    if (!error) setDone(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!eventInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-4 text-center">
        <Logo className="w-12 h-12 text-wine mb-3" />
        <h1 className="text-xl font-bold text-wine mb-1">RSVP Link Not Found</h1>
        <p className="text-sm text-text-muted">This link may be invalid or RSVP may not be enabled yet.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream px-4 py-10">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <Logo className="w-10 h-10 text-wine mx-auto mb-2" />
          <h1 className="font-heading font-bold text-xl text-wine">{eventInfo.client_name}'s Wedding</h1>
          <p className="text-sm text-text-muted">
            {formatDate(eventInfo.event_date)} · {eventInfo.venue ?? 'Venue TBD'}
          </p>
        </div>

        {done ? (
          <Card>
            <div className="text-center py-6">
              <Check className="w-10 h-10 text-success mx-auto mb-2" />
              <p className="text-sm font-semibold text-text-dark">Thank you, {selectedGuest.full_name}!</p>
              <p className="text-xs text-text-muted mt-1">Your RSVP has been recorded.</p>
            </div>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-text-dark mb-3">Find your name to RSVP:</p>
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <Input className="pl-9" placeholder="Type your name…" value={query} onChange={(e) => search(e.target.value)} />
            </div>

            {!selectedGuest && results.length > 0 && (
              <ul className="space-y-1 mb-3">
                {results.map((guest) => (
                  <li key={guest.id}>
                    <button
                      onClick={() => setSelectedGuest(guest)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-cream border border-gold/15 text-sm text-text-dark"
                    >
                      {guest.full_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {selectedGuest && (
              <div className="space-y-3 border-t border-gold/10 pt-4">
                <p className="text-sm font-medium text-text-dark">{selectedGuest.full_name}</p>
                <div className="flex gap-2">
                  {[
                    { value: 'confirmed', label: "I'll be there" },
                    { value: 'maybe', label: 'Maybe' },
                    { value: 'declined', label: "Can't make it" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      className={`flex-1 text-xs font-medium px-2 py-2 rounded-lg border ${
                        status === opt.value ? 'bg-wine text-warm-white border-wine' : 'border-gold/30 text-text-muted'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {status === 'confirmed' && <Input placeholder="Meal preference (optional)" value={mealPref} onChange={(e) => setMealPref(e.target.value)} />}
                <Textarea placeholder="Note to the couple (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <Button className="w-full" onClick={submit} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit RSVP'}
                </Button>
              </div>
            )}
          </Card>
        )}

        <p className="text-xs text-text-muted text-center mt-6">{BUSINESS.name}</p>
      </div>
    </div>
  )
}
