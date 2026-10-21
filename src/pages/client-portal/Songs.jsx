import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Music } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { PORTAL_SONG_SEGMENTS } from '../../lib/constants'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function Songs() {
  const { showToast } = useToast()
  const [bookingId, setBookingId] = useState(null)
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { segment: PORTAL_SONG_SEGMENTS[0] } })

  const loadSongs = async (id) => {
    const { data } = await supabase.from('portal_songs').select('*').eq('booking_id', id).order('created_at')
    setSongs(data ?? [])
  }

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
      await loadSongs(current.id)
      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const onAdd = async (values) => {
    setSubmitting(true)
    const { error } = await supabase.from('portal_songs').insert({ booking_id: bookingId, ...values })
    setSubmitting(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    reset({ segment: values.segment })
    loadSongs(bookingId)
  }

  const deleteSong = async (id) => {
    const { error } = await supabase.from('portal_songs').delete().eq('id', id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadSongs(bookingId)
  }

  const grouped = useMemo(() => {
    const groups = {}
    for (const song of songs) {
      groups[song.segment] = groups[song.segment] ?? []
      groups[song.segment].push(song)
    }
    return groups
  }, [songs])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card title="Add a Song">
        <form onSubmit={handleSubmit(onAdd)} className="grid grid-cols-2 gap-3">
          <Select options={PORTAL_SONG_SEGMENTS} {...register('segment')} />
          <Input placeholder="Title" error={errors.title?.message} {...register('title', { required: 'Enter a title' })} />
          <Input placeholder="Artist" {...register('artist')} />
          <Input placeholder="Link (YouTube/Spotify)" {...register('link')} />
          <label className="flex items-center gap-2 text-sm text-text-dark">
            <input type="checkbox" {...register('must_play')} />
            Must Play
          </label>
          <label className="flex items-center gap-2 text-sm text-text-dark">
            <input type="checkbox" {...register('do_not_play')} />
            Do Not Play
          </label>
          <div className="col-span-2 flex justify-end">
            <Button type="submit" size="sm" disabled={submitting}>
              <Plus className="w-4 h-4" />
              Add Song
            </Button>
          </div>
        </form>
      </Card>

      {songs.length === 0 ? (
        <EmptyState icon={Music} title="No songs yet" description="Add songs for your processional, first dance, and more." />
      ) : (
        Object.entries(grouped).map(([segment, segmentSongs]) => (
          <Card key={segment} title={segment}>
            <ul className="divide-y divide-gold/10">
              {segmentSongs.map((song) => (
                <li key={song.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-dark truncate">
                      {song.title}
                      {song.artist ? ` — ${song.artist}` : ''}
                    </p>
                    <div className="flex gap-1.5 mt-0.5">
                      {song.must_play && <Badge color="success">Must Play</Badge>}
                      {song.do_not_play && <Badge color="danger">Do Not Play</Badge>}
                    </div>
                  </div>
                  <button onClick={() => deleteSong(song.id)} aria-label="Remove song">
                    <Trash2 className="w-4 h-4 text-danger" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  )
}
