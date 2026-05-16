import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { email, company_name, waitlist_id } = await req.json()
  if (!email || !company_name) {
    return NextResponse.json({ error: 'email and company_name required' }, { status: 400 })
  }

  // Create invite token
  const { data: invite, error } = await adminClient
    .from('invites')
    .insert({ email, company_name })
    .select('token, id')
    .single()

  if (error || !invite) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }

  // Mark waitlist entry as invited
  if (waitlist_id) {
    await adminClient.from('waitlist').update({ status: 'invited' }).eq('id', waitlist_id)
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite?token=${invite.token}`

  // Send invite email
  if (process.env.BREVO_API_KEY) {
    const html = `
    <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#0f1623;color:#f1f5f9;padding:40px">
    <div style="max-width:560px;margin:0 auto;background:#141e2e;border-radius:12px;overflow:hidden">
      <div style="background:#E85400;padding:28px 32px">
        <h1 style="margin:0;color:white;font-size:24px;font-weight:800">RelayDeck</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px">B2B Ordering & Operations System</p>
      </div>
      <div style="padding:32px">
        <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 16px">Έχετε πρόσβαση στο Early Access</h2>
        <p style="color:#8899aa;font-size:14px;line-height:1.7">
          Η αίτησή σας για <strong style="color:#f1f5f9">${company_name}</strong> εγκρίθηκε.
          Κάντε κλικ παρακάτω για να δημιουργήσετε τον λογαριασμό σας.
        </p>
        <div style="text-align:center;margin:32px 0">
          <a href="${inviteUrl}" style="background:#E85400;color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:1px;display:inline-block">
            ΕΝΕΡΓΟΠΟΙΗΣΤΕ ΤΟΝ ΛΟΓΑΡΙΑΣΜΟ →
          </a>
        </div>
        <p style="color:#8899aa;font-size:12px;text-align:center">
          Ο σύνδεσμος λήγει σε 72 ώρες. Αν δεν ζητήσατε πρόσβαση, αγνοήστε αυτό το email.
        </p>
      </div>
      <div style="background:#0f1623;padding:16px 32px;text-align:center">
        <p style="color:#8899aa;font-size:11px;margin:0">RelayDeck by Syntesys · AI Systems & Business Automation</p>
      </div>
    </div></body></html>`

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'RelayDeck', email: process.env.SENDER_EMAIL ?? 'noreply@relaydeck.app' },
        to: [{ email, name: company_name }],
        subject: 'Η πρόσβασή σας στο RelayDeck εγκρίθηκε',
        htmlContent: html,
      }),
    })
  }

  return NextResponse.json({ success: true, inviteUrl, token: invite.token })
}

export async function GET() {
  const { data } = await adminClient
    .from('invites')
    .select('*')
    .order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}
