import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Wallet, Receipt, CreditCard, BarChart3 } from 'lucide-react'
import { cn } from '../../../lib/utils'

const NAV_ITEMS = [
  { to: '/admin/accounting', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/accounting/income', label: 'Income', icon: Wallet },
  { to: '/admin/accounting/expenses', label: 'Expenses', icon: Receipt },
  { to: '/admin/accounting/payables', label: 'Payables', icon: CreditCard },
  { to: '/admin/accounting/reports', label: 'Reports', icon: BarChart3 },
]

export default function AccountingLayout() {
  return (
    <div className="space-y-6">
      <nav className="flex gap-1 border-b border-gold/20 overflow-x-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                isActive ? 'border-wine text-wine' : 'border-transparent text-text-muted hover:text-wine'
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
