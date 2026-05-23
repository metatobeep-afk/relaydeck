import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { to, toName, orderNumber, subject, htmlBody } = await req.json()

  // Prefer Brevo key stored in company_settings; fall back to env var
  let apiKey = process.env.BREVO_API_KEY
  let senderName = process.env.SENDER_NAME ?? 'RelayDeck Orders'
  let senderEmail = process.env.SENDER_EMAIL ?? 'orders@relaydeck.com'

  try {
    const supabase = await createClient()
    const { data: settings } = await supabase
      .from('company_settings')
      .select('brevo_api_key, sender_name, sender_email')
      .limit(1)
      .single()
    if (settings?.brevo_api_key) apiKey = settings.brevo_api_key
    if (settings?.sender_name)   senderName  = settings.sender_name
    if (settings?.sender_email)  senderEmail = settings.sender_email
  } catch { /* settings not available — use env fallback */ }

  if (!apiKey) {
    return NextResponse.json({ error: 'Brevo API key not configured' }, { status: 500 })
  }

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to, name: toName }],
    subject: subject ?? `Επιβεβαίωση Παραγγελίας ${orderNumber}`,
    htmlContent: htmlBody,
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  return NextResponse.json({ success: true })
}
