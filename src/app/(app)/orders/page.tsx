'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PAYMENT_STATUS_LABELS, PRODUCTION_STATUS_LABELS, formatCurrency, formatDate } from '@/lib/utils'
import type { OrderWithCustomer } from '@/types/database'
import { Search, Plus, Download, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function OrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<OrderWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [productionFilter, setProductionFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('orders')
      .select('*, customers(business_name, contact_name, email, phone)')
      .order('created_at', { ascending: false })
    if (paymentFilter !== 'all') q = q.eq('payment_status', paymentFilter)
    if (productionFilter !== 'all') q = q.eq('production_status', productionFilter)
    const { data } = await q
    let result = (data ?? []) as OrderWithCustomer[]
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(o =>
        o.order_number.toLowerCase().includes(s) ||
        o.customers?.business_name?.toLowerCase().includes(s)
      )
    }
    setOrders(result)
    setLoading(false)
  }, [paymentFilter, productionFilter, search])

  useEffect(() => { load() }, [load])

  function exportCSV() {
    const rows = [
      ['Order #', 'Customer', 'Date', 'Total', 'Payment', 'Production'].join(','),
      ...orders.map(o => [
        o.order_number,
        `"${o.customers?.business_name}"`,
        formatDate(o.created_at),
        o.total_price,
        PAYMENT_STATUS_LABELS[o.payment_status]?.label,
        PRODUCTION_STATUS_LABELS[o.production_status]?.label,
      ].join(','))
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'orders.csv'
    a.click()
  }

  return (
    <div className="px-4 py-5 md:px-8 md:py-7 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Παραγγελίες</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? '—' : `${orders.length} παραγγελίες`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5" />
            Εξαγωγή CSV
          </Button>
          <Link href="/orders/new">
            <Button size="sm">
              <Plus className="w-3.5 h-3.5" />
              Νέα Παραγγελία
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Αναζήτηση παραγγελίας ή πελάτη…"
            className="pl-8 w-full h-8 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-48 h-8 text-sm">
            <SelectValue placeholder="Πληρωμή" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλες οι Πληρωμές</SelectItem>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={productionFilter} onValueChange={setProductionFilter}>
          <SelectTrigger className="w-48 h-8 text-sm">
            <SelectValue placeholder="Παραγωγή" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλα τα Στάδια</SelectItem>
            {Object.entries(PRODUCTION_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Παραγγελία</th>
              <th>Πελάτης</th>
              <th>Ημερομηνία</th>
              <th>Σύνολο</th>
              <th>Πληρωμή</th>
              <th>Παραγωγή</th>
              <th>Αποστολή</th>
              <th><span className="sr-only">Ενέργειες</span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={8}>
                    <div className="h-4 rounded bg-slate-100 animate-pulse" />
                  </td>
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-sm text-slate-400">
                  Δεν βρέθηκαν παραγγελίες
                </td>
              </tr>
            ) : orders.map(order => (
              <tr key={order.id}>
                <td>
                  <span className="font-mono text-xs font-semibold text-indigo-600">
                    {order.order_number}
                  </span>
                </td>
                <td>
                  <span className="font-medium text-slate-900 text-[13px]">
                    {order.customers?.business_name}
                  </span>
                  <br />
                  <span className="text-xs text-slate-400">{order.customers?.contact_name}</span>
                </td>
                <td className="text-slate-500 text-[13px]">{formatDate(order.created_at)}</td>
                <td className="font-semibold text-slate-900 text-[13px]">
                  {formatCurrency(order.total_price)}
                </td>
                <td>
                  <span className={`badge ${PAYMENT_STATUS_LABELS[order.payment_status]?.color}`}>
                    {PAYMENT_STATUS_LABELS[order.payment_status]?.label}
                  </span>
                </td>
                <td>
                  <span className={`badge ${PRODUCTION_STATUS_LABELS[order.production_status]?.color}`}>
                    {PRODUCTION_STATUS_LABELS[order.production_status]?.label}
                  </span>
                </td>
                <td className="text-slate-500 text-[13px] capitalize">{order.shipping_status}</td>
                <td>
                  <Link
                    href={`/orders/${order.id}`}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Προβολή
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
