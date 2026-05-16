import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { email, company, name, phone } = await req.json()
  if (!email || !company) {
    return NextResponse.json({ error: 'email and company are required' }, { status: 400 })
  }

  // Save to waitlist
  const { error } = await supabase
    .from('waitlist')
    .insert({ email, company_name: company, contact_name: name ?? '', phone: phone ?? '' })

  if (error && !error.message.includes('duplicate')) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notify you via email (optional — fires silently)
  if (process.env.BREVO_API_KEY) {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'RelayDeck', email: process.env.SENDER_EMAIL ?? 'noreply@relaydeck.app' },
        to: [{ email: process.env.ADMIN_EMAIL ?? 'metatobeep@gmail.com', name: 'RelayDeck Admin' }],
        subject: `Νέα αίτηση: ${company}`,
        htmlContent: `<p><b>${company}</b> — ${name ?? '—'} — <a href="mailto:${email}">${email}</a> — ${phone ?? '—'}</p>`,
      }),
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
