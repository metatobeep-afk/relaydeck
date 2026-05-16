import { NextResponse } from 'next/server'

interface Recipient { email: string; name: string }

export async function POST(req: Request) {
  const { recipients, subject, body }: { recipients: Recipient[]; subject: string; body: string } = await req.json()

  if (!recipients?.length || !subject || !body) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Brevo API key not configured' }, { status: 500 })
  }

  const payload = {
    sender: { name: 'B2B Orders', email: 'orders@yourdomain.com' },
    to: recipients.map(r => ({ email: r.email, name: r.name })),
    subject,
    textContent: body,
    htmlContent: body.split('\n').map(l => `<p>${l}</p>`).join(''),
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

  return NextResponse.json({ success: true, count: recipients.length })
}
