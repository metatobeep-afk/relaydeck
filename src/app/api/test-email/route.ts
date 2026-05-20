import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.SENDER_EMAIL
  const adminEmail = process.env.ADMIN_EMAIL

  if (!apiKey) {
    return NextResponse.json({ error: 'BREVO_API_KEY is not set in Vercel env vars' }, { status: 500 })
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'RelayDeck Test', email: senderEmail ?? 'noreply@relaydeck.app' },
      to: [{ email: adminEmail ?? 'cbrickvalue@gmail.com', name: 'Admin' }],
      subject: 'RelayDeck — Email Test',
      htmlContent: '<p>If you see this, Brevo is connected correctly.</p>',
    }),
  })

  const body = await res.text()

  return NextResponse.json({
    status: res.status,
    ok: res.ok,
    brevo_response: body,
    env_check: {
      BREVO_API_KEY: apiKey ? `set (ends ...${apiKey.slice(-6)})` : 'MISSING',
      SENDER_EMAIL: senderEmail ?? 'not set — defaulting to noreply@relaydeck.app',
      ADMIN_EMAIL: adminEmail ?? 'not set — defaulting to cbrickvalue@gmail.com',
    },
  })
}
