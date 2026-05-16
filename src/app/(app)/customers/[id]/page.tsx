'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, formatDate, PAYMENT_STATUS_LABELS } from '@/lib/utils'
import { L } from '@/lib/labels'
import type { Customer, Order } from '@/types/database'
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, Send,
  ShoppingCart, Plus, Loader2, CheckCircle2
} from 'lucide-react'

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<(Order & { order_number: string })[]>([])
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('orders').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
    ]).then(([c, o]) => {
      setCustomer(c.data as Customer)
      setOrders((o.data ?? []) as (Order & { order_number: string })[])
    })
  }, [id, supabase])

  const totalSpent = orders.reduce((s, o) => s + (o.total_price ?? 0), 0)

  async function handleSendEmail() {
    if (!customer || !emailSubject || !emailBody) return
    setSending(true)
    const html = `<div style="font-family:Arial,sans-serif;color:#1e1e3c;padding:24px">
      <h2 style="color:#4650c8">RelayDeck</h2>
      <p>${emailBody.replace(/\n/g, '<br>')}</p>
    </div>`
    await fetch('/api/email/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: customer.email,
        toName: customer.business_name,
        orderNumber: '',
        subject: emailSubject,
        htmlBody: html,
      }),
    })
    setSending(false)
    setSent(true)
    setTimeout(() => { setSent(false); setEmailOpen(false); setEmailSubject(''); setEmailBody('') }, 2000)
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> {L.loading}
      </div>
    )
  }

  return (
    <div className="px-4 py-5 md:px-8 md:py-7 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          aria-label={L.back}
          onClick={() => router.back()}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-slate-900">{customer.business_name}</h1>
          <p className="text-sm text-slate-500">{customer.contact_name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}>
            <Mail className="w-3.5 h-3.5" />
            {L.sendEmail}
          </Button>
          <Link href={`/orders/new?customer=${id}`}>
            <Button size="sm">
              <Plus className="w-3.5 h-3.5" />
              {L.newOrder}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5">

        {/* Customer info */}
        <div className="col-span-2 space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{customer.business_name}</p>
                <p className="text-sm text-slate-500">{customer.contact_name}</p>
              </div>
            </div>
            <div className="space-y-2.5 text-[13px]">
              <div className="flex items-center gap-2.5 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                {customer.phone}
              </div>
              <div className="flex items-center gap-2.5 text-slate-600">
                <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                {customer.email}
              </div>
              {customer.address && (
                <div className="flex items-start gap-2.5 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  {customer.address}
                </div>
              )}
              {customer.vat_number && (
                <p className="text-xs text-slate-400 font-mono bg-slate-50 rounded px-2 py-1 w-fit">
                  ΑΦΜ: {customer.vat_number}
                </p>
              )}
              {(customer.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {(customer.tags ?? []).map(tag => (
                    <span key={tag} className="bg-indigo-50 text-indigo-700 text-[11px] px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{orders.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">{L.totalOrders}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-lg font-bold text-indigo-600">{formatCurrency(totalSpent)}</p>
              <p className="text-xs text-slate-400 mt-0.5">{L.totalSpent}</p>
            </div>
          </div>

          {customer.notes && (
            <div className="card p-4 text-[13px] text-slate-600">
              <p className="text-xs font-medium text-slate-400 mb-1">{L.notes_}</p>
              {customer.notes}
            </div>
          )}
        </div>

        {/* Order history */}
        <div className="col-span-3 card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">{L.orderHistory}</h2>
            <span className="text-xs text-slate-400">{orders.length} παραγγελίες</span>
          </div>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <ShoppingCart className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">Δεν υπάρχουν παραγγελίες</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Αρ. Παρ.</th>
                  <th>Ημερομηνία</th>
                  <th className="text-right">Σύνολο</th>
                  <th>Κατάσταση</th>
                  <th><span className="sr-only">Άνοιγμα</span></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td className="font-mono text-xs font-semibold text-indigo-600">{o.order_number}</td>
                    <td className="text-slate-500 text-[13px]">{formatDate(o.created_at)}</td>
                    <td className="text-right font-semibold text-slate-900 text-[13px]">
                      {formatCurrency(o.total_price)}
                    </td>
                    <td>
                      <span className={`badge ${PAYMENT_STATUS_LABELS[o.payment_status]?.color}`}>
                        {PAYMENT_STATUS_LABELS[o.payment_status]?.label}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/orders/${o.id}`}
                        className="text-xs text-indigo-600 hover:underline font-medium"
                      >
                        Άνοιγμα
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Email dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600" />
              Email προς {customer.business_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="email-to">
                Προς
              </label>
              <Input id="email-to" value={customer.email} readOnly className="bg-slate-50 text-slate-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="email-subject">
                Θέμα
              </label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                placeholder="π.χ. Νέα Συλλογή Χειμώνας 2026"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="email-body">
                Μήνυμα
              </label>
              <textarea
                id="email-body"
                title="Κείμενο email"
                rows={5}
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                placeholder="Αγαπητέ/ή…"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEmailOpen(false)}>{L.cancel}</Button>
              <Button onClick={handleSendEmail} disabled={sending || !emailSubject || !emailBody}>
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : sent ? <CheckCircle2 className="w-3.5 h-3.5" />
                  : <Send className="w-3.5 h-3.5" />}
                {sent ? 'Εστάλη!' : L.sendEmail}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
