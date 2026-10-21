import { useEffect, useState } from 'react'
import { Copy, Check, KeyRound, UserX, UserCheck, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import { formatCurrency, formatDateTime } from '../../../lib/utils'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import Badge from '../../ui/Badge'
import Modal from '../../ui/Modal'
import Textarea from '../../ui/Textarea'

const MODULE_LABELS = { guests: 'Guest List', payments: 'Payments', documents: 'Documents', messages: 'Messages' }
const DEFAULT_MODULES = { guests: true, payments: true, documents: true, messages: true }

async function callPortalAccess(action, bookingId) {
  const { data: sessionData } = await supabase.auth.getSession()
  const res = await fetch('/api/portal-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData?.session?.access_token}` },
    body: JSON.stringify({ bookingId, action }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Request failed')
  return json
}

export default function WeddingPortalCard({ booking }) {
  const { showToast } = useToast()
  const [settings, setSettings] = useState(null)
  const [member, setMember] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [revealedCredentials, setRevealedCredentials] = useState(null)
  const [copied, setCopied] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadAll = async () => {
    const [settingsRes, memberRes, submissionsRes] = await Promise.all([
      supabase.from('booking_portal_settings').select('*').eq('booking_id', booking.id).maybeSingle(),
      supabase.from('booking_members').select('*').eq('booking_id', booking.id).maybeSingle(),
      supabase
        .from('payment_submissions')
        .select('*')
        .eq('booking_id', booking.id)
        .eq('status', 'pending_verification')
        .order('created_at', { ascending: false }),
    ])
    setSettings(settingsRes.data)
    setMember(memberRes.data)
    setSubmissions(submissionsRes.data ?? [])
  }

  useEffect(() => {
    setLoading(true)
    loadAll().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id])

  const modules = settings?.modules ?? DEFAULT_MODULES

  const toggleModule = async (key) => {
    const nextModules = { ...modules, [key]: !modules[key] }
    const { error } = await supabase
      .from('booking_portal_settings')
      .upsert({ booking_id: booking.id, modules: nextModules }, { onConflict: 'booking_id' })
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setSettings((prev) => ({ ...(prev ?? {}), booking_id: booking.id, modules: nextModules }))
  }

  const handleAction = async (action) => {
    setWorking(true)
    try {
      const result = await callPortalAccess(action, booking.id)
      if (result.tempPassword) {
        setRevealedCredentials({ bookingCode: result.bookingCode, tempPassword: result.tempPassword })
      }
      showToast(
        action === 'generate'
          ? 'Portal access generated.'
          : action === 'reset'
            ? 'Password reset.'
            : action === 'disable'
              ? 'Portal access disabled.'
              : 'Portal access enabled.'
      )
      await loadAll()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setWorking(false)
    }
  }

  const copyCredentials = async () => {
    if (!revealedCredentials) return
    const url = `${window.location.origin}/my-event/login`
    const text = `Hi! Here's your Savor and Style My Event Portal access:\nLink: ${url}\nBooking Code: ${revealedCredentials.bookingCode}\nTemporary Password: ${revealedCredentials.tempPassword}\n\nPlease change your password after logging in.`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const viewProof = async (path) => {
    const { data, error } = await supabase.storage.from('portal-payments').createSignedUrl(path, 300)
    if (error || !data) {
      showToast('Could not open this file.', 'error')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const verifySubmission = async (submission) => {
    const { data: userData } = await supabase.auth.getUser()

    const { error: paymentError } = await supabase.from('payments').insert({
      booking_id: booking.id,
      amount: submission.amount,
      payment_type: 'partial',
      payment_method: submission.method,
      reference_number: submission.reference_no,
      notes: 'Verified from My Event Portal.',
    })
    if (paymentError) {
      showToast(paymentError.message, 'error')
      return
    }

    const { error: updateError } = await supabase
      .from('payment_submissions')
      .update({ status: 'verified', reviewed_by: userData?.user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', submission.id)
    if (updateError) {
      showToast(updateError.message, 'error')
      return
    }

    showToast('Payment verified and recorded.')
    loadAll()
  }

  const rejectSubmission = async () => {
    if (!rejectTarget) return
    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('payment_submissions')
      .update({
        status: 'rejected',
        reviewed_by: userData?.user?.id,
        reviewed_at: new Date().toISOString(),
        reject_reason: rejectReason.trim() || null,
      })
      .eq('id', rejectTarget.id)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast('Payment submission rejected.')
    setRejectTarget(null)
    setRejectReason('')
    loadAll()
  }

  if (loading) return null

  if (booking.event_type !== 'Wedding') {
    return (
      <Card title="My Event Portal">
        <p className="text-xs text-text-muted">
          The My Event planning portal is currently available for Wedding bookings only.
        </p>
      </Card>
    )
  }

  return (
    <Card title="My Event Portal">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-text-muted mb-2">Modules visible to the client</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(MODULE_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-text-dark">
                <input type="checkbox" checked={!!modules[key]} onChange={() => toggleModule(key)} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-gold/10 pt-4">
          {!member ? (
            <Button size="sm" onClick={() => handleAction('generate')} disabled={working}>
              <KeyRound className="w-4 h-4" />
              Generate Portal Access
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge color={member.active ? 'success' : 'default'}>{member.active ? 'Active' : 'Disabled'}</Badge>
                <span className="text-xs text-text-muted">
                  {member.last_login_at ? `Last login ${formatDateTime(member.last_login_at)}` : 'Never logged in'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => handleAction('reset')} disabled={working}>
                  <KeyRound className="w-4 h-4" />
                  Reset Password
                </Button>
                {member.active ? (
                  <Button size="sm" variant="outline" onClick={() => handleAction('disable')} disabled={working}>
                    <UserX className="w-4 h-4" />
                    Disable Access
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handleAction('enable')} disabled={working}>
                    <UserCheck className="w-4 h-4" />
                    Enable Access
                  </Button>
                )}
              </div>
            </div>
          )}

          {revealedCredentials && (
            <div className="mt-3 bg-cream rounded-lg px-3 py-2 border border-gold/20 text-sm">
              <p className="text-text-dark">
                Booking Code: <strong>{revealedCredentials.bookingCode}</strong>
              </p>
              <p className="text-text-dark">
                Temp Password: <strong>{revealedCredentials.tempPassword}</strong>
              </p>
              <Button size="sm" variant="ghost" className="mt-1 -ml-2" onClick={copyCredentials}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy message to send'}
              </Button>
            </div>
          )}
        </div>

        {submissions.length > 0 && (
          <div className="border-t border-gold/10 pt-4">
            <p className="text-xs font-medium text-text-muted mb-2">Pending payment proofs</p>
            <ul className="space-y-2">
              {submissions.map((s) => (
                <li key={s.id} className="rounded-lg border border-gold/15 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text-dark">
                      {formatCurrency(s.amount)} · {s.method}
                    </span>
                    <span className="text-xs text-text-muted">{formatDateTime(s.created_at)}</span>
                  </div>
                  {s.reference_no && <p className="text-xs text-text-muted mt-0.5">Ref: {s.reference_no}</p>}
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="ghost" onClick={() => viewProof(s.proof_path)}>
                      <ImageIcon className="w-4 h-4" />
                      View
                    </Button>
                    <Button size="sm" onClick={() => verifySubmission(s)}>
                      Verify
                    </Button>
                    <Button size="sm" variant="outline" className="text-danger" onClick={() => setRejectTarget(s)}>
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Payment Submission"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={rejectSubmission}>
              Reject
            </Button>
          </>
        }
      >
        <Textarea
          label="Reason (shown to client later)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </Card>
  )
}
