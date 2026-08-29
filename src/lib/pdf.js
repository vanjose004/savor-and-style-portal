import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  BUSINESS,
  PAYMENT_TYPE_LABELS,
  MENU_CATEGORIES,
  DEFAULT_INCLUSIONS,
  LECHON_NOTE,
  KIDS_EVENT_TYPES,
  STAFF_ROLE_LABELS,
  formatFreebie,
} from './constants'
import { formatDate, formatTime, formatDateTime } from './utils'

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 18
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const LINE_HEIGHT = 5

// Brand palette (from src/index.css), as jsPDF RGB triples.
const COLOR_WINE = [114, 47, 55]
const COLOR_CREAM = [245, 240, 220]
const COLOR_WARM_WHITE = [253, 250, 244]
const COLOR_WINE_MUTED = [222, 200, 197]
const COLOR_GOLD = [201, 168, 76]
const COLOR_TEXT_DARK = [26, 26, 26]
const COLOR_TEXT_MUTED = [107, 107, 107]
const COLOR_SUCCESS = [45, 106, 79]

// jsPDF's standard fonts can't render the peso sign (₱) or other symbols
// outside WinAnsi encoding, so PDF output spells out "PHP" instead.
function formatPhp(amount) {
  const value = Number(amount) || 0
  return `PHP ${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// /logo.png is optional — cache the decoded result (or `null` if missing) so
// repeat PDF generations don't re-fetch.
let cachedLogo
async function loadLogo() {
  if (cachedLogo !== undefined) return cachedLogo

  try {
    const response = await fetch('/logo.png')
    if (!response.ok) throw new Error('Logo not found')

    const bytes = new Uint8Array(await response.arrayBuffer())
    // PNG IHDR chunk stores width/height as big-endian uint32s at bytes 16-23.
    const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]
    const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]

    let binary = ''
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize))
    }

    cachedLogo = { dataUrl: `data:image/png;base64,${btoa(binary)}`, width, height }
  } catch {
    cachedLogo = null
  }

  return cachedLogo
}

/** Draw the logo at the given position, scaled to `height`. Returns the drawn width (0 if no logo). */
function drawLogo(doc, logo, x, y, height) {
  if (!logo) return 0
  const width = (logo.width / logo.height) * height
  doc.addImage(logo.dataUrl, 'PNG', x, y, width, height)
  return width
}

// Stamps a translucent diagonal "DEMO" across every page already in the
// document. Called last, right before doc.save(), so it sits on top of
// everything else. Uses GState for opacity — supported since jsPDF v2.
function stampDemoWatermark(doc) {
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)
    doc.saveGraphicsState()
    doc.setGState(new doc.GState({ opacity: 0.14 }))
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(80)
    doc.setTextColor(...COLOR_WINE)
    doc.text('DEMO', PAGE_WIDTH / 2, PAGE_HEIGHT / 2, {
      align: 'center',
      angle: 45,
    })
    doc.restoreGraphicsState()
  }
  doc.setTextColor(...COLOR_TEXT_DARK)
}

// Admin queries return `booking.clients.{name,phone,address}`, while the
// client-portal RPC returns flat `booking.client_*` fields — this normalizes
// either shape so PDF generators can run from both contexts.
function getClientInfo(booking) {
  if (booking.clients) {
    return {
      name: booking.clients.name ?? '',
      phone: booking.clients.phone ?? '',
      address: booking.clients.address ?? '',
    }
  }
  return {
    name: booking.client_name ?? '',
    phone: booking.client_phone ?? '',
    address: booking.client_address ?? '',
  }
}

function createWriter(doc, startY = MARGIN) {
  let y = startY

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
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      const labelWidth = doc.getTextWidth(label) + 1
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(String(value ?? ''), CONTENT_WIDTH - labelWidth)
      lines.forEach((line, i) => {
        ensureSpace(LINE_HEIGHT)
        if (i === 0) {
          doc.setFont('helvetica', 'bold')
          doc.text(label, MARGIN, y)
          doc.setFont('helvetica', 'normal')
        }
        doc.text(line, MARGIN + labelWidth, y)
        y += LINE_HEIGHT
      })
    },
    // Up to a few label/value pairs on one line, each in an equal-width column.
    fieldRow(pairs) {
      ensureSpace(LINE_HEIGHT)
      const colWidth = CONTENT_WIDTH / pairs.length
      doc.setFontSize(9.5)
      pairs.forEach(([label, value], i) => {
        const x = MARGIN + i * colWidth
        doc.setFont('helvetica', 'bold')
        doc.text(label, x, y)
        doc.setFont('helvetica', 'normal')
        doc.text(String(value ?? '—'), x + doc.getTextWidth(label) + 1, y)
      })
      y += LINE_HEIGHT
    },
    // Full-width wine section header bar with cream/white text.
    band(text) {
      const BAND_HEIGHT = 7
      ensureSpace(BAND_HEIGHT + 4)
      doc.setFillColor(...COLOR_WINE)
      doc.rect(MARGIN, y, CONTENT_WIDTH, BAND_HEIGHT, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...COLOR_WARM_WHITE)
      doc.text(text, MARGIN + 3, y + BAND_HEIGHT - 2.2)
      y += BAND_HEIGHT + 4
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(...COLOR_TEXT_DARK)
    },
    // Bold, colored callout line (e.g. the lechon chopping fee note).
    note(text, color = COLOR_WINE) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...color)
      const lines = doc.splitTextToSize(text, CONTENT_WIDTH)
      lines.forEach((line) => {
        ensureSpace(LINE_HEIGHT)
        doc.text(line, MARGIN, y)
        y += LINE_HEIGHT
      })
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLOR_TEXT_DARK)
    },
    spacer(amount = LINE_HEIGHT) {
      y += amount
    },
  }
}

export async function generateContractPDF(booking, { watermark = false } = {}) {
  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const client = getClientInfo(booking)

  let textX = MARGIN
  if (logo) {
    const logoHeight = 16
    textX += drawLogo(doc, logo, MARGIN, MARGIN - 6, logoHeight) + 4
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...COLOR_WINE)
  doc.text(BUSINESS.name, textX, MARGIN)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLOR_TEXT_MUTED)
  doc.text(BUSINESS.address, textX, MARGIN + 4)
  doc.text(`Tel: ${BUSINESS.phone}`, textX, MARGIN + 8)
  doc.setDrawColor(...COLOR_GOLD)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, MARGIN + 12, PAGE_WIDTH - MARGIN, MARGIN + 12)
  doc.setTextColor(...COLOR_TEXT_DARK)

  const w = createWriter(doc, MARGIN + 16)

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

  if (booking.freebies && booking.freebies.length > 0) {
    w.heading('FREEBIES / COMPLIMENTARY INCLUSIONS')
    booking.freebies.forEach((item) => w.bullet(formatFreebie(item)))
  }

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

  // Displayed prominently (wine band, not a plain heading) right before the
  // signature block so it's the last substantive clause the client reads.
  w.band('DELIVERED SERVICES & PAYMENT CLAUSE')
  w.paragraph(
    'All services outlined in this contract — including food, catering equipment, waiters, and decorations — ' +
      'are considered fully delivered once physically present at the event venue on the contracted date and time.'
  )
  w.spacer(1)
  w.note('Upon delivery of services to the venue, the Client agrees to payment in full of the total contract amount.')
  w.spacer(1)
  w.paragraph('No refunds, credits, or payment reductions shall be issued based on:')
  w.bullet('Perceived quality or presentation of delivered services')
  w.bullet('Changes in event circumstances post-delivery')
  w.bullet('Any negative reviews or public statements by guests')
  w.spacer(1)
  w.paragraph(
    `${BUSINESS.name} reserves the right to address feedback directly from the Client. Third-party guest ` +
      'feedback, complaints, or negative remarks shall not be grounds for withholding payment, contract disputes, ' +
      `or service liability claims against ${BUSINESS.name}.`
  )

  w.heading('AGREEMENT CONFIRMATION')
  w.paragraph('By signing below, both parties confirm that they have read, understood, and agreed to all the terms stated above.')
  w.spacer(12)
  w.paragraph('Client Signature: _____________________     Date: _________')
  w.spacer(8)
  w.paragraph('Printed Name: _____________________')
  w.spacer(12)
  w.paragraph('Authorized Representative: _____________________     Date: _________')
  w.paragraph(BUSINESS.name)

  if (watermark) stampDemoWatermark(doc)
  doc.save(`${watermark ? 'DEMO_' : ''}Contract_${booking.booking_code}.pdf`)
}

export async function generateAcknowledgementReceiptPDF(booking, payment, { watermark = false } = {}) {
  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const client = getClientInfo(booking)
  const paidToDate = (Number(booking.total_amount) || 0) - (Number(booking.balance) || 0)
  const ccFee = Number(payment.credit_card_fee) || 0
  const amountReceived = Number(payment.amount) || 0
  const balance = Number(booking.balance) || 0

  // --- Header band ---------------------------------------------------
  const BAND_HEIGHT = 36
  doc.setFillColor(...COLOR_WINE)
  doc.rect(0, 0, PAGE_WIDTH, BAND_HEIGHT, 'F')

  let textX = MARGIN
  if (logo) {
    const logoHeight = 20
    textX += drawLogo(doc, logo, MARGIN, (BAND_HEIGHT - logoHeight) / 2, logoHeight) + 4
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...COLOR_WARM_WHITE)
  doc.text(BUSINESS.name, textX, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLOR_WINE_MUTED)
  doc.text(BUSINESS.address, textX, 21)
  doc.text(`Tel: ${BUSINESS.phone}`, textX, 25.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...COLOR_GOLD)
  doc.text('ACKNOWLEDGEMENT RECEIPT', PAGE_WIDTH - MARGIN, 15, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR_WARM_WHITE)
  doc.text(`AR No.  ${payment.ar_number ?? 'N/A'}`, PAGE_WIDTH - MARGIN, 23, { align: 'right' })
  doc.text(`Date  ${formatDateTime(payment.paid_at)}`, PAGE_WIDTH - MARGIN, 28, { align: 'right' })

  // --- Received From / Event Details boxes ---------------------------
  let y = BAND_HEIGHT + 12
  const boxHeight = 26
  const colWidth = (CONTENT_WIDTH - 8) / 2
  const rightX = MARGIN + colWidth + 8

  doc.setFillColor(...COLOR_CREAM)
  doc.roundedRect(MARGIN, y, colWidth, boxHeight, 2, 2, 'F')
  doc.roundedRect(rightX, y, colWidth, boxHeight, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...COLOR_WINE)
  doc.text('RECEIVED FROM', MARGIN + 5, y + 7)
  doc.text('EVENT DETAILS', rightX + 5, y + 7)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...COLOR_TEXT_DARK)
  doc.text(client.name ?? '', MARGIN + 5, y + 14)
  doc.text(booking.event_type ?? '', rightX + 5, y + 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...COLOR_TEXT_MUTED)
  doc.text(`Contact: ${client.phone ?? 'N/A'}`, MARGIN + 5, y + 20.5)
  doc.text(`${formatDate(booking.event_date)}  •  Booking ${booking.booking_code}`, rightX + 5, y + 20.5)

  y += boxHeight + 10

  // --- Payment line items ---------------------------------------------
  let description = PAYMENT_TYPE_LABELS[payment.payment_type] ?? payment.payment_type
  if (payment.payment_method) description += `  —  ${payment.payment_method}`
  if (payment.reference_number) description += `\nRef. No. ${payment.reference_number}`

  const rows = [[description, formatPhp(amountReceived)]]
  if (ccFee > 0) {
    rows.push(['Credit Card Processing Fee (5%)', formatPhp(ccFee)])
  }

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Description', 'Amount']],
    body: rows,
    foot: [['Total Received Today', formatPhp(amountReceived + ccFee)]],
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9.5, cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 } },
    headStyles: { fillColor: COLOR_WINE, textColor: COLOR_WARM_WHITE, fontStyle: 'bold' },
    bodyStyles: { lineColor: COLOR_GOLD, lineWidth: { bottom: 0.2 } },
    footStyles: { fillColor: COLOR_CREAM, textColor: COLOR_WINE, fontStyle: 'bold', fontSize: 11 },
    columnStyles: { 1: { halign: 'right', cellWidth: 45 } },
  })

  y = doc.lastAutoTable.finalY + 12

  // --- Summary -----------------------------------------------------
  const summaryWidth = 85
  const summaryX = PAGE_WIDTH - MARGIN - summaryWidth

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  ;[
    ['Total Contract Amount', formatPhp(booking.total_amount)],
    ['Total Paid to Date', formatPhp(paidToDate)],
  ].forEach(([label, value], i) => {
    const rowY = y + i * 6.5
    doc.setTextColor(...COLOR_TEXT_MUTED)
    doc.text(label, summaryX, rowY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLOR_TEXT_DARK)
    doc.text(value, PAGE_WIDTH - MARGIN, rowY, { align: 'right' })
    doc.setFont('helvetica', 'normal')
  })

  const ruleY = y + 2 * 6.5 - 3.5
  doc.setDrawColor(...COLOR_GOLD)
  doc.setLineWidth(0.3)
  doc.line(summaryX, ruleY, PAGE_WIDTH - MARGIN, ruleY)

  const balanceY = ruleY + 7
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(...(balance > 0 ? COLOR_WINE : COLOR_SUCCESS))
  doc.text(balance > 0 ? 'Remaining Balance' : 'Fully Paid', summaryX, balanceY)
  doc.text(formatPhp(balance), PAGE_WIDTH - MARGIN, balanceY, { align: 'right' })

  y = balanceY + 16

  // --- Footer -----------------------------------------------------
  doc.setDrawColor(...COLOR_GOLD)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  y += 6

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(...COLOR_TEXT_MUTED)
  doc.text('This is an Acknowledgement Receipt only, not an Official Receipt.', MARGIN, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.text(`Received by ${BUSINESS.name}  •  ${BUSINESS.address}  •  Tel: ${BUSINESS.phone}`, MARGIN, y)
  y += 7

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...COLOR_WINE)
  doc.text('Thank you for your trust!', PAGE_WIDTH / 2, y, { align: 'center' })

  if (watermark) stampDemoWatermark(doc)
  doc.save(`${watermark ? 'DEMO_' : ''}AR_${payment.ar_number || booking.booking_code}.pdf`)
}

export async function generateBookingFormPDF(booking, menuItems = [], { watermark = false } = {}) {
  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const client = getClientInfo(booking)

  // Cream background on every page, including pages added by ensureSpace.
  const paintBackground = () => {
    doc.setFillColor(...COLOR_CREAM)
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F')
  }
  paintBackground()
  const addPage = doc.addPage.bind(doc)
  doc.addPage = (...args) => {
    addPage(...args)
    paintBackground()
  }

  // --- Header ---------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...COLOR_WINE)
  doc.text('BOOKING FORM', MARGIN, MARGIN + 3)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...COLOR_TEXT_MUTED)
  doc.text(`${BUSINESS.name}, Formerly Estrella's Catering Services`, MARGIN, MARGIN + 9)

  if (logo) {
    const logoHeight = 18
    drawLogo(doc, logo, PAGE_WIDTH - MARGIN - (logo.width / logo.height) * logoHeight, MARGIN - 6, logoHeight)
  }

  doc.setDrawColor(...COLOR_WINE)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, MARGIN + 13, PAGE_WIDTH - MARGIN, MARGIN + 13)
  doc.setTextColor(...COLOR_TEXT_DARK)

  const w = createWriter(doc, MARGIN + 19)

  // --- Client Information -----------------------------------------------
  w.band('CLIENT INFORMATION')
  w.fieldRow([
    ['Name:', client.name || '—'],
    ['Contact Number:', client.phone || '—'],
  ])
  w.field('Address:', client.address || '—')

  // --- Event Information --------------------------------------------------
  const isKidsEvent = KIDS_EVENT_TYPES.includes(booking.event_type)

  w.band('EVENT INFORMATION')
  w.fieldRow([
    ['Event Type:', booking.event_type || '—'],
    ['Date:', formatDate(booking.event_date)],
  ])
  w.fieldRow([
    ['Number of Guests:', booking.pax ?? '—'],
    ['Start Time:', booking.event_time ? formatTime(booking.event_time) : '—'],
  ])
  if (isKidsEvent) {
    w.fieldRow([
      ['Number of Adults:', booking.num_adults ?? '—'],
      ['Number of Kids:', booking.num_kids ?? '—'],
    ])
  }
  w.field('Theme / Motif:', booking.event_motif || '—')

  // --- Venue Information -----------------------------------------------
  w.band('VENUE INFORMATION')
  w.fieldRow([
    ['Venue Name:', booking.venue || '—'],
    ['Contact Number:', booking.venue_contact_number || '—'],
  ])
  w.field('Pin Location:', booking.venue_pin_location || '—')
  w.field('Access Time:', booking.venue_access_time || '—')

  // --- Menu -----------------------------------------------------------------
  w.band('MENU')
  const confirmedDishes = menuItems.filter((item) => item.status === 'confirmed')
  if (confirmedDishes.length === 0) {
    w.paragraph('No dishes confirmed yet.')
  } else {
    MENU_CATEGORIES.forEach((category) => {
      const dishes = confirmedDishes.filter((item) => item.category === category)
      if (dishes.length === 0) return
      w.field(`${category}:`, dishes.map((dish) => dish.dish_name).join(', '))
    })
  }

  // --- Payments ---------------------------------------------------------------
  w.band('PAYMENTS')
  const paidToDate = (Number(booking.total_amount) || 0) - (Number(booking.balance) || 0)
  w.fieldRow([
    ['Total Contract Cost:', formatPhp(booking.total_amount)],
    ['Total Payment Made:', formatPhp(paidToDate)],
  ])
  w.fieldRow([
    ['Balance:', formatPhp(booking.balance)],
    ['As of Date:', formatDate(new Date().toISOString().slice(0, 10))],
  ])

  // --- Other Inclusions / Requests / Notes -------------------------------------
  w.band('OTHER INCLUSIONS / REQUESTS / NOTES')

  w.heading('Default Inclusions')
  DEFAULT_INCLUSIONS.forEach((item) => w.bullet(item))

  if (isKidsEvent && booking.kids_menu && booking.kids_menu.length > 0) {
    w.heading('Kids Menu')
    booking.kids_menu.forEach((item) => w.bullet(item))
  }

  if (booking.freebies && booking.freebies.length > 0) {
    w.heading('Freebies')
    booking.freebies.forEach((item) => w.bullet(formatFreebie(item)))
  }

  if (booking.lechon_chopping) {
    w.spacer(2)
    w.note(LECHON_NOTE)
  }

  if (booking.special_requests) {
    w.heading('Special Requests')
    w.paragraph(booking.special_requests)
  }

  if (watermark) stampDemoWatermark(doc)
  doc.save(`${watermark ? 'DEMO_' : ''}BookingForm_${booking.booking_code}.pdf`)
}

export async function generateCOEPDF(staffMember, purpose) {
  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let textX = MARGIN
  if (logo) {
    const logoHeight = 18
    textX += drawLogo(doc, logo, MARGIN, MARGIN - 5, logoHeight) + 4
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...COLOR_WINE)
  doc.text(BUSINESS.legalName, textX, MARGIN - 1)
  doc.setFontSize(9)
  doc.text(`(${BUSINESS.name})`, textX, MARGIN + 3)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLOR_TEXT_MUTED)
  doc.text(BUSINESS.address, textX, MARGIN + 7)
  doc.text(`Tel: ${BUSINESS.phone}  |  ${BUSINESS.facebookUrl}`, textX, MARGIN + 11)

  // "HIGHLY CONFIDENTIAL" badge, top-right corner.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...COLOR_WINE)
  const labelText = 'HIGHLY CONFIDENTIAL'
  const labelWidth = doc.getTextWidth(labelText) + 6
  doc.setDrawColor(...COLOR_WINE)
  doc.setLineWidth(0.4)
  doc.rect(PAGE_WIDTH - MARGIN - labelWidth, MARGIN - 6, labelWidth, 6)
  doc.text(labelText, PAGE_WIDTH - MARGIN - labelWidth / 2, MARGIN - 2, { align: 'center' })

  doc.setDrawColor(...COLOR_GOLD)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, MARGIN + 15, PAGE_WIDTH - MARGIN, MARGIN + 15)
  doc.setTextColor(...COLOR_TEXT_DARK)

  const w = createWriter(doc, MARGIN + 24)

  w.title('CERTIFICATION')
  w.spacer(3)

  const position = STAFF_ROLE_LABELS[staffMember.role] ?? staffMember.role
  const startDate = staffMember.start_date ? formatDate(staffMember.start_date) : 'N/A'
  const employmentPeriod = staffMember.end_date
    ? `from ${startDate} to ${formatDate(staffMember.end_date)}`
    : `from ${startDate} to present`
  const issuedDate = formatDate(new Date().toISOString().slice(0, 10))

  w.paragraph('TO WHOM IT MAY CONCERN:')
  w.spacer(2)
  w.paragraph(
    `This is to certify that ${staffMember.name} is a bona fide staff member of ${BUSINESS.legalName}, ` +
      `operating as ${BUSINESS.name}, holding the position of ${position} ${employmentPeriod}.`
  )
  w.spacer(2)
  w.paragraph(
    `This certification is issued upon the request of ${staffMember.name} for ${purpose} purposes only, and ` +
      'is considered HIGHLY CONFIDENTIAL.'
  )
  w.spacer(2)
  w.paragraph(`Issued this ${issuedDate} at Santa Maria, Bulacan, Philippines.`)

  w.spacer(20)
  w.paragraph('_____________________________')
  w.paragraph('Van Joseph Estrella')
  w.paragraph('Owner')

  doc.save(`COE_${staffMember.name.replace(/\s+/g, '_')}.pdf`)
}

// The "Make Your Own Package" builder (src/pages/MakeYourOwnPackage.jsx)
// intentionally hides every per-item price in its UI — only the grand total
// is shown. This PDF carries that same rule through to the client's takeaway
// file: the only peso figure printed anywhere on the page is the grand total.
export async function generateCustomPackagePDF({ venueZoneLabel, transportLabel, catering, supplierLabels, grandTotal }) {
  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // --- Header band ---------------------------------------------------
  const BAND_HEIGHT = 36
  doc.setFillColor(...COLOR_WINE)
  doc.rect(0, 0, PAGE_WIDTH, BAND_HEIGHT, 'F')

  let textX = MARGIN
  if (logo) {
    const logoHeight = 20
    textX += drawLogo(doc, logo, MARGIN, (BAND_HEIGHT - logoHeight) / 2, logoHeight) + 4
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...COLOR_WARM_WHITE)
  doc.text(BUSINESS.name, textX, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLOR_WINE_MUTED)
  doc.text(BUSINESS.address, textX, 21)
  doc.text(`Tel: ${BUSINESS.phone}`, textX, 25.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...COLOR_GOLD)
  doc.text('MAKE YOUR OWN PACKAGE', PAGE_WIDTH - MARGIN, 15, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR_WARM_WHITE)
  doc.text('Package Summary', PAGE_WIDTH - MARGIN, 22, { align: 'right' })
  doc.text(formatDate(new Date().toISOString().slice(0, 10)), PAGE_WIDTH - MARGIN, 28, { align: 'right' })

  // --- Venue & Transport box --------------------------------------------
  // No client name/event date collected at this step (client provides
  // those when they message to confirm) — just venue + transport status.
  let y = BAND_HEIGHT + 12
  const boxHeight = 24

  doc.setFillColor(...COLOR_CREAM)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, boxHeight, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...COLOR_WINE)
  doc.text('VENUE & TRANSPORT', MARGIN + 5, y + 7)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLOR_TEXT_DARK)
  doc.text(venueZoneLabel || '—', MARGIN + 5, y + 15)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...COLOR_TEXT_MUTED)
  doc.text(transportLabel || '', MARGIN + 5, y + 20.5)

  y += boxHeight + 10

  // --- Catering Package -------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...COLOR_WINE)
  doc.text('CATERING PACKAGE', MARGIN, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...COLOR_TEXT_DARK)
  doc.text(
    catering ? `${catering.tier} Package — ${catering.pax} pax` : 'No catering package selected',
    MARGIN,
    y
  )
  y += 5
  if (catering?.wedding) {
    doc.text('•  Wedding Rate Applied', MARGIN, y)
    y += 5
  }
  if (catering?.beefSwap) {
    doc.text('•  Beef Dish Swap Included', MARGIN, y)
    y += 5
  }

  // --- Selected Add-Ons -------------------------------------------------
  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...COLOR_WINE)
  doc.text('SELECTED ADD-ONS', MARGIN, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...COLOR_TEXT_DARK)
  if (!supplierLabels || supplierLabels.length === 0) {
    doc.text('No add-ons selected.', MARGIN, y)
    y += 5
  } else {
    // supplierLabels come from getSupplierSummary() and use formatCurrency()
    // (₱) for display in the browser — jsPDF's standard font can't render
    // that glyph and corrupts the whole line's spacing, so swap it for the
    // "PHP "-prefixed style used everywhere else in this file.
    supplierLabels.forEach((label) => {
      const pdfSafeLabel = label.replace(/₱/g, 'PHP ')
      doc.splitTextToSize(`•  ${pdfSafeLabel}`, CONTENT_WIDTH).forEach((line) => {
        if (y > PAGE_HEIGHT - MARGIN - 60) {
          doc.addPage()
          y = MARGIN
        }
        doc.text(line, MARGIN, y)
        y += 5
      })
    })
  }

  // --- Coordination fee row (no amount — always "Included") ------------
  y += 4
  doc.setDrawColor(...COLOR_GOLD)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  y += 7

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...COLOR_WINE)
  doc.text('Savor & Style All-In Coordination Fee', MARGIN, y)
  doc.setTextColor(...COLOR_SUCCESS)
  doc.text('Included', PAGE_WIDTH - MARGIN, y, { align: 'right' })

  y += 12

  // --- Grand Total block (the only peso figure on the page) ------------
  const totalBlockHeight = 26
  if (y + totalBlockHeight > PAGE_HEIGHT - MARGIN - 30) {
    doc.addPage()
    y = MARGIN
  }
  doc.setFillColor(...COLOR_WINE)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, totalBlockHeight, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...COLOR_WARM_WHITE)
  doc.text('GRAND TOTAL', MARGIN + 8, y + totalBlockHeight / 2 + 1.5)
  doc.setFontSize(20)
  doc.setTextColor(...COLOR_GOLD)
  doc.text(formatPhp(grandTotal), PAGE_WIDTH - MARGIN - 8, y + totalBlockHeight / 2 + 2.5, { align: 'right' })

  y += totalBlockHeight + 12

  // --- Footer / confirmation CTA -----------------------------------------
  doc.setDrawColor(...COLOR_GOLD)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  y += 7

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...COLOR_WINE)
  doc
    .splitTextToSize(
      `To confirm this package, send this to us on Facebook Messenger (with your name and event date) ` +
        `or call/text: ${BUSINESS.phone}`,
      CONTENT_WIDTH
    )
    .forEach((line) => {
      doc.text(line, PAGE_WIDTH / 2, y, { align: 'center' })
      y += 5.5
    })

  y += 3
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLOR_TEXT_MUTED)
  doc.text(`${BUSINESS.name}  •  ${BUSINESS.facebookUrl}`, PAGE_WIDTH / 2, y, { align: 'center' })

  const today = new Date().toISOString().slice(0, 10)
  doc.save(`SavorAndStyle_Package_Summary_${today}.pdf`)
}
