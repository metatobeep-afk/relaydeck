'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/layout/logo-mark'
import { CheckCircle2, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<'account' | 'company' | 'done'>('account')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [slug, setSlug] = useState('')

  function toSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 32)
  }

  async function handleAccount(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
    if (err) { setError(err.message); setLoading(false); return }
    setStep('company')
    setLoading(false)
  }

  async function handleCompany(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Παρακαλώ συνδεθείτε ξανά'); setLoading(false); return }

    const { error: err } = await supabase.rpc('register_company', {
      p_company_name: companyName,
      p_slug: slug,
      p_user_id: user.id,
      p_full_name: fullName,
    })
    if (err) { setError(err.message); setLoading(false); return }
    setStep('done')
    setLoading(false)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  if (step === 'done') return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-4">
      <div className="text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Η εγγραφή ολοκληρώθηκε!</h1>
        <p className="text-slate-500 mt-2">Μεταφορά στον πίνακα ελέγχου…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-7">
            <div className="flex items-center gap-2.5 mb-2">
              <LogoMark size={32} />
              <span className="text-xl font-bold text-slate-900">RelayDeck</span>
            </div>
            <p className="text-sm text-slate-500">Δημιουργία λογαριασμού</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-7">
            {['Λογαριασμός', 'Εταιρεία'].map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  (i === 0 && step === 'account') || (i === 1 && step === 'company')
                    ? 'bg-indigo-600 text-white'
                    : i === 0 && step === 'company'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {i === 0 && step === 'company' ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium ${step === (i === 0 ? 'account' : 'company') ? 'text-slate-900' : 'text-slate-400'}`}>
                  {label}
                </span>
                {i === 0 && <div className="flex-1 h-px bg-slate-200" />}
              </div>
            ))}
          </div>

          {step === 'account' && (
            <form onSubmit={handleAccount} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="reg-name">Ονοματεπώνυμο</label>
                <Input id="reg-name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Γιώργης Παπαδόπουλος" required />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="reg-email">Email</label>
                <Input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="info@company.gr" required />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="reg-pass">Κωδικός πρόσβασης</label>
                <Input id="reg-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Τουλάχιστον 8 χαρακτήρες" required minLength={8} />
              </div>
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Συνέχεια →'}
              </Button>
              <p className="text-center text-sm text-slate-500">
                Έχετε λογαριασμό;{' '}
                <a href="/login" className="text-indigo-600 hover:underline font-medium">Σύνδεση</a>
              </p>
            </form>
          )}

          {step === 'company' && (
            <form onSubmit={handleCompany} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="reg-company">Επωνυμία Εταιρείας</label>
                <Input
                  id="reg-company"
                  value={companyName}
                  onChange={e => { setCompanyName(e.target.value); setSlug(toSlug(e.target.value)) }}
                  placeholder="π.χ. Noxatech ΕΠΕ"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="reg-slug">
                  Αναγνωριστικό (slug)
                </label>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-9">
                  <span className="px-3 bg-slate-50 text-slate-400 text-sm border-r border-slate-200 h-full flex items-center">
                    relaydeck.app/
                  </span>
                  <input
                    id="reg-slug"
                    type="text"
                    title="Αναγνωριστικό εταιρείας"
                    value={slug}
                    onChange={e => setSlug(toSlug(e.target.value))}
                    className="flex-1 px-3 text-sm font-mono focus:outline-none bg-white"
                    required
                    pattern="[a-z0-9-]+"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Μόνο πεζά γράμματα, αριθμοί και παύλες</p>
              </div>
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
              <Button type="submit" className="w-full" disabled={loading || !companyName || !slug}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Δημιουργία Λογαριασμού'}
              </Button>
            </form>
          )}
        </div>

        {/* Pricing note */}
        <p className="text-center text-xs text-slate-400 mt-4">
          14 ημέρες δωρεάν · Χωρίς πιστωτική κάρτα
        </p>
      </div>
    </div>
  )
}
