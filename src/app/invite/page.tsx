'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/layout/logo-mark'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

const C = {
  bg: '#0f1623', bg2: '#141e2e', orange: '#E85400', orangeL: '#ff6a1a',
  cream: '#f1f5f9', muted: '#8899aa', border: 'rgba(255,255,255,0.07)',
}

function InviteForm() {
  const params = useSearchParams()
  const token = params.get('token')
  const router = useRouter()
  const supabase = createClient()

  const [invite, setInvite] = useState<{ email: string; company_name: string; expires_at: string } | null>(null)
  const [status, setStatus] = useState<'loading' | 'valid' | 'expired' | 'used' | 'error'>('loading')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    const supabaseAdmin = createClient()
    supabaseAdmin
      .from('invites')
      .select('email, company_name, expires_at, accepted_at')
      .eq('token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setStatus('error'); return }
        if (data.accepted_at) { setStatus('used'); return }
        if (new Date(data.expires_at) < new Date()) { setStatus('expired'); return }
        setInvite(data)
        setStatus('valid')
      })
  }, [token])

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()
    if (!invite || !token) return
    setSaving(true)

    // Create user server-side via admin client (bypasses email confirmation)
    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password, full_name: fullName }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      setSaving(false)
      alert('Σφάλμα: ' + (data.error ?? 'Άγνωστο σφάλμα'))
      return
    }

    // Sign in with the newly created account
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: invite.email,
      password,
    })

    if (signInError) {
      setSaving(false)
      alert('Σφάλμα σύνδεσης: ' + signInError.message)
      return
    }

    setSaving(false)
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
    color: C.cream, padding: '14px 18px', fontSize: 14, borderRadius: 8, outline: 'none',
    transition: 'border-color 0.2s', marginBottom: 12,
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, justifyContent: 'center' }}>
          <LogoMark size={28} />
          <span style={{ fontFamily: 'var(--font-sora)', fontWeight: 700, fontSize: 16, color: C.cream }}>RelayDeck</span>
        </div>

        <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 14, padding: '36px 32px' }}>

          {status === 'loading' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.orange, margin: '0 auto 16px' }} />
              <p style={{ color: C.muted, fontSize: 14 }}>Επαλήθευση πρόσκλησης…</p>
            </div>
          )}

          {status === 'expired' && (
            <div style={{ textAlign: 'center' }}>
              <XCircle className="w-10 h-10" style={{ color: '#ef4444', margin: '0 auto 16px' }} />
              <h2 style={{ color: C.cream, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Η πρόσκληση έληξε</h2>
              <p style={{ color: C.muted, fontSize: 14 }}>Ο σύνδεσμος ισχύει για 72 ώρες. Επικοινωνήστε μαζί μας για νέα πρόσκληση.</p>
            </div>
          )}

          {status === 'used' && (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle2 className="w-10 h-10" style={{ color: C.orange, margin: '0 auto 16px' }} />
              <h2 style={{ color: C.cream, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Ήδη ενεργοποιημένο</h2>
              <p style={{ color: C.muted, fontSize: 14 }}>Αυτή η πρόσκληση έχει ήδη χρησιμοποιηθεί.</p>
              <a href="/login" style={{ color: C.orange, fontSize: 14, marginTop: 16, display: 'block' }}>→ Σύνδεση</a>
            </div>
          )}

          {status === 'error' && (
            <div style={{ textAlign: 'center' }}>
              <XCircle className="w-10 h-10" style={{ color: '#ef4444', margin: '0 auto 16px' }} />
              <h2 style={{ color: C.cream, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Μη έγκυρη πρόσκληση</h2>
              <p style={{ color: C.muted, fontSize: 14 }}>Ο σύνδεσμος δεν είναι έγκυρος.</p>
            </div>
          )}

          {status === 'valid' && !done && invite && (
            <form onSubmit={handleAccept}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: C.orange, marginBottom: 12 }}>
                  Early Access · Πρόσκληση
                </div>
                <h2 style={{ fontFamily: 'var(--font-sora)', fontSize: 22, fontWeight: 800, color: C.cream, marginBottom: 6 }}>
                  Καλωσήρθατε στο RelayDeck
                </h2>
                <p style={{ color: C.muted, fontSize: 14 }}>
                  Εταιρεία: <strong style={{ color: C.cream }}>{invite.company_name}</strong><br />
                  Email: <strong style={{ color: C.cream }}>{invite.email}</strong>
                </p>
              </div>

              <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: '0.5px' }}>
                Ονοματεπώνυμο
              </label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                placeholder="π.χ. Γιώργης Παπαδόπουλος" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = C.orange)} onBlur={e => (e.target.style.borderColor = C.border)} />

              <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: '0.5px' }}>
                Κωδικός πρόσβασης
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                minLength={8} placeholder="Τουλάχιστον 8 χαρακτήρες" style={{ ...inputStyle, marginBottom: 24 }}
                onFocus={e => (e.target.style.borderColor = C.orange)} onBlur={e => (e.target.style.borderColor = C.border)} />

              <button type="submit" disabled={saving} style={{
                width: '100%', background: C.orange, color: 'white', border: 'none',
                padding: '15px', fontSize: 13, fontWeight: 700, letterSpacing: '1.5px',
                textTransform: 'uppercase', borderRadius: 8, cursor: 'pointer',
              }}>
                {saving ? 'Δημιουργία λογαριασμού…' : 'Ενεργοποίηση Λογαριασμού →'}
              </button>
            </form>
          )}

          {done && (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle2 className="w-10 h-10" style={{ color: '#22c55e', margin: '0 auto 16px' }} />
              <h2 style={{ color: C.cream, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Ο λογαριασμός δημιουργήθηκε!</h2>
              <p style={{ color: C.muted, fontSize: 14 }}>Μεταφορά στον πίνακα ελέγχου…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0f1623', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#E85400' }} />
      </div>
    }>
      <InviteForm />
    </Suspense>
  )
}
