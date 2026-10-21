import { useEffect, useState } from 'react'
import { FileText, Upload, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { formatDateTime } from '../../lib/utils'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const SIGNED_URL_TTL_SECONDS = 300

export default function Documents() {
  const { showToast } = useToast()
  const [bookingId, setBookingId] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const loadDocuments = async (id) => {
    const { data } = await supabase.from('portal_documents').select('*').eq('booking_id', id).order('created_at', { ascending: false })
    setDocuments(data ?? [])
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
      await loadDocuments(current.id)
      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      showToast('Add a title and choose a file.', 'error')
      return
    }

    setSubmitting(true)

    const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
    const path = `${bookingId}/${crypto.randomUUID()}${ext}`

    const { error: uploadError } = await supabase.storage.from('portal-docs').upload(path, file)
    if (uploadError) {
      setSubmitting(false)
      showToast(uploadError.message, 'error')
      return
    }

    const { error: insertError } = await supabase.from('portal_documents').insert({
      booking_id: bookingId,
      title: title.trim(),
      file_path: path,
      source: 'client',
    })

    setSubmitting(false)

    if (insertError) {
      showToast(insertError.message, 'error')
      return
    }

    setTitle('')
    setFile(null)
    showToast('Document uploaded.')
    loadDocuments(bookingId)
  }

  const handleDownload = async (doc) => {
    const { data, error } = await supabase.storage.from('portal-docs').createSignedUrl(doc.file_path, SIGNED_URL_TTL_SECONDS)
    if (error || !data) {
      showToast('Could not open this document.', 'error')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card title="Upload a Document">
        <div className="space-y-3">
          <Input placeholder="e.g. Signed Contract" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className="flex justify-end">
            <Button onClick={handleUpload} disabled={submitting}>
              <Upload className="w-4 h-4" />
              {submitting ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Documents">
        {documents.length === 0 ? (
          <EmptyState icon={FileText} title="No documents yet" description="Files from your coordinator and your own uploads will appear here." />
        ) : (
          <ul className="divide-y divide-gold/10">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-wine shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-dark truncate">{doc.title}</p>
                    <p className="text-xs text-text-muted">
                      {doc.source === 'admin' ? 'From Savor & Style' : 'Uploaded by you'} · {formatDateTime(doc.created_at)}
                    </p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => handleDownload(doc)}>
                  <Download className="w-4 h-4" />
                  Open
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
