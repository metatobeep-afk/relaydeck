'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">

          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Ελέγξτε το email σας</h2>
              <p className="text-sm text-slate-500 mb-6">
                Στείλαμε σύνδεσμο επαναφοράς κωδικού στο <strong>{email}</strong>.
                Ο σύνδεσμος λήγει σε 1 ώρα.
              </p>
              <Link href="/login" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center justify-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Επιστροφή στη σύνδεση
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Ξεχάσατε τον κωδικό;</h1>
                <p className="text-sm text-slate-500">Βάλτε το email σας και θα σας στείλουμε σύνδεσμο επαναφοράς.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Αποστολή…' : 'Αποστολή συνδέσμου επαναφοράς'}
                </Button>
              </form>

              <div className="mt-5 text-center">
                <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Επιστροφή στη σύνδεση
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
