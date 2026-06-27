import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../../components/ui/Card'
import IncomeForm from '../../../components/admin/accounting/IncomeForm'

export default function IncomeNew() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (values) => {
    setSubmitting(true)

    const { error } = await supabase.from('transactions').insert({
      category: values.category,
      amount: Number(values.amount),
      client_name: values.client_name,
      booking_ref: values.booking_ref || null,
      payment_method: values.payment_method,
      reference_number: values.reference_number || null,
      transaction_date: values.transaction_date,
      notes: values.notes || null,
    })

    setSubmitting(false)

    if (error) {
      showToast(error.message, 'error')
      return false
    }

    showToast('Income recorded.')
    navigate('/admin/accounting/income')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          to="/admin/accounting/income"
          className="inline-flex items-center gap-1 text-sm text-wine hover:text-wine-dark mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Income
        </Link>
        <h1 className="font-heading text-2xl font-bold text-wine">Record Income</h1>
        <p className="text-sm text-text-muted mt-1">Log a reservation fee, downpayment, balance payment, or other income.</p>
      </div>
      <Card>
        <IncomeForm onSubmit={handleSubmit} submitting={submitting} />
      </Card>
    </div>
  )
}
