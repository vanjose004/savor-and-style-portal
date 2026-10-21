import { useEffect, useState } from 'react'
import { Image as ImageIcon, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getDaysUntil } from '../../lib/utils'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function EventGallery() {
  const [eventDate, setEventDate] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)

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
      setEventDate(current.event_date)

      if (getDaysUntil(current.event_date) <= 0) {
        const { data: photoRows } = await supabase
          .from('portal_event_photos')
          .select('*')
          .eq('booking_id', current.id)
          .order('created_at', { ascending: false })

        if (photoRows?.length) {
          const { data: signed } = await supabase.storage
            .from('portal-event-gallery')
            .createSignedUrls(photoRows.map((p) => p.file_path), 3600)
          const urlByPath = Object.fromEntries((signed ?? []).map((s) => [s.path, s.signedUrl]))
          if (!cancelled) setPhotos(photoRows.map((p) => ({ ...p, url: urlByPath[p.file_path] })))
        }
      }
      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

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
        <EmptyState icon={ImageIcon} title="Available after your event" description="Your memory gallery will unlock once your event date has passed." />
      </Card>
    )
  }

  return (
    <Card title="Memory Gallery">
      {photos.length === 0 ? (
        <EmptyState icon={ImageIcon} title="Photos coming soon" description="Your coordinator will upload your event photos here." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer" className="relative group block rounded-lg overflow-hidden aspect-square bg-cream">
              {photo.url && <img src={photo.url} alt={photo.caption ?? ''} className="w-full h-full object-cover" loading="lazy" />}
              <span className="absolute bottom-1 right-1 bg-black/50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Download className="w-3.5 h-3.5 text-white" />
              </span>
            </a>
          ))}
        </div>
      )}
    </Card>
  )
}
