import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import { useFormDraft } from '../../../hooks/useFormDraft'
import { insertBahayTeamExpense } from '../../../utils/payrollAccounting'
import { BAHAY_TEAM_RATES, BAHAY_WORKER_TYPE_LABELS } from '../../../config/payrollRates'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import Modal from '../../ui/Modal'
import Input from '../../ui/Input'
import Select from '../../ui/Select'
import Spinner from '../../ui/Spinner'
import EmptyState from '../../ui/EmptyState'
import { formatCurrency, formatDate } from '../../../lib/utils'

const WORKER_TYPE_OPTIONS = Object.entries(BAHAY_WORKER_TYPE_LABELS).map(([value, label]) => ({ value, label }))

export default function BahayTeamLog() {
  const { showToast } = useToast()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const form = useForm({
    defaultValues: { worker_name: '', worker_type: 'labandera', work_date: '', notes: '' },
  })
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = form

  const { restoreDraft, clearDraft } = useFormDraft(form, 'draft:bahay-team-entry')

  const workerType = watch('worker_type')

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('bahay_team_logs').select('*').order('work_date', { ascending: false })
    if (error) {
      showToast(error.message, 'error')
    } else {
      setEntries(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openModal = () => {
    reset({ worker_name: '', worker_type: 'labandera', work_date: new Date().toISOString().slice(0, 10), notes: '' })
    restoreDraft()
    setModalOpen(true)
  }

  const onSubmit = async (values) => {
    setSaving(true)
    const dailyRate = BAHAY_TEAM_RATES[values.worker_type]

    const { data: logRow, error: logError } = await supabase
      .from('bahay_team_logs')
      .insert({
        worker_name: values.worker_name.trim(),
        worker_type: values.worker_type,
        work_date: values.work_date,
        daily_rate: dailyRate,
        notes: values.notes?.trim() || null,
      })
      .select('id')
      .single()

    if (logError) {
      showToast(logError.message, 'error')
      setSaving(false)
      return
    }

    try {
      const expenseCode = await insertBahayTeamExpense({
        workerName: values.worker_name.trim(),
        workerType: values.worker_type,
        workDate: values.work_date,
        amount: dailyRate,
      })
      await supabase.from('bahay_team_logs').update({ accounting_expense_id: expenseCode }).eq('id', logRow.id)
    } catch (err) {
      showToast(`Entry saved, but accounting sync failed: ${err.message}`, 'error')
    }

    setSaving(false)
    setModalOpen(false)
    clearDraft()
    showToast('Bahay team entry saved.')
    load()
  }

  const now = new Date()
  const monthlyTotal = entries
    .filter((e) => {
      const d = new Date(`${e.work_date}T00:00:00`)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    .reduce((sum, e) => sum + Number(e.daily_rate), 0)

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-text-muted">This Month's Total</p>
          <p className="text-2xl font-bold text-wine">{formatCurrency(monthlyTotal)}</p>
        </div>
        <Button onClick={openModal}>
          <Plus className="w-4 h-4" /> Add Entry
        </Button>
      </Card>

      <Card title="Log Entries">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-6 h-6" />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState title="No entries yet" description="Daily bahay team pay you log will appear here." />
        ) : (
          <ul className="divide-y divide-gold/10">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-text-dark">{entry.worker_name}</p>
                  <p className="text-text-muted">
                    {BAHAY_WORKER_TYPE_LABELS[entry.worker_type]} · {formatDate(entry.work_date)}
                  </p>
                  {entry.notes && <p className="text-text-muted text-xs mt-0.5">{entry.notes}</p>}
                </div>
                <p className="font-medium text-text-dark shrink-0">{formatCurrency(entry.daily_rate)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Bahay Team Entry"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Worker Name"
            error={errors.worker_name?.message}
            {...register('worker_name', { required: 'Worker name is required' })}
          />
          <Select label="Type" options={WORKER_TYPE_OPTIONS} {...register('worker_type', { required: true })} />
          <Input
            label="Date"
            type="date"
            error={errors.work_date?.message}
            {...register('work_date', { required: 'Date is required' })}
          />
          <p className="text-sm text-text-muted">
            Daily rate: <span className="font-medium text-text-dark">{formatCurrency(BAHAY_TEAM_RATES[workerType])}</span>
          </p>
          <Input label="Notes (optional)" {...register('notes')} />
        </form>
      </Modal>
    </div>
  )
}
