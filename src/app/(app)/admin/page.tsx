'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Send, Copy, CheckCircle2, Clock, Users,
  Mail, Building2, Loader2, ExternalLink
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface WaitlistEntry {
  id: string
  email: string
  company_name: string
  contact_name: string
  phone: string
  status: string
  created_at: string
}

interface Invite {
  id: string
  email: string
  company_name: string
  token: string
  accepted_at: string | null
  expires_at: string
  created_at: string
}

export default function AdminPage() {
  const [tab, setTab] = useState<'waitlist' | 'invites'>('waitlist')
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)

  // Manual invite form
  const [manualEmail, setManualEmail] = useState('')
  const [manualCompany, setManualCompany] = useState('')
  const [sending, setSending] = useState(false)
  const [sentUrl, setSentUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [wRes, iRes] = await Promise.all([
      fetch('/api/admin/waitlist'),
      fetch('/api/invite'),
    ])
    if (wRes.ok) setWaitlist(await wRes.json())
    if (iRes.ok) setInvites(await iRes.json())
    setLoading(false)
  }

  async function sendInvite(email: string, company: string, waitlistId?: string) {
    setSending(true)
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, company_name: company, waitlist_id: waitlistId }),
    })
    const data = await res.json()
    if (data.inviteUrl) {
      setSentUrl(data.inviteUrl)
      setManualEmail('')
      setManualCompany('')
      loadData()
    }
    setSending(false)
  }

  function copyUrl() {
    navigator.clipboard.writeText(sentUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700',
    approved: 'bg-blue-50 text-blue-700',
    invited: 'bg-indigo-50 text-indigo-700',
    rejected: 'bg-red-50 text-red-700',
  }

  return (
    <div className="px-8 py-7 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Admin — Πρόσκληση Πελατών</h1>
        <p className="text-sm text-slate-500 mt-0.5">Διαχείριση αιτήσεων και αποστολή προσκλήσεων Early Access</p>
      </div>

      {/* Manual invite */}
      <div className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-indigo-600" />
          Αποστολή Πρόσκλησης
        </h2>
        <div className="flex gap-3">
          <Input
            placeholder="Email πελάτη"
            value={manualEmail}
            onChange={e => setManualEmail(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Επωνυμία εταιρείας"
            value={manualCompany}
            onChange={e => setManualCompany(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={() => sendInvite(manualEmail, manualCompany)}
            disabled={sending || !manualEmail || !manualCompany}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Αποστολή
          </Button>
        </div>
        {sentUrl && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-xs text-slate-600 flex-1 font-mono truncate">{sentUrl}</span>
            <button
              type="button"
              onClick={copyUrl}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Αντιγράφηκε!' : 'Αντιγραφή'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-lg w-fit">
        {(['waitlist', 'invites'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'waitlist' ? `Αιτήσεις (${waitlist.length})` : `Προσκλήσεις (${invites.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Φόρτωση…
        </div>
      ) : tab === 'waitlist' ? (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Εταιρεία</th>
                <th>Υπεύθυνος</th>
                <th>Email</th>
                <th>Τηλέφωνο</th>
                <th>Ημερομηνία</th>
                <th>Κατάσταση</th>
                <th><span className="sr-only">Ενέργεια</span></th>
              </tr>
            </thead>
            <tbody>
              {waitlist.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400 text-sm">Δεν υπάρχουν αιτήσεις ακόμα</td></tr>
              ) : waitlist.map(w => (
                <tr key={w.id}>
                  <td className="font-medium text-slate-900">{w.company_name}</td>
                  <td className="text-slate-600">{w.contact_name || '—'}</td>
                  <td className="text-slate-600 text-xs">{w.email}</td>
                  <td className="text-slate-500 text-xs">{w.phone || '—'}</td>
                  <td className="text-slate-500 text-xs">{formatDate(w.created_at)}</td>
                  <td>
                    <span className={`badge ${statusColor[w.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {w.status}
                    </span>
                  </td>
                  <td>
                    {w.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => sendInvite(w.email, w.company_name, w.id)}
                        disabled={sending}
                      >
                        <Send className="w-3 h-3" />
                        Πρόσκληση
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Εταιρεία</th>
                <th>Email</th>
                <th>Αποστολή</th>
                <th>Λήξη</th>
                <th>Κατάσταση</th>
                <th>Σύνδεσμος</th>
              </tr>
            </thead>
            <tbody>
              {invites.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">Δεν έχουν σταλεί προσκλήσεις ακόμα</td></tr>
              ) : invites.map(inv => {
                const expired = new Date(inv.expires_at) < new Date()
                const accepted = !!inv.accepted_at
                return (
                  <tr key={inv.id}>
                    <td className="font-medium text-slate-900">{inv.company_name}</td>
                    <td className="text-slate-500 text-xs">{inv.email}</td>
                    <td className="text-slate-500 text-xs">{formatDate(inv.created_at)}</td>
                    <td className="text-slate-500 text-xs">{formatDate(inv.expires_at)}</td>
                    <td>
                      <span className={`badge ${accepted ? 'bg-emerald-100 text-emerald-700' : expired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {accepted ? '✓ Αποδεκτό' : expired ? 'Έληξε' : 'Εκκρεμεί'}
                      </span>
                    </td>
                    <td>
                      {!accepted && !expired && (
                        <button
                          type="button"
                          title="Αντιγραφή συνδέσμου"
                          onClick={() => {
                            const url = `${window.location.origin}/invite?token=${inv.token}`
                            navigator.clipboard.writeText(url)
                          }}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
