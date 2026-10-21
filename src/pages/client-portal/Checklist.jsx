import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, ClipboardList } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { formatShortDate, cn } from '../../lib/utils'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function Checklist() {
  const { showToast } = useToast()
  const [bookingId, setBookingId] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  const loadTasks = async (id) => {
    const { data } = await supabase
      .from('portal_checklist_tasks')
      .select('*')
      .eq('booking_id', id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('sort')
    setTasks(data ?? [])
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
      await loadTasks(current.id)
      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const toggleDone = async (task) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done'
    const { error } = await supabase.from('portal_checklist_tasks').update({ status: nextStatus }).eq('id', task.id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadTasks(bookingId)
  }

  const onAdd = async (values) => {
    setSubmitting(true)
    const { error } = await supabase.from('portal_checklist_tasks').insert({
      booking_id: bookingId,
      title: values.title,
      due_date: values.due_date || null,
      owner: 'client',
    })
    setSubmitting(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    reset()
    loadTasks(bookingId)
  }

  const deleteTask = async (taskId) => {
    const { error } = await supabase.from('portal_checklist_tasks').delete().eq('id', taskId)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    loadTasks(bookingId)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  const doneCount = tasks.filter((t) => t.status === 'done').length
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-heading font-bold text-lg text-wine">Checklist & Timeline</h2>
          <span className="text-sm font-semibold text-text-dark">{progress}% complete</span>
        </div>
        <div className="h-2 rounded-full bg-cream overflow-hidden">
          <div className="h-full bg-success transition-all" style={{ width: `${progress}%` }} />
        </div>
      </Card>

      <Card>
        <form onSubmit={handleSubmit(onAdd)} className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
          <Input
            placeholder="Add a task…"
            error={errors.title?.message}
            {...register('title', { required: 'Enter a task' })}
          />
          <Input type="date" {...register('due_date')} />
          <Button type="submit" size="sm" disabled={submitting}>
            <Plus className="w-4 h-4" />
          </Button>
        </form>
      </Card>

      {tasks.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No tasks yet" description="Your wedding checklist will appear here." />
      ) : (
        <Card>
          <ul className="divide-y divide-gold/10">
            {tasks.map((task) => {
              const isOverdue = task.due_date && task.due_date < today && task.status !== 'done'
              const isTeam = task.owner === 'team'
              return (
                <li key={task.id} className="py-3 flex items-start gap-3">
                  {!isTeam && (
                    <input
                      type="checkbox"
                      checked={task.status === 'done'}
                      onChange={() => toggleDone(task)}
                      className="mt-1 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium text-text-dark', task.status === 'done' && 'line-through text-text-muted')}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {task.category && <Badge color="gold">{task.category}</Badge>}
                      {isTeam && <Badge color="wine">Savor & Style Team</Badge>}
                      {task.due_date && (
                        <span className={cn('text-xs text-text-muted', isOverdue && 'text-danger font-medium')}>
                          {isOverdue ? 'Do ASAP · ' : 'Due '}
                          {formatShortDate(task.due_date)}
                        </span>
                      )}
                      {isTeam && task.status === 'done' && <Badge color="success">Done</Badge>}
                    </div>
                  </div>
                  {!isTeam && (
                    <button onClick={() => deleteTask(task.id)} aria-label="Remove task" className="shrink-0">
                      <Trash2 className="w-4 h-4 text-danger" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
