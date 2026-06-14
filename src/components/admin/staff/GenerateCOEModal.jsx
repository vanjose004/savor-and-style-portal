import { useState } from 'react'
import { useToast } from '../../../hooks/useToast'
import Modal from '../../ui/Modal'
import Button from '../../ui/Button'
import Select from '../../ui/Select'
import Field from '../../ui/Field'
import { STAFF_ROLE_LABELS, COE_PURPOSES } from '../../../lib/constants'
import { formatDate } from '../../../lib/utils'
import { generateCOEPDF } from '../../../lib/pdf'

export default function GenerateCOEModal({ open, onClose, staff }) {
  const { showToast } = useToast()
  const [purpose, setPurpose] = useState('')
  const [purposeError, setPurposeError] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleClose = () => {
    setPurpose('')
    setPurposeError('')
    onClose()
  }

  const handleGenerate = async () => {
    if (!purpose) {
      setPurposeError('Please select a purpose.')
      return
    }

    setGenerating(true)
    try {
      await generateCOEPDF(staff, purpose)
    } catch (error) {
      showToast(error.message, 'error')
      return
    } finally {
      setGenerating(false)
    }
    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Generate Certificate of Employment"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate COE'}
          </Button>
        </>
      }
    >
      {staff && (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Name" value={staff.name} />
            <Field label="Position" value={STAFF_ROLE_LABELS[staff.role] ?? staff.role} />
            <Field label="Start Date" value={staff.start_date ? formatDate(staff.start_date) : '—'} />
            <Field label="End Date" value={staff.end_date ? formatDate(staff.end_date) : 'Present'} />
            <Field label="Issued Date" value={formatDate(new Date().toISOString().slice(0, 10))} />
          </dl>

          {!staff.start_date && (
            <p className="text-xs text-text-muted bg-gold/10 border border-gold/30 rounded-lg p-3">
              No start date is set for this staff member. Edit their profile to add one so the employment period
              displays correctly on the COE.
            </p>
          )}

          <Select
            label="Purpose"
            placeholder="Select a purpose…"
            options={COE_PURPOSES}
            value={purpose}
            error={purposeError}
            onChange={(e) => {
              setPurpose(e.target.value)
              setPurposeError('')
            }}
          />
        </div>
      )}
    </Modal>
  )
}
