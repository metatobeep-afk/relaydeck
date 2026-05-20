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

  // Derive base URL from request origin — no env var needed
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
    || new URL(req.url).origin
  const inviteUrl = `${baseUrl}/invite?token=${invite.token}`

  // Send invite email
  let emailSent = false
  if (process.env.BREVO_API_KEY) {
    const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e4e4e7">

  <div style="background:#E85400;padding:24px 32px;display:flex;align-items:center;gap:12px">
    <span style="font-size:22px;font-weight:900;color:white;letter-spacing:-0.5px">RelayDeck</span>
  </div>

  <div style="padding:36px 32px">
    <p style="margin:0 0 8px;font-size:15px;color:#18181b;font-weight:600">Γεια σας,</p>
    <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.7">
      Η εταιρεία <strong style="color:#18181b">${company_name}</strong> έχει πρόσκληση για να δημιουργήσει λογαριασμό στο <strong style="color:#18181b">RelayDeck</strong>.
      Κάντε κλικ στον παρακάτω σύνδεσμο για να ξεκινήσετε:
    </p>

    <div style="text-align:center;margin:32px 0">
      <a href="${inviteUrl}"
        style="display:inline-block;background:#E85400;color:#ffffff;text-decoration:none;padding:15px 40px;border-radius:7px;font-size:14px;font-weight:700;letter-spacing:0.5px">
        Δημιουργία Λογαριασμού →
      </a>
    </div>

    <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;text-align:center;line-height:1.6">
      Ή αντιγράψτε τον σύνδεσμο:<br>
      <span style="color:#E85400;word-break:break-all">${inviteUrl}</span>
    </p>

    <hr style="border:none;border-top:1px solid #e4e4e7;margin:28px 0">
    <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center">
      Ο σύνδεσμος ισχύει για <strong>72 ώρες</strong>. Αν δεν περιμένατε αυτό το email, αγνοήστε το.
    </p>
  </div>

  <div style="background:#fafafa;padding:14px 32px;text-align:center;border-top:1px solid #e4e4e7">
    <p style="margin:0;font-size:11px;color:#a1a1aa">RelayDeck · Syntesys</p>
  </div>

</div>
</body></html>`

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'RelayDeck', email: process.env.SENDER_EMAIL ?? 'noreply@relaydeck.app' },
        to: [{ email, name: company_name }],
        subject: `Πρόσκληση δημιουργίας λογαριασμού — ${company_name}`,
        htmlContent: html,
      }),
    })
    if (!brevoRes.ok) {
      const errBody = await brevoRes.text()
      console.error('[invite] Brevo error', brevoRes.status, errBody)
    } else {
      emailSent = true
    }
  } else {
    console.warn('[invite] BREVO_API_KEY not set — email skipped. Invite URL:', inviteUrl)
  }

  return NextResponse.json({ success: true, inviteUrl, token: invite.token, emailSent })
}

export async function GET() {
  const { data } = await adminClient
    .from('invites')
    .select('*')
    .order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}
