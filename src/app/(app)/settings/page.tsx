'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { L } from '@/lib/labels'
import { CheckCircle2, Building2, Banknote, FileText, Mail } from 'lucide-react'

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
}

const DEFAULTS: Settings = {
  name: '', afm: '', doy: '', address: '', phone: '', email: '',
  bank_name: '', iban: '', swift: '',
  deposit_rate: 50, invoice_prefix: 'ORD',
  sender_email: '', sender_name: 'RelayDeck Orders',
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

export default function SettingsPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('company_settings').select('*').limit(1).single().then(({ data }) => {
      if (data) setSettings(data as unknown as Settings)
    })
  }, [supabase])

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
          <p className="text-xs text-slate-400">
            Ορίστε επίσης <code className="bg-slate-100 px-1 rounded">BREVO_API_KEY</code> στο <code className="bg-slate-100 px-1 rounded">.env.local</code>
          </p>
        </Section>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saved ? <><CheckCircle2 className="w-3.5 h-3.5" /> {L.saved}</> : saving ? L.loading : L.save}
          </Button>
        </div>
      </div>
    </div>
  )
}
