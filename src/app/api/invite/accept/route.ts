import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { token, password, full_name } = await req.json()
  if (!token || !password) {
    return NextResponse.json({ error: 'token and password required' }, { status: 400 })
  }

  // Validate invite token
  const { data: invite, error: inviteError } = await adminClient
    .from('invites')
    .select('email, company_name, expires_at, accepted_at')
    .eq('token', token)
    .single()

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Μη έγκυρη πρόσκληση' }, { status: 400 })
  }
  if (invite.accepted_at) {
    return NextResponse.json({ error: 'Η πρόσκληση έχει ήδη χρησιμοποιηθεί' }, { status: 400 })
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Η πρόσκληση έχει λήξει' }, { status: 400 })
  }

  // Create user with admin client — email_confirm:true bypasses confirmation entirely
  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name ?? '' },
  })

  if (createError || !userData.user) {
    return NextResponse.json({ error: createError?.message ?? 'Αποτυχία δημιουργίας λογαριασμού' }, { status: 500 })
  }

  // Register company
  await adminClient.rpc('register_company', {
    p_company_name: invite.company_name,
    p_slug: invite.company_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 32),
    p_user_id: userData.user.id,
    p_full_name: full_name ?? '',
  })

  // Mark invite as accepted
  await adminClient
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('token', token)

  return NextResponse.json({ success: true, email: invite.email })
}
