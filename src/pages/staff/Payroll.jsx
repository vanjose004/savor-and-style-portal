import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { useStaffProfile } from '../../hooks/useStaffProfile'
import { isTeamLeaderAssignment } from '../../utils/payrollHelpers'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'
import { formatDate } from '../../lib/utils'

export default function Payroll() {
  const { showToast } = useToast()
  const { profile, loading: profileLoading } = useStaffProfile()
  const [events, setEvents] = useState([])
  const [reportsByEvent, setReportsByEvent] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profileLoading) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const [eventsRes, reportsRes] = await Promise.all([
        supabase.from('staff_event_bookings').select('*').order('event_date', { ascending: false }),
        supabase
          .from('event_payroll_reports')
          .select('id, event_id, status, submitted_at')
          .order('submitted_at', { ascending: false }),
      ])

      if (cancelled) return

      if (eventsRes.error) showToast(eventsRes.error.message, 'error')
      if (reportsRes.error) showToast(reportsRes.error.message, 'error')

      const tlEvents = (eventsRes.data ?? []).filter((event) =>
        isTeamLeaderAssignment(event.role_for_event, profile?.role)
      )

      // submitted_at desc, so the first report seen per event is the latest one.
      const latestByEvent = {}
      for (const report of reportsRes.data ?? []) {
        if (!latestByEvent[report.event_id]) latestByEvent[report.event_id] = report
      }

      setEvents(tlEvents)
      setReportsByEvent(latestByEvent)
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [profileLoading, profile?.role, showToast])

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-wine">Payroll</h1>
        <p className="text-sm text-text-muted mt-1">Submit staff pay and on-site expenses for events you led.</p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No events to report"
          description="Events where you're the team leader will appear here after the event date."
        />
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const report = reportsByEvent[event.id]
            return (
              <Card key={event.id}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold text-text-dark">{event.event_type}</p>
                    <p className="text-sm text-text-muted mt-0.5">{formatDate(event.event_date)}</p>
                    {event.venue && <p className="text-sm text-text-muted truncate">{event.venue}</p>}
                  </div>

                  {report ? (
                    <Link to={`/staff/payroll/report/${report.id}`} className="flex items-center gap-2">
                      <StatusBadge status={report.status} />
                    </Link>
                  ) : (
                    <Button as={Link} to={`/staff/payroll/submit/${event.id}`} size="sm">
                      Submit Report
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
