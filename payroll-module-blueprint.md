# Payroll Module Blueprint
## Savor and Style — Staff Portal Extension + Accounting Integration

---

## Overview

Add a per-event payroll system to the existing staff portal. TL encodes attendance + expenses after each event. Admin approves and deducts from client collected balance. Separately, admin encodes daily bahay team pay. All payroll automatically creates expense records in the accounting tracker (savor-and-style-accounting) via Supabase — same Supabase project assumed, or cross-project insert if separate.

---

## Rate Structure

### Event Staff (per event)
| Role | Base Rate |
|------|-----------|
| Team Leader | ₱1,500 |
| Waiter (regular) | ₱800 |
| Waiter (senior) | ₱900 |
| Cook | ₱700 |
| Driver | ₱800 |

**OT:** Driver only — ₱100/hour after 8-hour baseline. TL encodes OT hours.
**Tips:** Not tracked in system. Handled directly by team.

### Bahay Team (per day, admin-encoded)
| Role | Daily Rate |
|------|-----------|
| Labandera/folder (e.g. Tita Cherry) | ₱600/day |
| Dishwasher (casual, varies per person) | ₱400/day |

---

## Accounting Integration Rules

Every payroll payout automatically inserts a record into the **accounting tracker's `expenses` table** (same Supabase instance).

### Mapping

| Payroll type | `category` | `is_event_expense` | `booking_ref` | `description` |
|---|---|---|---|---|
| Event staff pay (approved report) | `staff_labor` | `true` | event booking_ref | "Event payroll — [Event Name] ([date])" |
| Event on-site expenses | `others` or mapped | `true` | event booking_ref | "On-site expense — [description]" |
| Bahay team — labandera | `staff_labor` | `false` | null | "Bahay team — labandera ([date])" |
| Bahay team — dishwasher | `staff_labor` | `false` | null | "Bahay team — dishwasher ([date])" |

### Trigger Points
- **Event payroll** → expense auto-created when admin clicks **Approve** on payroll report
- **Bahay team** → expense auto-created when admin clicks **Save** on bahay team log entry
- One expense record per payroll report approval (total amount, not per staff)
- Separate expense record per bahay team entry

### Expense code format
Auto-generate: `EXP-YYYYMMDD-XXXX` (same format as existing accounting tracker)

---

## Auth Changes (Staff Login Fix)

### Problem
Current staff table has `email` column but staff don't have work emails. Login is broken/unusable.

### Solution
Add `username` and `password_hash` columns to existing `staff` table.
- Admin generates username + temporary password per staff
- Staff changes password on first login (`must_change_password = true`)
- Email column stays — not deleted, just no longer required for login

### Migration (non-destructive)
```sql
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS rate_override NUMERIC;
```

`rate_override` — used for senior waiters (₱900). If null, use default role rate.

---

## New Supabase Tables (Staff Portal DB)

### 1. `event_payroll_reports`
One report per event. Created when TL submits.

```sql
CREATE TABLE event_payroll_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  submitted_by UUID REFERENCES staff(id),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending', -- pending | approved | rejected
  total_staff_pay NUMERIC DEFAULT 0,
  total_expenses NUMERIC DEFAULT 0,
  total_deduction NUMERIC DEFAULT 0,
  admin_notes TEXT,
  approved_by UUID REFERENCES staff(id),
  approved_at TIMESTAMPTZ,
  accounting_expense_id TEXT, -- reference to expense record created in accounting tracker
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. `event_staff_attendance`
Per staff per event attendance + computed pay.

```sql
CREATE TABLE event_staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES event_payroll_reports(id),
  event_id UUID REFERENCES events(id),
  staff_id UUID REFERENCES staff(id),
  role_at_event TEXT,
  base_rate NUMERIC,
  ot_hours NUMERIC DEFAULT 0,
  ot_pay NUMERIC DEFAULT 0,
  total_pay NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. `event_expenses`
On-site expenses submitted by TL.

```sql
CREATE TABLE event_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES event_payroll_reports(id),
  event_id UUID REFERENCES events(id),
  submitted_by UUID REFERENCES staff(id),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  photo_url TEXT,
  accounting_expense_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4. `bahay_team_logs`
Admin-encoded daily bahay team pay.

```sql
CREATE TABLE bahay_team_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_name TEXT NOT NULL,
  worker_type TEXT NOT NULL, -- 'labandera' | 'dishwasher'
  work_date DATE NOT NULL,
  daily_rate NUMERIC NOT NULL,
  notes TEXT,
  accounting_expense_id TEXT,
  encoded_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Pay Computation Logic

```
-- Event staff
base_rate = staff.rate_override ?? DEFAULT_RATES[role]
ot_pay    = (role === 'Driver') ? ot_hours * 100 : 0
total_pay = base_rate + ot_pay

-- Report totals
total_staff_pay  = SUM(event_staff_attendance.total_pay)
total_expenses   = SUM(event_expenses.amount)
total_deduction  = total_staff_pay + total_expenses

-- Bahay team
daily_rate = worker_type === 'labandera' ? 600 : 400
```

### Default rates config file
Create `src/config/payrollRates.js`:
```js
export const PAYROLL_RATES = {
  'Team Leader': 1500,
  'Waiter': 800,
  'Cook': 700,
  'Driver': 800,
};

export const OT_RATE_DRIVER = 100; // per hour
export const OT_BASELINE_HOURS = 8;

export const BAHAY_TEAM_RATES = {
  labandera: 600,
  dishwasher: 400,
};
```

---

## Accounting Auto-Insert Function

Create a shared Supabase function or client-side helper `insertPayrollExpense()`:

```js
// Called on payroll report approval
async function insertPayrollExpense({ eventName, eventDate, bookingRef, totalAmount }) {
  const expenseCode = generateExpenseCode(); // EXP-YYYYMMDD-XXXX
  await supabase.from('expenses').insert({
    expense_code: expenseCode,
    category: 'staff_labor',
    description: `Event payroll — ${eventName} (${eventDate})`,
    amount: totalAmount,
    is_event_expense: true,
    booking_ref: bookingRef,
    payment_method: 'cash',
    expense_date: new Date().toISOString().split('T')[0],
  });
  return expenseCode;
}

// Called on bahay team log save
async function insertBahayTeamExpense({ workerName, workerType, workDate, amount }) {
  const expenseCode = generateExpenseCode();
  await supabase.from('expenses').insert({
    expense_code: expenseCode,
    category: 'staff_labor',
    description: `Bahay team — ${workerType} (${workerName}) ${workDate}`,
    amount: amount,
    is_event_expense: false,
    booking_ref: null,
    payment_method: 'cash',
    expense_date: workDate,
  });
  return expenseCode;
}
```

---

## New Pages / Routes

### TL Side (Mobile-first)

#### `/staff/payroll`
- List of TL's assigned events with payroll status badge
  - No report yet → "Submit Report" button
  - Pending → "Awaiting Approval"
  - Approved → "Approved ✓"
  - Rejected → "Rejected — see notes"

#### `/staff/payroll/submit/:eventId`
**Step 1 — Staff Attendance**
- Pre-populated list of staff assigned to this event
- Checkbox per staff (present / absent)
- Role shown per staff (editable — in case someone covered different role)
- OT hours field shown only for Drivers
- Auto-computed pay shown per row

**Step 2 — On-site Expenses**
- Add expense rows: description + amount + optional photo
- Running total shown

**Step 3 — Review & Submit**
- Summary: total staff pay, total expenses, grand total deduction
- Submit → creates `event_payroll_reports` with status `pending`
- TL cannot edit after submission

#### `/staff/payroll/report/:reportId`
- View submitted report (read-only)
- Show approval status + admin notes if rejected

---

### Admin Side

#### `/admin/payroll`
- Tabs: **Event Payroll** | **Bahay Team**

**Event Payroll tab:**
- Table: Event name, Date, TL name, Staff count, Total pay, Total expenses, Total deduction, Status, Action
- Filter: pending / approved / rejected / all
- Click row → detail view

**Bahay Team tab:**
- Log entries: Date, Worker name, Type, Rate, Notes
- "Add Entry" button → modal form
- Auto-creates expense in accounting on save
- Monthly total shown

#### `/admin/payroll/:reportId`
- Full event payroll detail
- Staff attendance breakdown with individual pay
- Expenses list with description + photos
- Total deduction amount
- Client balance info (from events table — shows collected balance)
- **Approve** button → updates status + auto-inserts to accounting expenses
- **Reject** button → notes field, notifies TL

---

## Staff Management Updates (`/admin/staff`)

Add to Add/Edit Staff form:
- `username` field (auto-suggest: firstname.lastname lowercase)
- `rate_override` field — label: "Custom rate (optional — for senior waiter ₱900)"
- "Reset Password" button per staff row → sets `must_change_password = true`, generates temp password shown once to admin

---

## Staff Portal Updates (`/staff`)

### Login page
- Change from email to username + password
- On login: check `must_change_password` → force password change screen before proceeding

### Dashboard
- Existing: assigned events, checklist
- New: "Payroll" section → link to `/staff/payroll`

---

## RLS Policies

```sql
-- TL sees only own submitted reports
CREATE POLICY "TL own reports" ON event_payroll_reports
  FOR SELECT USING (submitted_by = auth.uid());

CREATE POLICY "TL insert reports" ON event_payroll_reports
  FOR INSERT WITH CHECK (submitted_by = auth.uid());

-- Admin full access
CREATE POLICY "Admin full access" ON event_payroll_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

-- Same pattern for event_staff_attendance, event_expenses, bahay_team_logs
```

---

## Component Plan

| Component | Location | Description |
|-----------|----------|-------------|
| `PayrollStatusBadge` | shared | pending/approved/rejected pill |
| `StaffAttendanceForm` | staff portal | Step 1 of TL submission |
| `ExpenseForm` | staff portal | Step 2 of TL submission |
| `PayrollSummaryCard` | shared | Totals breakdown |
| `AdminPayrollTable` | admin | All event reports list |
| `AdminPayrollDetail` | admin | Full report + approve/reject |
| `BahayTeamLog` | admin | Daily bahay team entry + list |
| `PayrollRatesConfig` | config | Central rates file |

---

## Implementation Order for Claude Code

1. **Supabase migrations**
   - ALTER staff table (username, password_hash, must_change_password, rate_override)
   - CREATE event_payroll_reports
   - CREATE event_staff_attendance
   - CREATE event_expenses
   - CREATE bahay_team_logs
   - RLS policies for all new tables

2. **Auth update**
   - Username/password login (replace email login)
   - First-login forced password change flow

3. **Payroll rates config file**
   - `src/config/payrollRates.js`

4. **Accounting integration helper**
   - `src/utils/insertPayrollExpense.js`
   - `generateExpenseCode()` utility

5. **TL payroll submission flow**
   - `/staff/payroll` — event list with status
   - `/staff/payroll/submit/:eventId` — 3-step form
   - `/staff/payroll/report/:reportId` — read-only view

6. **Admin payroll pages**
   - `/admin/payroll` — tabbed: event payroll + bahay team
   - `/admin/payroll/:reportId` — detail + approve/reject

7. **Staff management updates**
   - username field, rate_override, reset password button

8. **Connect approve action to accounting**
   - On approve → call `insertPayrollExpense()` → store returned expense_code in `accounting_expense_id`

---

## Important Notes for Claude Code

- Existing stack: React + Vite, Supabase, Tailwind, Vercel
- Existing staff table: `id, name, role, email, phone, start_date, end_date, is_active, created_at`
- DO NOT delete `email` column — make it optional only
- All TL-facing pages must be mobile-first
- Accounting tracker uses SAME Supabase instance — insert directly to `expenses` table
- Expense code format: `EXP-YYYYMMDD-XXXX`
- Accounting `expenses` table columns: id, expense_code, category, description, amount, is_event_expense, booking_ref, payment_method, receipt_notes, expense_date, created_at
- OT applies to Driver role only at ₱100/hour
- Senior waiter rate (₱900) stored as `rate_override` on staff record — if null, use default role rate
- Bahay team logs are admin-only — no TL access
- Every payout (event approval + bahay team save) auto-inserts to accounting expenses table as `staff_labor` category

