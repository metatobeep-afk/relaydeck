import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { to, toName, orderNumber, subject, htmlBody } = await req.json()

  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Brevo API key not configured' }, { status: 500 })
  }

  const payload = {
    sender: {
      name: process.env.SENDER_NAME ?? 'RelayDeck Orders',
      email: process.env.SENDER_EMAIL ?? 'orders@relaydeck.com',
    },
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
