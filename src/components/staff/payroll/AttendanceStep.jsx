import Card from '../../ui/Card'
import Select from '../../ui/Select'
import Input from '../../ui/Input'
import { PAYROLL_ROLES, getBaseRate, getOtPay } from '../../../config/payrollRates'
import { formatCurrency } from '../../../lib/utils'

const ROLE_OPTIONS = PAYROLL_ROLES.map((role) => ({ value: role, label: role }))

/** Step 1 of TL payroll submission: mark each assigned staff present/absent, confirm their role for this event, and review computed pay. */
export default function AttendanceStep({ rows, onChange }) {
  const updateRow = (staffId, patch) => {
    onChange(rows.map((row) => (row.staffId === staffId ? { ...row, ...patch } : row)))
  }

  return (
    <Card title="Staff Attendance">
      <div className="space-y-4">
        {rows.map((row) => {
          const basePay = getBaseRate(row.roleAtEvent, row.rateOverride)
          const otPay = getOtPay(row.roleAtEvent, row.otHours)
          const totalPay = basePay + otPay

          return (
            <div key={row.staffId} className="pb-4 border-b border-gold/10 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded border-gold/40 text-wine focus:ring-2 focus:ring-wine/30"
                    checked={row.present}
                    onChange={(e) => updateRow(row.staffId, { present: e.target.checked })}
                  />
                  <span className="font-medium text-text-dark">{row.name}</span>
                </label>
                <p className={`text-sm font-semibold ${row.present ? 'text-wine' : 'text-text-muted'}`}>
                  {row.present ? formatCurrency(totalPay) : '—'}
                </p>
              </div>

              {row.present && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <Select
                    label="Role for this event"
                    options={ROLE_OPTIONS}
                    value={row.roleAtEvent}
                    onChange={(e) => updateRow(row.staffId, { roleAtEvent: e.target.value })}
                  />
                  {row.roleAtEvent === 'Driver' && (
                    <Input
                      label="OT Hours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={row.otHours}
                      onChange={(e) => updateRow(row.staffId, { otHours: e.target.value })}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
