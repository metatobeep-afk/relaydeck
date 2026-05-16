'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Customer } from '@/types/database'
import { Plus, Search, ArrowRight, Pencil, Trash2, Building2 } from 'lucide-react'

const EMPTY: Omit<Customer, 'id' | 'created_at'> = {
  business_name: '', contact_name: '', phone: '', email: '',
  vat_number: '', address: '', tags: [], notes: '',
}

export default function CustomersPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').order('business_name')
    setCustomers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null); setForm({ ...EMPTY }); setTagInput(''); setOpen(true)
  }
  function openEdit(c: Customer) {
    setEditing(c)
    setForm({ business_name: c.business_name, contact_name: c.contact_name, phone: c.phone, email: c.email, vat_number: c.vat_number ?? '', address: c.address ?? '', tags: c.tags ?? [], notes: c.notes ?? '' })
    setTagInput('')
    setOpen(true)
  }

  function addTag(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && tagInput.trim()) {
      setForm(f => ({ ...f, tags: [...(f.tags ?? []), tagInput.trim()] }))
      setTagInput('')
    }
  }
  function removeTag(tag: string) {
    setForm(f => ({ ...f, tags: (f.tags ?? []).filter(t => t !== tag) }))
  }

  async function handleSave() {
    setSaving(true)
    if (editing) {
      await supabase.from('customers').update(form).eq('id', editing.id)
    } else {
      await supabase.from('customers').insert(form)
    }
    setSaving(false); setOpen(false); load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this customer?')) return
    await supabase.from('customers').delete().eq('id', id)
    load()
  }

  const filtered = search
    ? customers.filter(c =>
        c.business_name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
      )
    : customers

  return (
    <div className="px-4 py-5 md:px-8 md:py-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers (CRM)</h1>
          <p className="text-sm text-slate-500 mt-1">{customers.length} customers</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Customer</Button>
      </div>

      <div className="relative max-w-xs mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search customers…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Business', 'Contact', 'Phone', 'Email', 'VAT', 'Tags', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No customers found</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="font-medium text-slate-900">{c.business_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{c.contact_name}</td>
                <td className="px-4 py-3 text-slate-600">{c.phone}</td>
                <td className="px-4 py-3 text-slate-600">{c.email}</td>
                <td className="px-4 py-3 text-slate-500 text-xs font-mono">{c.vat_number}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(c.tags ?? []).map(tag => (
                      <span key={tag} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <Link href={`/customers/${c.id}`} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium mr-1">
                      Προφίλ <ArrowRight className="w-3 h-3" />
                    </Link>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Business Name *</label>
                <Input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Contact Person *</label>
                <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Phone *</label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Email *</label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">VAT Number</label>
                <Input value={form.vat_number ?? ''} onChange={e => setForm(f => ({ ...f, vat_number: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Address</label>
                <Input value={form.address ?? ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Tags (press Enter to add)</label>
              <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="e.g. Christmas Decor" />
              <div className="flex flex-wrap gap-1 mt-2">
                {(form.tags ?? []).map(tag => (
                  <span key={tag} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-600">×</button>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Notes</label>
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.notes ?? ''}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.business_name || !form.email}>
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
