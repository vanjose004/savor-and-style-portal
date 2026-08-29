// Sends a "Make Your Own Package" inquiry email (via Resend) straight to the
// business owner's inbox. Called directly from src/components/custom-package/
// PackageInquiryModal.jsx with the client's contact details plus the full
// selection breakdown already computed client-side — nothing is persisted to
// the database, this is a lead notification only.
//
// Deploy: supabase functions deploy send-package-inquiry
// (Called via supabase.functions.invoke() from the public
// /make-your-own-package page with no logged-in user — the anon key it sends
// automatically still satisfies the platform's default JWT verification, so
// no --no-verify-jwt needed.)
//
// Secrets required (supabase secrets set NAME=value) — reuses the same
// Resend secrets as send-booking-confirmation:
//   RESEND_API_KEY    - from resend.com
//   RESEND_FROM_EMAIL - a sender address on a domain verified in Resend,
//                       e.g. "Savor and Style Catering <bookings@yourdomain.com>"

const INQUIRY_RECIPIENT = 'vanjose004@gmail.com'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string
  )
}

function formatPhp(amount: unknown) {
  const value = Number(amount) || 0
  return `₱${value.toLocaleString('en-PH')}`
}

interface CateringSelection {
  tier: string
  pax: number
  wedding: boolean
  beef_swap: boolean
  price: number
}

interface InquiryBody {
  name?: string
  contact_number?: string
  event_date?: string
  venue?: string
  message?: string | null
  catering?: CateringSelection | null
  suppliers?: string[]
  coordination_fee?: number
  grand_total?: number
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let body: InquiryBody
  try {
    body = await req.json()
  } catch {
    console.error('[send-package-inquiry] invalid request body (not JSON)')
    return json({ error: 'Invalid request body' }, 400)
  }

  const { name, contact_number, event_date, venue, message, catering, suppliers = [], coordination_fee, grand_total } = body

  if (!name || !contact_number || !event_date || !venue) {
    console.error('[send-package-inquiry] rejected: missing required field(s)')
    return json({ error: 'name, contact_number, event_date, and venue are required' }, 400)
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')

  if (!resendApiKey || !fromEmail) {
    console.error('[send-package-inquiry] not configured — missing RESEND_API_KEY or RESEND_FROM_EMAIL secret')
    return json({ stage: 'config', error: 'Email is not configured yet' }, 503)
  }

  const eventDateLabel = new Date(`${event_date}T00:00:00`).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const cateringRow = catering
    ? `${escapeHtml(catering.tier)} Package — ${catering.pax} pax` +
      (catering.wedding ? ' (Wedding Rate)' : '') +
      (catering.beef_swap ? ' + Beef Swap' : '') +
      ` — ${formatPhp(catering.price)}`
    : 'No catering package selected'

  const supplierRows = suppliers.length
    ? suppliers.map((label) => `<li>${escapeHtml(label)}</li>`).join('')
    : '<li>None selected</li>'

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color:#722F37;">New Wedding Package Inquiry</h2>
      <p><strong>${escapeHtml(name)}</strong> just built a custom package on the website.</p>

      <h3 style="color:#722F37; margin-top:20px;">Client Details</h3>
      <table style="width:100%; border-collapse:collapse;">
        <tr><td style="padding:4px 0;"><strong>Name:</strong></td><td>${escapeHtml(name)}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Contact Number:</strong></td><td>${escapeHtml(contact_number)}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Event Date:</strong></td><td>${eventDateLabel}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Venue:</strong></td><td>${escapeHtml(venue)}</td></tr>
      </table>
      ${message ? `<p style="margin-top:12px;"><strong>Message:</strong><br>${escapeHtml(message)}</p>` : ''}

      <h3 style="color:#722F37; margin-top:20px;">Selected Package</h3>
      <p>${cateringRow}</p>

      <h3 style="color:#722F37; margin-top:20px;">Suppliers</h3>
      <ul>${supplierRows}</ul>

      <table style="width:100%; border-collapse:collapse; margin-top:12px;">
        <tr><td style="padding:4px 0;">Savor & Style All-In Coordination Fee</td><td style="text-align:right;">${formatPhp(coordination_fee)}</td></tr>
        <tr><td style="padding:8px 0; font-weight:bold; font-size:16px; border-top:1px solid #ddd;">Grand Total</td><td style="padding:8px 0; text-align:right; font-weight:bold; font-size:16px; border-top:1px solid #ddd; color:#722F37;">${formatPhp(grand_total)}</td></tr>
      </table>
    </div>
  `

  console.log(`[send-package-inquiry] calling Resend API for inquiry from ${name}`)

  let resendRes: Response
  try {
    resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: INQUIRY_RECIPIENT,
        subject: `New Wedding Package Inquiry — ${name} — ${eventDateLabel}`,
        html,
      }),
    })
  } catch (fetchErr) {
    const errMessage = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
    console.error(`[send-package-inquiry] network error calling Resend: ${errMessage}`)
    return json({ stage: 'send', sent: false, error: `Could not reach Resend: ${errMessage}` }, 502)
  }

  if (!resendRes.ok) {
    const errText = await resendRes.text()
    console.error(`[send-package-inquiry] Resend rejected the email — HTTP ${resendRes.status}: ${errText}`)
    return json({ stage: 'send', sent: false, error: `Failed to send email: ${errText}` }, 502)
  }

  const resendData = await resendRes.json().catch(() => ({}))
  console.log(`[send-package-inquiry] sent successfully — Resend email id: ${resendData?.id ?? 'unknown'}`)

  return json({ stage: 'send', sent: true, resend_id: resendData?.id ?? null })
})
