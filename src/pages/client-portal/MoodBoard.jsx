import { useEffect, useState } from 'react'
import { Upload, Trash2, Send, Image as ImageIcon, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { WEDDING_THEME_PRESETS, MOOD_BOARD_STATUS_LABELS } from '../../lib/constants'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const PRESET_COLORS = ['#722F37', '#C9A84C', '#F5F0DC', '#2D6A4F', '#E8D9A0', '#4A1A20', '#8c93b8', '#D9B8BC']

export default function MoodBoard() {
  const { showToast } = useToast()
  const [bookingId, setBookingId] = useState(null)
  const [board, setBoard] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [newLink, setNewLink] = useState('')
  const [file, setFile] = useState(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadAll = async (id) => {
    const [boardRes, itemsRes] = await Promise.all([
      supabase.from('portal_mood_board').select('*').eq('booking_id', id).maybeSingle(),
      supabase.from('portal_mood_board_items').select('*').eq('booking_id', id).order('created_at', { ascending: false }),
    ])
    setBoard(boardRes.data ?? { booking_id: id, theme: null, palette: [], pinterest_links: [], status: 'draft' })
    setItems(itemsRes.data ?? [])
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
      await loadAll(current.id)
      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const isEditable = board?.status === 'draft' || board?.status === 'revision_requested'

  const saveBoard = async (patch) => {
    const next = { ...board, ...patch, booking_id: bookingId }
    const { error } = await supabase.from('portal_mood_board').upsert(next, { onConflict: 'booking_id' })
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setBoard(next)
  }

  const addColor = () => saveBoard({ palette: [...(board.palette ?? []), newColor] })
  const removeColor = (color) => saveBoard({ palette: (board.palette ?? []).filter((c) => c !== color) })
  const addLink = () => {
    if (!newLink.trim()) return
    saveBoard({ pinterest_links: [...(board.pinterest_links ?? []), newLink.trim()] })
    setNewLink('')
  }
  const removeLink = (link) => saveBoard({ pinterest_links: (board.pinterest_links ?? []).filter((l) => l !== link) })

  const uploadInspiration = async () => {
    if (!file) return
    setSubmitting(true)
    const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
    const path = `${bookingId}/${crypto.randomUUID()}${ext}`
    const { error: uploadError } = await supabase.storage.from('portal-moodboard').upload(path, file)
    if (uploadError) {
      setSubmitting(false)
      showToast(uploadError.message, 'error')
      return
    }
    const { error } = await supabase.from('portal_mood_board_items').insert({ booking_id: bookingId, image_path: path, note: note.trim() || null })
    setSubmitting(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setFile(null)
    setNote('')
    loadAll(bookingId)
  }

  const viewImage = async (path) => {
    const { data, error } = await supabase.storage.from('portal-moodboard').createSignedUrl(path, 300)
    if (error || !data) {
      showToast('Could not open this image.', 'error')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const deleteItem = async (id) => {
    const { error } = await supabase.from('portal_mood_board_items').delete().eq('id', id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadAll(bookingId)
  }

  const submitForReview = () => saveBoard({ status: 'submitted' })

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card title="Styling & Mood Board">
        <div className="flex items-center gap-2 mb-4">
          <Badge color={board.status === 'approved' ? 'success' : board.status === 'revision_requested' ? 'warning' : 'gold'}>
            {MOOD_BOARD_STATUS_LABELS[board.status]}
          </Badge>
        </div>

        <div className="space-y-4">
          <Select
            label="Theme"
            placeholder="Choose a theme…"
            options={WEDDING_THEME_PRESETS}
            value={board.theme ?? ''}
            onChange={(e) => saveBoard({ theme: e.target.value })}
            disabled={!isEditable}
          />

          <div>
            <p className="text-sm font-medium text-text-dark mb-2">Color Palette</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {(board.palette ?? []).map((color) => (
                <span key={color} className="relative">
                  <span className="w-8 h-8 rounded-full border border-gold/30 block" style={{ backgroundColor: color }} />
                  {isEditable && (
                    <button onClick={() => removeColor(color)} className="absolute -top-1 -right-1 bg-warm-white rounded-full">
                      <X className="w-3 h-3 text-danger" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {isEditable && (
              <div className="flex items-center gap-2">
                <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-8 h-8" />
                <Button size="sm" variant="secondary" onClick={addColor}>
                  Add Color
                </Button>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-text-dark mb-2">Pinterest / Inspiration Links</p>
            <ul className="space-y-1 mb-2">
              {(board.pinterest_links ?? []).map((link) => (
                <li key={link} className="flex items-center justify-between gap-2 text-sm">
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-wine hover:underline truncate">
                    {link}
                  </a>
                  {isEditable && (
                    <button onClick={() => removeLink(link)} aria-label="Remove link">
                      <Trash2 className="w-4 h-4 text-danger" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {isEditable && (
              <div className="flex gap-2">
                <Input placeholder="https://pinterest.com/…" value={newLink} onChange={(e) => setNewLink(e.target.value)} />
                <Button size="sm" variant="secondary" onClick={addLink}>
                  Add
                </Button>
              </div>
            )}
          </div>

          {isEditable && (
            <div className="flex justify-end">
              <Button onClick={submitForReview}>
                <Send className="w-4 h-4" />
                Submit for Review
              </Button>
            </div>
          )}
        </div>
      </Card>

      {board.final_design_path && (
        <Card title="Final Approved Design">
          <Button variant="secondary" onClick={() => viewImage(board.final_design_path)}>
            <ImageIcon className="w-4 h-4" />
            View Final Design
          </Button>
        </Card>
      )}

      <Card title="Inspiration Photos">
        {isEditable && (
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button size="sm" onClick={uploadInspiration} disabled={submitting || !file}>
              <Upload className="w-4 h-4" />
              Upload
            </Button>
          </div>
        )}
        {items.length === 0 ? (
          <EmptyState icon={ImageIcon} title="No inspiration photos yet" />
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((item) => (
              <li key={item.id} className="relative">
                <button onClick={() => viewImage(item.image_path)} className="w-full aspect-square bg-cream rounded-lg flex items-center justify-center border border-gold/20">
                  <ImageIcon className="w-6 h-6 text-wine" />
                </button>
                {item.note && <p className="text-xs text-text-muted mt-1 truncate">{item.note}</p>}
                {isEditable && (
                  <button onClick={() => deleteItem(item.id)} className="absolute top-1 right-1 bg-warm-white rounded-full p-0.5" aria-label="Remove">
                    <X className="w-3 h-3 text-danger" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
