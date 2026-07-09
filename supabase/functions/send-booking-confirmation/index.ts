// Sends a booking-confirmation email (via Resend) after a public booking
// request is submitted through submit_booking_request() (migration 28).
// Runs server-side because the Resend API key must never reach the browser
// (unlike the VITE_-prefixed env vars, which Vite bundles into public JS).
//
// Deploy: supabase functions deploy send-booking-confirmation
// (Called via supabase.functions.invoke() from the public /book page with
// no logged-in user — the anon key it sends automatically still satisfies
// the platform's default JWT verification, so no --no-verify-jwt needed.)
//
// Secrets required (supabase secrets set NAME=value):
//   RESEND_API_KEY    - from resend.com
//   RESEND_FROM_EMAIL - a sender address on a domain verified in Resend,
//                       e.g. "Savor and Style Catering <bookings@yourdomain.com>"
//   SITE_URL          - e.g. https://your-portal-domain.com (no trailing slash)
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-provided to every Edge
// Function — no manual secret setup needed for those.)
//
// Looked up by access_token (not booking_id) — a random 32-hex-char secret,
// same trust model as the rest of the client portal, rather than an
// enumerable primary key.

import { createClient } from 'npm:@supabase/supabase-js@2'

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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let accessToken: string | undefined
  try {
    const body = await req.json()
    accessToken = body?.access_token
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (!accessToken) {
    return json({ error: 'access_token is required' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')
  const siteUrl = Deno.env.get('SITE_URL') ?? ''

  if (!resendApiKey || !fromEmail) {
    // The booking itself is already saved by this point (this function only
    // ever runs after submit_booking_request succeeds) — email just isn't
    // configured yet, so fail soft rather than blocking the caller.
    return json({ error: 'Email is not configured yet' }, 503)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: booking, error } = await adminClient
    .from('bookings')
    .select('booking_code, event_type, event_date, venue, access_token, clients(name, email)')
    .eq('access_token', accessToken)
    .maybeSingle()

  if (error || !booking) {
    return json({ error: 'Booking not found' }, 404)
  }

  const clientEmail = booking.clients?.email
  if (!clientEmail) {
    return json({ error: 'No email on file for this booking' }, 200)
  }

  const portalLink = `${siteUrl}/booking/${booking.access_token}`
  const eventDate = new Date(`${booking.event_date}T00:00:00`).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const clientName = escapeHtml(booking.clients?.name ?? '')
  const venue = escapeHtml(booking.venue ?? 'TBD')
  const eventType = escapeHtml(booking.event_type)

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color:#722F37;">Thank you for your booking request!</h2>
      <p>Hi ${clientName},</p>
      <p>We've received your booking request. Here are your details:</p>
      <table style="width:100%; border-collapse:collapse; margin: 12px 0;">
        <tr><td style="padding:4px 0;"><strong>Booking Reference:</strong></td><td>${escapeHtml(booking.booking_code)}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Event Type:</strong></td><td>${eventType}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Event Date:</strong></td><td>${eventDate}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Venue:</strong></td><td>${venue}</td></tr>
      </table>
      <p>Our team will review your request and reach out to confirm the details and next steps.</p>
      <p>
        <a href="${portalLink}" style="display:inline-block; background:#722F37; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none;">
          View My Booking
        </a>
      </p>
      <p style="color:#777; font-size:12px;">
        Save this link or your booking reference (${escapeHtml(booking.booking_code)}) to check your booking status anytime.
      </p>
    </div>
  `

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: clientEmail,
      subject: `Booking Request Received — ${booking.booking_code}`,
      html,
    }),
  })

  if (!resendRes.ok) {
    const errText = await resendRes.text()
    return json({ error: `Failed to send email: ${errText}` }, 502)
  }

  return json({ success: true })
})
