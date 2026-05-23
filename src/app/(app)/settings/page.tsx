'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { L } from '@/lib/labels'
import { useIsAdmin } from '@/lib/role-context'
import { CheckCircle2, Building2, Banknote, FileText, Mail, Eye, EyeOff, Users, Trash2, UserPlus, Loader2, ShieldCheck, UserCog } from 'lucide-react'

interface Settings {
  id?: string
  name: string
  afm: string
  doy: string
  address: string
  phone: string
  email: string
  bank_name: string
  iban: string
  swift: string
  deposit_rate: number
  invoice_prefix: string
  sender_email: string
  sender_name: string
  brevo_api_key: string
}

const DEFAULTS: Settings = {
  name: '', afm: '', doy: '', address: '', phone: '', email: '',
  bank_name: '', iban: '', swift: '',
  deposit_rate: 50, invoice_prefix: 'ORD',
  sender_email: '', sender_name: 'RelayDeck Orders',
  brevo_api_key: '',
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
        <Icon className="w-4 h-4 text-indigo-600" />
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor={id}>{label}</label>
      {children}
    </div>
  )
}

interface TeamMember { id: string; full_name: string | null; role: string; email: string; created_at: string }

export default function SettingsPage() {
  const supabase = createClient()
  const isAdmin = useIsAdmin()
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showBrevoKey, setShowBrevoKey] = useState(false)

  // Team state
  const [team, setTeam] = useState<TeamMember[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteDone, setInviteDone] = useState(false)

  useEffect(() => {
    supabase.from('company_settings').select('*').limit(1).single().then(({ data }) => {
      if (data) setSettings(data as unknown as Settings)
    })
  }, [supabase])

  async function loadTeam() {
    setTeamLoading(true)
    const res = await fetch('/api/team')
    if (res.ok) { const { members } = await res.json(); setTeam(members ?? []) }
    setTeamLoading(false)
  }

  useEffect(() => { if (isAdmin) loadTeam() }, [isAdmin])

  async function handleInvite() {
    if (!inviteEmail) return
    setInviting(true)
    await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, full_name: inviteName }),
    })
    setInviting(false)
    setInviteDone(true)
    loadTeam()
    setTimeout(() => { setInviteDone(false); setInviteOpen(false); setInviteEmail(''); setInviteName('') }, 2000)
  }

  async function handleRoleToggle(member: TeamMember) {
    const newRole = member.role === 'admin' ? 'salesperson' : 'admin'
    await fetch('/api/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: member.id, role: newRole }),
    })
    loadTeam()
  }

  async function handleRemove(member: TeamMember) {
    if (!confirm(`Αφαίρεση ${member.full_name ?? member.email} από την ομάδα;`)) return
    await fetch('/api/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: member.id }),
    })
    loadTeam()
  }

  function set(key: keyof Settings, value: string | number) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    if (settings.id) {
      await supabase.from('company_settings').update(settings).eq('id', settings.id)
    } else {
      const { data } = await supabase.from('company_settings').insert(settings).select('id').single()
      if (data) setSettings(s => ({ ...s, id: data.id }))
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="px-4 py-5 md:px-8 md:py-7 max-w-3xl mx-auto">
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-slate-900">{L.settings}</h1>
        <p className="text-sm text-slate-500 mt-0.5">Στοιχεία εταιρείας, τραπεζικά και ρυθμίσεις τιμολογίου</p>
      </div>

      <div className="space-y-5">

        <Section title={L.companyProfile} icon={Building2}>
          <div className="grid grid-cols-2 gap-4">
            <Field label={L.companyName} id="s-name">
              <Input id="s-name" value={settings.name} onChange={e => set('name', e.target.value)} placeholder="π.χ. Noxatech ΕΠΕ" />
            </Field>
            <Field label={L.companyAfm} id="s-afm">
              <Input id="s-afm" value={settings.afm} onChange={e => set('afm', e.target.value)} placeholder="123456789" />
            </Field>
            <Field label={L.companyDoy} id="s-doy">
              <Input id="s-doy" value={settings.doy} onChange={e => set('doy', e.target.value)} placeholder="π.χ. ΔΟΥ Αθηνών" />
            </Field>
            <Field label={L.companyPhone} id="s-phone">
              <Input id="s-phone" value={settings.phone} onChange={e => set('phone', e.target.value)} placeholder="+30 210 0000000" />
            </Field>
          </div>
          <Field label={L.companyAddress} id="s-address">
            <Input id="s-address" value={settings.address} onChange={e => set('address', e.target.value)} placeholder="Οδός, Αριθμός, ΤΚ, Πόλη" />
          </Field>
          <Field label={L.companyEmail} id="s-email">
            <Input id="s-email" type="email" value={settings.email} onChange={e => set('email', e.target.value)} placeholder="info@company.gr" />
          </Field>
        </Section>

        <Section title={L.bankDetails} icon={Banknote}>
          <div className="grid grid-cols-2 gap-4">
            <Field label={L.bankName} id="s-bank">
              <Input id="s-bank" value={settings.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="π.χ. Εθνική Τράπεζα" />
            </Field>
            <Field label={L.swift} id="s-swift">
              <Input id="s-swift" value={settings.swift} onChange={e => set('swift', e.target.value)} placeholder="ETHNGRAA" />
            </Field>
          </div>
          <Field label={L.iban} id="s-iban">
            <Input id="s-iban" value={settings.iban} onChange={e => set('iban', e.target.value)} placeholder="GR00 0000 0000 0000 0000 0000 000" className="font-mono" />
          </Field>
        </Section>

        <Section title={L.invoiceSettings} icon={FileText}>
          <div className="grid grid-cols-2 gap-4">
            <Field label={L.invoicePrefix} id="s-prefix">
              <Input id="s-prefix" value={settings.invoice_prefix} onChange={e => set('invoice_prefix', e.target.value)} placeholder="ORD" />
            </Field>
            <Field label={`${L.depositRate} (%)`} id="s-deposit">
              <Input
                id="s-deposit"
                type="number"
                min={0}
                max={100}
                value={settings.deposit_rate}
                onChange={e => set('deposit_rate', +e.target.value)}
              />
            </Field>
          </div>
        </Section>

        <Section title="Email Αποστολής" icon={Mail}>
          <div className="grid grid-cols-2 gap-4">
            <Field label={L.senderName} id="s-sender-name">
              <Input id="s-sender-name" value={settings.sender_name} onChange={e => set('sender_name', e.target.value)} placeholder="RelayDeck Orders" />
            </Field>
            <Field label={L.senderEmail} id="s-sender-email">
              <Input id="s-sender-email" type="email" value={settings.sender_email} onChange={e => set('sender_email', e.target.value)} placeholder="orders@company.gr" />
            </Field>
          </div>
          <Field label="Brevo API Key" id="s-brevo-key">
            <div className="relative">
              <Input
                id="s-brevo-key"
                type={showBrevoKey ? 'text' : 'password'}
                value={settings.brevo_api_key}
                onChange={e => set('brevo_api_key', e.target.value)}
                placeholder="xkeysib-…"
                className="pr-9 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowBrevoKey(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showBrevoKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Αποθηκεύεται ασφαλώς — χρησιμοποιείται για αποστολή email παραγγελιών</p>
          </Field>
        </Section>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saved ? <><CheckCircle2 className="w-3.5 h-3.5" /> {L.saved}</> : saving ? L.loading : L.save}
          </Button>
        </div>

        {/* Team management — owner only */}
        {isAdmin && (
          <Section title="Ομάδα" icon={Users}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500">Μέλη με πρόσβαση στην πλατφόρμα. Ο ρόλος <strong>Πωλητής</strong> δεν έχει πρόσβαση σε οικονομικά δεδομένα.</p>
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="w-3.5 h-3.5" /> Πρόσκληση
              </Button>
            </div>
            {teamLoading ? (
              <div className="space-y-2 pt-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />)}
              </div>
            ) : team.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Δεν υπάρχουν μέλη ακόμα</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {team.map(m => (
                  <div key={m.id} className="flex items-center gap-3 py-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600 text-xs font-bold">
                      {(m.full_name ?? m.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-900 truncate">{m.full_name || '—'}</p>
                      <p className="text-[11px] text-slate-400 truncate">{m.email}</p>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${m.role === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                      {m.role === 'admin' ? 'Admin' : 'Πωλητής'}
                    </span>
                    <button type="button" title="Εναλλαγή ρόλου" onClick={() => handleRoleToggle(m)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors">
                      <UserCog className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" title="Αφαίρεση" onClick={() => handleRemove(m)}
                      className="text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Πρόσκληση Μέλους Ομάδας
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Ονοματεπώνυμο</label>
              <Input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="π.χ. Γιάννης Παπαδόπουλος" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Email *</label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@company.gr" />
            </div>
            <p className="text-[11px] text-slate-400">Ο χρήστης θα λάβει email για να ορίσει κωδικό. Θα έχει ρόλο <strong>Πωλητή</strong> (χωρίς πρόσβαση σε τζίρο).</p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Ακύρωση</Button>
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
                {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : inviteDone ? <CheckCircle2 className="w-3.5 h-3.5" />
                  : <UserPlus className="w-3.5 h-3.5" />}
                {inviteDone ? 'Εστάλη!' : 'Αποστολή Πρόσκλησης'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
