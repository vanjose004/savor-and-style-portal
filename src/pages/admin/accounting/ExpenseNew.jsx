import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../../components/ui/Card'
import ExpenseForm from '../../../components/admin/accounting/ExpenseForm'
import { SALARY_CATEGORIES } from '../../../lib/constants'

export default function ExpenseNew() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (values) => {
    setSubmitting(true)

    let description = values.description
    if (SALARY_CATEGORIES.includes(values.category) && values.period) {
      description = `${description} (${values.period})`
    }

    const { error } = await supabase.from('expenses').insert({
      category: values.category,
      description,
      amount: Number(values.amount),
      is_event_expense: values.is_event_expense,
      booking_ref: values.is_event_expense ? values.booking_ref || null : null,
      payment_method: values.payment_method,
      receipt_notes: values.receipt_notes || null,
      expense_date: values.expense_date,
    })

    setSubmitting(false)

    if (error) {
      showToast(error.message, 'error')
      return false
    }

    showToast('Expense recorded.')
    navigate('/admin/accounting/expenses')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          to="/admin/accounting/expenses"
          className="inline-flex items-center gap-1 text-sm text-wine hover:text-wine-dark mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Expenses
        </Link>
        <h1 className="font-heading text-2xl font-bold text-wine">Record Expense</h1>
        <p className="text-sm text-text-muted mt-1">Log a purchase, bill, salary, or other business expense.</p>
      </div>
      <Card>
        <ExpenseForm onSubmit={handleSubmit} submitting={submitting} />
      </Card>
    </div>
  )
}
