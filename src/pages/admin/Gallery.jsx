import { useEffect, useRef, useState } from 'react'
import imageCompression from 'browser-image-compression'
import { Image as ImageIcon, Upload, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../lib/utils'
import { GALLERY_CATEGORIES } from '../../lib/constants'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'

// Applied to every photo before it ever leaves the browser — R2 has no
// egress fee, but an uncompressed multi-MB camera photo still costs the
// *visitor* bandwidth and slows the public gallery page down. 2000px on the
// long edge is plenty for both the grid and the lightbox's max-h-[75vh] view.
const COMPRESSION_OPTIONS = { maxSizeMB: 1.5, maxWidthOrHeight: 2000, useWebWorker: true, initialQuality: 0.82 }

function getImageDimensions(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(objectUrl)
    }
    img.onerror = () => {
      resolve({ width: null, height: null })
      URL.revokeObjectURL(objectUrl)
    }
    img.src = objectUrl
  })
}

/** Presigns + uploads directly to R2 (see api/gallery-presign-upload.js) — the file's bytes never touch our server. */
async function uploadToR2(file, category, accessToken) {
  const presignRes = await fetch('/api/gallery-presign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ category, filename: file.name, contentType: file.type }),
  })
  if (!presignRes.ok) throw new Error((await presignRes.json().catch(() => ({}))).error || 'Failed to get upload URL')
  const { key, uploadUrl, publicUrl } = await presignRes.json()

  const putRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
  if (!putRes.ok) throw new Error('Upload to storage failed')

  return { key, publicUrl }
}

export default function AdminGallery() {
  const { showToast } = useToast()
  const fileInputRef = useRef(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [pending, setPending] = useState([])
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('gallery_photos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      showToast(error.message, 'error')
    } else {
      setPhotos(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const items = files.map((file) => ({
      key: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      category: 'Others',
      caption: '',
    }))

    setPending((prev) => [...prev, ...items])
    setUploadModalOpen(true)
    e.target.value = ''
  }

  const updatePending = (key, patch) => {
    setPending((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  const removePending = (key) => {
    setPending((prev) => {
      const target = prev.find((item) => item.key === key)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((item) => item.key !== key)
    })
  }

  const closeUploadModal = () => {
    pending.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    setPending([])
    setUploadModalOpen(false)
  }

  const handleUploadAll = async () => {
    setUploading(true)
    const failed = []

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const accessToken = session?.access_token

    for (const item of pending) {
      try {
        const compressed = await imageCompression(item.file, COMPRESSION_OPTIONS)
        const { width, height } = await getImageDimensions(compressed)
        const { key, publicUrl } = await uploadToR2(compressed, item.category, accessToken)

        const { error: insertError } = await supabase.from('gallery_photos').insert({
          url: publicUrl,
          storage_key: key,
          width,
          height,
          category: item.category,
          caption: item.caption.trim() || null,
        })
        if (insertError) throw insertError

        URL.revokeObjectURL(item.previewUrl)
      } catch {
        failed.push(item)
      }
    }

    setUploading(false)
    setPending(failed)

    const succeededCount = pending.length - failed.length
    if (succeededCount > 0) {
      showToast(`${succeededCount} photo${succeededCount === 1 ? '' : 's'} uploaded.`)
      load()
    }
    if (failed.length > 0) {
      showToast(`${failed.length} photo${failed.length === 1 ? '' : 's'} failed to upload. Try again.`, 'error')
    } else {
      setUploadModalOpen(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)

    if (deleteTarget.storage_key) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      await fetch('/api/gallery-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ key: deleteTarget.storage_key }),
      }).catch(() => {})
    }

    const { error } = await supabase.from('gallery_photos').delete().eq('id', deleteTarget.id)
    setDeleting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    setPhotos((prev) => prev.filter((p) => p.id !== deleteTarget.id))
    setDeleteTarget(null)
    showToast('Photo deleted.')
  }

  const filteredPhotos = categoryFilter ? photos.filter((p) => p.category === categoryFilter) : photos

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-wine">Gallery</h1>
          <p className="text-sm text-text-muted mt-1">
            Upload event photos — these appear on the public gallery page.
          </p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4" /> Upload Photos
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter('')}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
            categoryFilter === '' ? 'bg-wine text-warm-white border-wine' : 'border-gold/30 text-text-muted hover:text-wine'
          )}
        >
          All ({photos.length})
        </button>
        {GALLERY_CATEGORIES.map((cat) => {
          const count = photos.filter((p) => p.category === cat).length
          if (count === 0) return null
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                categoryFilter === cat
                  ? 'bg-wine text-warm-white border-wine'
                  : 'border-gold/30 text-text-muted hover:text-wine'
              )}
            >
              {cat} ({count})
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="w-8 h-8" />
        </div>
      ) : filteredPhotos.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No photos yet"
          description="Upload photos from past events to build your gallery."
          action={
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4" /> Upload Photos
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => (
            <Card key={photo.id} className="p-0 overflow-hidden flex flex-col">
              <div className="relative aspect-square bg-cream">
                <img src={photo.url} alt={photo.caption ?? photo.category} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setDeleteTarget(photo)}
                  aria-label="Delete photo"
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-danger transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 space-y-1">
                <Badge color="wine">{photo.category}</Badge>
                {photo.caption && <p className="text-xs text-text-muted truncate">{photo.caption}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={uploadModalOpen}
        onClose={uploading ? () => {} : closeUploadModal}
        title={`Upload Photos (${pending.length})`}
        footer={
          <>
            <Button variant="secondary" onClick={closeUploadModal} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUploadAll} disabled={uploading || pending.length === 0}>
              {uploading ? 'Uploading…' : `Upload All (${pending.length})`}
            </Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {pending.length === 0 ? (
            <p className="text-sm text-text-muted">No photos selected.</p>
          ) : (
            pending.map((item) => (
              <div key={item.key} className="flex gap-3 items-start border-b border-gold/10 pb-4 last:border-b-0">
                <img
                  src={item.previewUrl}
                  alt=""
                  className="w-20 h-20 rounded-lg object-cover shrink-0 border border-gold/20"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <Select
                    label="Category"
                    options={GALLERY_CATEGORIES}
                    value={item.category}
                    onChange={(e) => updatePending(item.key, { category: e.target.value })}
                    disabled={uploading}
                  />
                  <Input
                    label="Caption (optional)"
                    placeholder="e.g. Maria & Juan's Wedding"
                    value={item.caption}
                    onChange={(e) => updatePending(item.key, { caption: e.target.value })}
                    disabled={uploading}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePending(item.key)}
                  disabled={uploading}
                  aria-label="Remove"
                  className="text-text-muted hover:text-danger transition-colors shrink-0 disabled:opacity-40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Photo"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-dark">
          Are you sure you want to delete this photo? This removes it from both storage and the public gallery.
          This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
