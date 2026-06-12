import { jsPDF } from 'jspdf'
import { BUSINESS, PAYMENT_TYPE_LABELS } from './constants'
import { formatDate, formatDateTime } from './utils'

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 18
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const LINE_HEIGHT = 5

// jsPDF's standard fonts can't render the peso sign (₱) or other symbols
// outside WinAnsi encoding, so PDF output spells out "PHP" instead.
function formatPhp(amount) {
  const value = Number(amount) || 0
  return `PHP ${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function createWriter(doc) {
  let y = MARGIN

  function ensureSpace(height) {
    if (y + height > PAGE_HEIGHT - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
  }

  return {
    title(text) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(text, PAGE_WIDTH / 2, y, { align: 'center' })
      y += 8
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
    },
    heading(text) {
      ensureSpace(9)
      y += 3
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.text(text, MARGIN, y)
      y += LINE_HEIGHT
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
    },
    paragraph(text) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      const lines = doc.splitTextToSize(text, CONTENT_WIDTH)
      lines.forEach((line) => {
        ensureSpace(LINE_HEIGHT)
        doc.text(line, MARGIN, y)
        y += LINE_HEIGHT
      })
    },
    bullet(text) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      const lines = doc.splitTextToSize(text, CONTENT_WIDTH - 5)
      lines.forEach((line, i) => {
        ensureSpace(LINE_HEIGHT)
        doc.text(i === 0 ? `•  ${line}` : `   ${line}`, MARGIN, y)
        y += LINE_HEIGHT
      })
    },
    field(label, value) {
      ensureSpace(LINE_HEIGHT)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.text(label, MARGIN, y)
      doc.setFont('helvetica', 'normal')
      doc.text(String(value ?? ''), MARGIN + doc.getTextWidth(label) + 1, y)
      y += LINE_HEIGHT
    },
    spacer(amount = LINE_HEIGHT) {
      y += amount
    },
  }
}

export function generateContractPDF(booking) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const w = createWriter(doc)
  const client = booking.clients ?? {}

  w.title('CATERING SERVICE CONTRACT AND AGREEMENT')
  w.spacer(2)

  w.paragraph('This Catering Service Contract ("Agreement") is entered into between:')
  w.spacer(1)
  w.paragraph(BUSINESS.name)
  w.paragraph(BUSINESS.address)
  w.paragraph(`Tel: ${BUSINESS.phone}`)
  w.spacer()

  w.paragraph('And')
  w.spacer(1)

  w.field('Client Name: ', client.name ?? '')
  w.field('Contact No.: ', client.phone ?? 'N/A')
  w.field('Event Date: ', formatDate(booking.event_date))
  w.field('Event Type / Venue: ', `${booking.event_type} / ${booking.venue ?? 'TBD'}`)

  w.heading('RESERVATION & BOOKING')
  w.bullet('A PHP 5,000 Reservation Fee is required upon signing of this contract to secure the event date.')
  w.bullet('The reservation fee is non-refundable but deductible from the total contract cost.')
  w.bullet('Booking is not confirmed without payment.')

  w.heading('TERMS OF PAYMENT')
  w.bullet('50% Downpayment – Due 2–3 weeks before the event date')
  w.bullet('Full Payment – Must be settled on or before the event day')
  w.paragraph(
    'Important: Once the food has been served and consumed, the Client is fully obligated to pay the entire ' +
      'contract amount, regardless of any remaining balance. The Caterer reserves the right not to proceed with ' +
      'setup or service if payment terms are not complied with.'
  )

  w.heading('MODES OF PAYMENT')
  w.paragraph('We accept the following:')
  w.bullet('Bank Transfer (any bank)')
  w.bullet('GCash or Maya')
  w.bullet('Credit Card (straight payment only, +5% terminal fee)')
  w.bullet(`Check (payable to ${BUSINESS.legalName} or Van Joseph Estrella)`)
  w.bullet('Cash')
  w.paragraph('Kind Reminder: Please send a clear screenshot or photo of the proof of payment so your booking can be updated promptly.')

  w.heading('MENU CONFIRMATION')
  w.bullet('Final menu must be confirmed at least 2–3 days before the event.')
  w.bullet('Menu availability depends on market supply.')
  w.bullet('Late changes are subject to availability.')

  w.heading('GUEST COUNT')
  w.bullet('Final guest count cannot be reduced.')
  w.bullet('Additional guests will be charged accordingly.')

  w.heading('SERVICE TIME')
  w.bullet('Standard service time: 5 hours')
  w.bullet('Additional service hours: PHP 100 per staff per hour')
  w.bullet('Lechon chopping fee: PHP 300 (if applicable)')
  w.bullet('Floor/Hauling Fee: PHP 50 per waiter per floor')

  w.heading('STAFF GRATUITY')
  w.bullet('Staff gratuity is not included in the contract price.')
  w.bullet('Any tips are purely optional and may be given directly to staff.')

  w.heading('CHANGE OF EVENT DATE OR VENUE')
  w.bullet('Contract amount may be transferred to another date or event, subject to availability.')
  w.bullet('Client must immediately inform the Caterer of any changes.')

  w.heading('RENTALS, LOSS & DAMAGE')
  w.bullet('Client is responsible for all rented items.')
  w.bullet('Any loss or damage will be charged accordingly.')
  w.bullet('No catering items shall be left at the venue after the event.')

  w.heading('THIRD-PARTY FOOD & SUPPLIERS')
  w.bullet('The Caterer is responsible only for food and beverages prepared by the Caterer.')
  w.bullet(
    'The Caterer shall not be liable for food poisoning, allergic reactions, or health-related issues arising ' +
      'from food or drinks provided by outside sources.'
  )
  w.bullet('The Caterer reserves the right to refuse serving outside food.')

  w.heading('LIABILITY & DAMAGES')
  w.bullet('The Caterer shall not be liable for damages unless caused by willful negligence.')
  w.bullet('The Client is responsible for guest behavior, venue conditions, and event-related risks.')

  w.heading('UNLAWFUL ACTIVITIES')
  w.bullet('The Client agrees to comply with all laws and venue regulations.')
  w.bullet('No refund shall be issued for events canceled due to unlawful activities.')

  w.heading('SOCIAL MEDIA & DISPUTE RESOLUTION')
  w.bullet(
    'In case of any concern, complaint, or misunderstanding, the Client agrees to inform the Caterer privately ' +
      'first to allow proper review and resolution.'
  )
  w.bullet(
    'Both parties agree to refrain from posting negative, misleading, or defamatory content on social media or ' +
      'public platforms without prior notice and discussion.'
  )
  w.bullet('The Caterer commits to addressing concerns professionally and in good faith.')
  w.bullet('Any public statement proven to be false or defamatory may be subject to appropriate legal action under Philippine law.')

  w.heading('OTHER TERMS')
  w.bullet("Tents may be required for outdoor venues (client's expense).")
  w.bullet('The Caterer is not liable for alcoholic beverages supplied by the Client.')
  w.bullet('Venue corkage fees and security deposits are shouldered by the Client.')
  w.bullet('No refund policy. Any concerns shall be resolved professionally.')

  w.heading('AMENDMENTS & GOVERNING LAW')
  w.bullet('Any amendment must be in writing and agreed upon by both parties.')
  w.bullet('This Agreement shall be governed by the laws of the Republic of the Philippines.')

  w.heading('AGREEMENT CONFIRMATION')
  w.paragraph('By signing below, both parties confirm that they have read, understood, and agreed to all the terms stated above.')
  w.spacer(12)
  w.paragraph('Client Signature: _____________________     Date: _________')
  w.spacer(8)
  w.paragraph('Printed Name: _____________________')
  w.spacer(12)
  w.paragraph('Authorized Representative: _____________________     Date: _________')
  w.paragraph(BUSINESS.name)

  doc.save(`Contract_${booking.booking_code}.pdf`)
}

export function generateAcknowledgementReceiptPDF(booking, payment) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const w = createWriter(doc)
  const client = booking.clients ?? {}
  const paidToDate = (Number(booking.total_amount) || 0) - (Number(booking.balance) || 0)

  w.title('ACKNOWLEDGEMENT RECEIPT')
  w.spacer(2)

  w.field('AR Number: ', payment.ar_number ?? 'N/A')
  w.field('Date: ', formatDateTime(payment.paid_at))
  w.field('Received from: ', client.name ?? '')
  w.field('Contact: ', client.phone ?? 'N/A')
  w.field('Event Date: ', formatDate(booking.event_date))
  w.field('Event Type: ', booking.event_type)
  w.spacer()

  w.field('Amount Received: ', formatPhp(payment.amount))
  w.field('Payment Type: ', PAYMENT_TYPE_LABELS[payment.payment_type] ?? payment.payment_type)
  w.field('Payment Method: ', payment.payment_method)
  w.field('Reference Number: ', payment.reference_number || 'N/A')
  if (Number(payment.credit_card_fee) > 0) {
    w.field('Credit Card Fee (5%): ', formatPhp(payment.credit_card_fee))
  }
  w.spacer()

  w.field('Total Contract Amount: ', formatPhp(booking.total_amount))
  w.field('Total Paid to Date: ', formatPhp(paidToDate))
  w.field('Remaining Balance: ', formatPhp(booking.balance))
  w.spacer()

  w.paragraph(`Received by: ${BUSINESS.name}`)
  w.paragraph(BUSINESS.address)
  w.paragraph(`Tel: ${BUSINESS.phone}`)
  w.spacer()

  w.paragraph('Note: This is an Acknowledgement Receipt only, not an Official Receipt.')

  doc.save(`AR_${payment.ar_number || booking.booking_code}.pdf`)
}
