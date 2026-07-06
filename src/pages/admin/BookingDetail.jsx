import { useParams } from 'react-router-dom'
import BookingDetailContent from '../../components/admin/booking-detail/BookingDetailContent'

export default function BookingDetail() {
  const { id } = useParams()
  return <BookingDetailContent bookingId={id} variant="page" />
}
