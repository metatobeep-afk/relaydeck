import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const OWNER_EMAIL = 'metatobeep@gmail.com'

async function requireOwner() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email !== OWNER_EMAIL) return { forbidden: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null }
  return { forbidden: null, user }
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/team — list all team members with email
export async function GET() {
  const { forbidden } = await requireOwner()
  if (forbidden) return forbidden

  const admin = adminClient()
  const { data: { users }, error } = await admin.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profiles } = await admin.from('profiles').select('id, full_name, role, created_at')

  const members = (profiles ?? []).map((p: { id: string; full_name: string | null; role: string; created_at: string }) => {
    const authUser = users.find(u => u.id === p.id)
    return {
      id: p.id,
      full_name: p.full_name,
      role: p.role,
      email: authUser?.email ?? '—',
      created_at: p.created_at,
    }
  })

  return NextResponse.json({ members })
}

// POST /api/team — invite a new team member (salesperson)
export async function POST(req: Request) {
  const { forbidden } = await requireOwner()
  if (forbidden) return forbidden

  const { email, full_name } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const admin = adminClient()

  // Create confirmed auth user without password
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: full_name ?? '' },
  })
  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 })

  // Insert profile with salesperson role
  await admin.from('profiles').insert({
    id: newUser.user.id,
    full_name: full_name ?? '',
    role: 'salesperson',
  })

  // Generate set-password link
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password` },
  })

  // Send invite email via Brevo if configured
  const { data: settings } = await admin.from('company_settings').select('brevo_api_key, sender_name, sender_email').limit(1).single()
  const apiKey = (settings as any)?.brevo_api_key || process.env.BREVO_API_KEY
  const senderName  = (settings as any)?.sender_name  || 'RelayDeck'
  const senderEmail = (settings as any)?.sender_email  || 'orders@relaydeck.com'
  const actionLink  = (linkData as any)?.properties?.action_link ?? ''

  if (apiKey && actionLink) {
    const html = `
      <div style="font-family:Arial,sans-serif;color:#1e1e3c;padding:32px;max-width:480px">
        <h2 style="color:#4650c8">Πρόσκληση στο RelayDeck</h2>
        <p>Γεια σου${full_name ? ` <strong>${full_name}</strong>` : ''},</p>
        <p>Προσκλήθηκες στην πλατφόρμα RelayDeck ως μέλος ομάδας.</p>
        <p>Πάτησε τον παρακάτω σύνδεσμο για να ορίσεις τον κωδικό σου:</p>
        <a href="${actionLink}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#4650c8;color:white;border-radius:8px;text-decoration:none;font-weight:600">Ορισμός Κωδικού</a>
        <p style="color:#999;font-size:12px">Ο σύνδεσμος λήγει σε 24 ώρες.</p>
      </div>`

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email, name: full_name ?? email }],
        subject: 'Πρόσκληση στο RelayDeck',
        htmlContent: html,
      }),
    })
  }

  return NextResponse.json({ success: true, action_link: actionLink })
}

// PATCH /api/team — update member role
export async function PATCH(req: Request) {
  const { forbidden } = await requireOwner()
  if (forbidden) return forbidden

  const { id, role } = await req.json()
  if (!id || !role) return NextResponse.json({ error: 'id and role required' }, { status: 400 })
  if (!['admin', 'salesperson'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const admin = adminClient()
  const { error } = await admin.from('profiles').update({ role }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// DELETE /api/team — remove a team member
export async function DELETE(req: Request) {
  const { forbidden, user } = await requireOwner()
  if (forbidden) return forbidden

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (id === user?.id) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })

  const admin = adminClient()
  await admin.from('profiles').delete().eq('id', id)
  await admin.auth.admin.deleteUser(id)

  return NextResponse.json({ success: true })
}
