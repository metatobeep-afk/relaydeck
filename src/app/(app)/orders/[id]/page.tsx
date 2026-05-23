'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate, PAYMENT_STATUS_LABELS, PRODUCTION_STATUS_LABELS, SHIPPING_STATUS_LABELS } from '@/lib/utils'
import { L } from '@/lib/labels'
import type { PaymentStatus, ProductionStatus, ShippingStatus } from '@/types/database'
import {
  ArrowLeft, Send, Banknote, FileDown, User, Phone, Mail,
  MapPin, FileText, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react'

type FullOrder = {
  id: string
  order_number: string
  total_price: number
  notes: string | null
  payment_status: PaymentStatus
  production_status: ProductionStatus
  shipping_status: ShippingStatus
  created_at: string
  customers: {
    id: string
    business_name: string
    contact_name: string
    phone: string
    email: string
    vat_number: string | null
    address: string | null
  }
  order_items: {
    id: string
    quantity: number
    unit_price: number
    line_total: number
    products: { name: string; code: string }
  }[]
}

type CompanySettings = {
  name: string; afm: string; doy: string; address: string
  phone: string; email: string; iban: string; bank_name: string
  swift: string; deposit_rate: number; invoice_prefix: string
}

const DEFAULT_SETTINGS: CompanySettings = {
  name: '', afm: '', doy: '', address: '', phone: '', email: '',
  iban: '', bank_name: '', swift: '', deposit_rate: 50, invoice_prefix: 'ORD',
}

type ActionState = 'idle' | 'loading' | 'success' | 'error'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [order, setOrder] = useState<FullOrder | null>(null)
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [emailState, setEmailState] = useState<ActionState>('idle')
  const [pdfState, setPdfState] = useState<ActionState>('idle')

  useEffect(() => {
    supabase
      .from('orders')
      .select('*, customers(*), order_items(*, products(name, code))')
      .eq('id', id)
      .single()
      .then(({ data }) => setOrder(data as unknown as FullOrder))

    supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setSettings(data as unknown as CompanySettings) })
  }, [id, supabase])

  async function updateStatus(field: string, value: string) {
    setSaving(true)
    await supabase.from('orders').update({ [field]: value }).eq('id', id)
    setOrder(prev => prev ? { ...prev, [field]: value } : prev)
    setSaving(false)

    // Auto-notify customer on key shipping transitions
    if (!order) return
    const notify = (
      (field === 'shipping_status' && value === 'shipped') ||
      (field === 'shipping_status' && value === 'delivered')
    )
    if (notify) {
      const subject = value === 'shipped'
        ? `Η παραγγελία σας ${order.order_number} απεστάλη`
        : `Η παραγγελία σας ${order.order_number} παραδόθηκε`
      const bodyText = value === 'shipped'
        ? `Η παραγγελία <strong>${order.order_number}</strong> έχει αποσταλεί και βρίσκεται καθ' οδόν.`
        : `Η παραγγελία <strong>${order.order_number}</strong> έχει παραδοθεί επιτυχώς.`
      const html = `
        <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#1e1e3c;background:#f5f6ff;margin:0;padding:24px">
        <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
          <div style="background:linear-gradient(135deg,#4650c8,#6366f1);padding:24px 32px">
            <h1 style="margin:0;color:white;font-size:20px">RelayDeck</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px">${subject}</p>
          </div>
          <div style="padding:28px 32px">
            <p>Αγαπητέ/ή <strong>${order.customers.contact_name}</strong>,</p>
            <p style="font-size:15px;margin:16px 0">${bodyText}</p>
            <div style="background:#f5f6ff;border-radius:8px;padding:12px 16px;font-size:13px;color:#555">
              Αρ. Παραγγελίας: <strong>${order.order_number}</strong>
            </div>
          </div>
          <div style="background:#f9f9fb;padding:14px 32px;text-align:center;font-size:11px;color:#aaa">
            RelayDeck B2B Platform
          </div>
        </div></body></html>`
      fetch('/api/email/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: order.customers.email,
          toName: order.customers.business_name,
          orderNumber: order.order_number,
          subject,
          htmlBody: html,
        }),
      })
    }
  }

  async function handleMarkDeposit() {
    await updateStatus('payment_status', 'deposit_received')
  }

  async function handleSendConfirmation() {
    if (!order) return
    setEmailState('loading')
    try {
      const deposit = order.total_price * (settings.deposit_rate / 100)
      const remaining = order.total_price - deposit
      const itemRows = order.order_items.map(i =>
        `<tr style="border-bottom:1px solid #eee">
          <td style="padding:6px 8px;font-family:monospace;font-size:12px">${i.products?.code}</td>
          <td style="padding:6px 8px">${i.products?.name}</td>
          <td style="padding:6px 8px;text-align:center">${i.quantity}</td>
          <td style="padding:6px 8px;text-align:right">${formatCurrency(i.unit_price)}</td>
          <td style="padding:6px 8px;text-align:right;font-weight:600">${formatCurrency(i.line_total)}</td>
        </tr>`
      ).join('')

      const html = `
        <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#1e1e3c;background:#f5f6ff;margin:0;padding:24px">
        <div style="max-width:580px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
          <div style="background:linear-gradient(135deg,#4650c8,#6366f1);padding:28px 32px">
            <h1 style="margin:0;color:white;font-size:22px">RelayDeck</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px">Επιβεβαίωση Παραγγελίας</p>
          </div>
          <div style="padding:28px 32px">
            <p style="margin:0 0 8px">Αγαπητέ/ή <strong>${order.customers.contact_name}</strong>,</p>
            <p style="color:#666;font-size:14px">Σας ευχαριστούμε για την παραγγελία σας. Ακολουθούν τα στοιχεία:</p>
            <div style="background:#f5f6ff;border-radius:8px;padding:12px 16px;margin:16px 0;font-size:13px">
              <strong>Αρ. Παραγγελίας:</strong> ${order.order_number} &nbsp;|&nbsp;
              <strong>Ημερομηνία:</strong> ${formatDate(order.created_at)}
            </div>
            <table width="100%" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin:16px 0">
              <thead><tr style="background:#4650c8;color:white">
                <th style="padding:8px;text-align:left">Κωδικός</th>
                <th style="padding:8px;text-align:left">Προϊόν</th>
                <th style="padding:8px;text-align:center">Τεμ.</th>
                <th style="padding:8px;text-align:right">Τιμή</th>
                <th style="padding:8px;text-align:right">Σύνολο</th>
              </tr></thead>
              <tbody>${itemRows}</tbody>
            </table>
            <table width="100%" style="font-size:14px;margin-top:16px">
              <tr><td style="color:#666">Συνολική Αξία:</td><td style="text-align:right;font-weight:700;font-size:16px">${formatCurrency(order.total_price)}</td></tr>
              <tr><td style="color:#4650c8;font-weight:600">Προκαταβολή (${settings.deposit_rate}%):</td><td style="text-align:right;color:#4650c8;font-weight:700">${formatCurrency(deposit)}</td></tr>
              <tr><td style="color:#666">Υπόλοιπο:</td><td style="text-align:right">${formatCurrency(remaining)}</td></tr>
            </table>
            ${settings.iban ? `
            <div style="background:#f0f2ff;border-radius:8px;padding:16px;margin-top:20px;font-size:13px">
              <strong style="color:#4650c8">Τραπεζικά Στοιχεία για Κατάθεση Προκαταβολής</strong><br>
              <span style="color:#444">${settings.bank_name} &nbsp;|&nbsp; IBAN: ${settings.iban} &nbsp;|&nbsp; BIC: ${settings.swift}</span><br>
              <span style="color:#666">Αιτιολογία: ${order.order_number}</span>
            </div>` : ''}
          </div>
          <div style="background:#f9f9fb;padding:16px 32px;text-align:center;font-size:11px;color:#aaa">
            RelayDeck B2B Platform &nbsp;|&nbsp; ${settings.email}
          </div>
        </div></body></html>`

      await fetch('/api/email/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: order.customers.email,
          toName: order.customers.business_name,
          orderNumber: order.order_number,
          htmlBody: html,
        }),
      })
      setEmailState('success')
      setTimeout(() => setEmailState('idle'), 3000)
    } catch {
      setEmailState('error')
      setTimeout(() => setEmailState('idle'), 3000)
    }
  }

  async function handleExportPDF() {
    if (!order) return
    setPdfState('loading')
    try {
      const { generateOrderPDF } = await import('@/lib/pdf')
      const doc = generateOrderPDF(order as Parameters<typeof generateOrderPDF>[0], settings)
      doc.save(`${order.order_number}.pdf`)
      setPdfState('success')
      setTimeout(() => setPdfState('idle'), 2000)
    } catch {
      setPdfState('error')
      setTimeout(() => setPdfState('idle'), 2000)
    }
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> {L.loading}
      </div>
    )
  }

  const deposit = order.total_price * (settings.deposit_rate / 100)
  const remaining = order.total_price - deposit

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
          <h1 className="text-xl font-semibold text-slate-900">{order.order_number}</h1>
          <p className="text-sm text-slate-500">{formatDate(order.created_at)}</p>
        </div>
        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={pdfState === 'loading'}
          >
            {pdfState === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : pdfState === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              : <FileDown className="w-3.5 h-3.5" />}
            {L.exportPDF}
          </Button>
          {order.payment_status === 'pending_deposit' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkDeposit}
              disabled={saving}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Banknote className="w-3.5 h-3.5" />
              {L.markDeposit}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSendConfirmation}
            disabled={emailState === 'loading'}
          >
            {emailState === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : emailState === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" />
              : emailState === 'error' ? <AlertCircle className="w-3.5 h-3.5" />
              : <Send className="w-3.5 h-3.5" />}
            {emailState === 'success' ? 'Εστάλη!' : emailState === 'error' ? 'Σφάλμα' : L.sendConfirmation}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-5">

        {/* Status cards */}
        {[
          { label: 'Πληρωμή', field: 'payment_status', current: order.payment_status, map: PAYMENT_STATUS_LABELS },
          { label: 'Παραγωγή', field: 'production_status', current: order.production_status, map: PRODUCTION_STATUS_LABELS },
          { label: 'Αποστολή',  field: 'shipping_status',  current: order.shipping_status,  map: SHIPPING_STATUS_LABELS },
        ].map(({ label, field, current, map }) => (
          <div key={field} className="card p-4">
            <p className="text-xs font-medium text-slate-400 mb-2">{label}</p>
            <span className={`badge ${map[current]?.color} mb-3 block w-fit`}>{map[current]?.label}</span>
            <Select
              value={current}
              onValueChange={v => updateStatus(field, v)}
              disabled={saving}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(map).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-5">

        {/* Customer */}
        <div className="col-span-2 card p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Στοιχεία Πελάτη</h2>
          <div className="space-y-2.5 text-[13px]">
            <div className="flex items-start gap-2.5">
              <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">{order.customers.business_name}</p>
                <p className="text-slate-500">{order.customers.contact_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600">
              <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              {order.customers.phone}
            </div>
            <div className="flex items-center gap-2.5 text-slate-600">
              <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              {order.customers.email}
            </div>
            {order.customers.address && (
              <div className="flex items-start gap-2.5 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                {order.customers.address}
              </div>
            )}
            {order.customers.vat_number && (
              <p className="text-xs text-slate-400 font-mono">ΑΦΜ: {order.customers.vat_number}</p>
            )}
          </div>

          {/* Totals summary */}
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
            <div className="flex justify-between text-[13px]">
              <span className="text-slate-500">Σύνολο</span>
              <span className="font-semibold text-slate-900">{formatCurrency(order.total_price)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-indigo-600">{L.deposit}</span>
              <span className="font-semibold text-indigo-700">{formatCurrency(deposit)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-slate-500">{L.remainingAmount}</span>
              <span className="font-medium text-slate-700">{formatCurrency(remaining)}</span>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="col-span-3 card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Γραμμές Παραγγελίας</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>{L.productCode}</th>
                <th>Προϊόν</th>
                <th className="text-center">{L.quantity}</th>
                <th className="text-right">{L.unitPrice}</th>
                <th className="text-right">{L.lineTotal}</th>
              </tr>
            </thead>
            <tbody>
              {order.order_items.map(item => (
                <tr key={item.id}>
                  <td className="font-mono text-xs text-slate-500">{item.products?.code}</td>
                  <td className="font-medium text-slate-900">{item.products?.name}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                  <td className="text-right font-semibold text-slate-900">{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td colSpan={3} />
                <td className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Σύνολο</td>
                <td className="px-4 py-3 text-right text-base font-bold text-indigo-700">
                  {formatCurrency(order.total_price)}
                </td>
              </tr>
            </tfoot>
          </table>

          {order.notes && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-start gap-2 text-[13px] text-slate-600">
              <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              {order.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
