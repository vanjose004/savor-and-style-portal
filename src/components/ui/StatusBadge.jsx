import Badge from './Badge'

const STATUS_CONFIG = {
  // booking status
  pending: { label: 'Pending', color: 'warning' },
  confirmed: { label: 'Confirmed', color: 'success' },
  completed: { label: 'Completed', color: 'wine' },
  cancelled: { label: 'Cancelled', color: 'danger' },

  // menu item / change request status
  suggested: { label: 'Suggested', color: 'warning' },
  approved: { label: 'Approved', color: 'success' },
  rejected: { label: 'Rejected', color: 'danger' },
}

export default function StatusBadge({ status, className }) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: 'default' }
  return (
    <Badge color={config.color} className={className}>
      {config.label}
    </Badge>
  )
}
