import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Select from '../ui/Select'
import Textarea from '../ui/Textarea'
import { CHANGE_REQUEST_TYPES, CHANGE_REQUEST_TYPE_LABELS } from '../../lib/constants'

const REQUEST_TYPE_OPTIONS = CHANGE_REQUEST_TYPES.map((value) => ({ value, label: CHANGE_REQUEST_TYPE_LABELS[value] }))

export default function ChangeRequestCard({ accessToken }) {
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { request_type: CHANGE_REQUEST_TYPES[0], details: '' } })

  const onSubmit = async (values) => {
    setSubmitting(true)
    const { error } = await supabase.rpc('submit_change_request_by_token', {
      p_access_token: accessToken,
      p_request_type: values.request_type,
      p_details: values.details.trim(),
    })
    setSubmitting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast('Request submitted. We will get back to you soon.')
    reset({ request_type: values.request_type, details: '' })
  }

  return (
    <Card title="Submit a Change Request">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select label="Request Type" options={REQUEST_TYPE_OPTIONS} {...register('request_type', { required: true })} />
        <Textarea
          label="Details"
          placeholder="Tell us what you'd like to change…"
          error={errors.details?.message}
          {...register('details', { required: 'Please describe your request' })}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting…' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
