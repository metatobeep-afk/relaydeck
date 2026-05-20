import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // Hero form sends { email, company }; RequestAccess sends { email, company, name, phone }
    const email = body.email?.trim()
    const company = (body.company ?? body.company_name)?.trim()
    const name = body.name ?? body.contact_name ?? ''
    const phone = body.phone ?? ''

    if (!email || !company) {
      return NextResponse.json({ error: 'email and company are required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('waitlist')
      .insert({ email, company_name: company, contact_name: name, phone })

    if (error) {
      // '23505' = unique_violation — email already on waitlist, treat as success
      if (error.code === '23505') {
        return NextResponse.json({ success: true })
      }
      console.error('[request-access] DB error:', error.code, error.message, error.details)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fire-and-forget admin notification
    if (process.env.BREVO_API_KEY) {
      fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: 'RelayDeck', email: process.env.SENDER_EMAIL ?? 'noreply@relaydeck.app' },
          to: [{ email: process.env.ADMIN_EMAIL ?? 'cbrickvalue@gmail.com', name: 'RelayDeck Admin' }],
          subject: `Νέα αίτηση: ${company}`,
          htmlContent: `<p><b>${company}</b> — ${name || '—'} — <a href="mailto:${email}">${email}</a> — ${phone || '—'}</p>`,
        }),
      }).catch(e => console.error('[request-access] Brevo error:', e))
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[request-access] Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
