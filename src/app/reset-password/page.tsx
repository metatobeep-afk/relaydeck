'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the reset link is opened
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    // Fallback: if already in a session (some browsers handle it before the event)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
      else {
        // Give the event 2s to fire before marking invalid
        setTimeout(() => setInvalid(prev => { if (!ready) return true; return prev }), 2000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Οι κωδικοί δεν ταιριάζουν')
      return
    }
    if (password.length < 8) {
      setError('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες')
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2500)
    }
  }

  if (!ready && !invalid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">

          {invalid && !ready && (
            <div className="text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Μη έγκυρος σύνδεσμος</h2>
              <p className="text-sm text-slate-500 mb-5">Ο σύνδεσμος έχει λήξει ή είναι άκυρος. Ζητήστε νέο.</p>
              <a href="/forgot-password" className="text-indigo-600 text-sm font-medium hover:text-indigo-800">
                Νέος σύνδεσμος επαναφοράς →
              </a>
            </div>
          )}

          {done && (
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Ο κωδικός άλλαξε!</h2>
              <p className="text-sm text-slate-500">Μεταφορά στον πίνακα ελέγχου…</p>
            </div>
          )}

          {ready && !done && (
            <>
              <div className="mb-7">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Νέος κωδικός</h1>
                <p className="text-sm text-slate-500">Βάλτε τον νέο κωδικό πρόσβασής σας.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Νέος κωδικός</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Τουλάχιστον 8 χαρακτήρες"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Επιβεβαίωση κωδικού</label>
                  <Input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Επαναλάβετε τον κωδικό"
                    required
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Αποθήκευση…' : 'Αλλαγή κωδικού'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
