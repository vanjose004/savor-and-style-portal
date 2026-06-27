import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import Card from '../../../components/ui/Card'
import PayableForm from '../../../components/admin/accounting/PayableForm'

export default function PayableNew() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (values) => {
    setSubmitting(true)

    const { error } = await supabase.from('payables').insert({
      creditor_name: values.creditor_name,
      description: values.description,
      total_amount: Number(values.total_amount),
      due_date: values.due_date || null,
      notes: values.notes || null,
    })

    setSubmitting(false)

    if (error) {
      showToast(error.message, 'error')
      return false
    }

    showToast('Utang added.')
    navigate('/admin/accounting/payables')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          to="/admin/accounting/payables"
          className="inline-flex items-center gap-1 text-sm text-wine hover:text-wine-dark mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Utang
        </Link>
        <h1 className="font-heading text-2xl font-bold text-wine">Add Utang</h1>
        <p className="text-sm text-text-muted mt-1">Record money the business owes to someone.</p>
      </div>
      <Card>
        <PayableForm onSubmit={handleSubmit} submitting={submitting} />
      </Card>
    </div>
  )
}
