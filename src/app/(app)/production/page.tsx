'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, PRODUCTION_STATUS_LABELS } from '@/lib/utils'
import { L } from '@/lib/labels'
import type { ProductionStatus } from '@/types/database'

const STAGES: { key: ProductionStatus; label: string; headerBg: string; dotColor: string }[] = [
  { key: 'to_prepare',      label: 'Προς Ετοιμασία',       headerBg: 'bg-slate-100',  dotColor: 'bg-slate-400' },
  { key: 'in_progress',     label: 'Σε Εξέλιξη',            headerBg: 'bg-orange-50',  dotColor: 'bg-orange-400' },
  { key: 'quality_check',   label: 'Ποιοτικός Έλεγχος',     headerBg: 'bg-purple-50',  dotColor: 'bg-purple-400' },
  { key: 'ready_packaging', label: 'Έτοιμο Συσκευασία',     headerBg: 'bg-cyan-50',    dotColor: 'bg-cyan-400' },
  { key: 'ready_ship',      label: 'Έτοιμο Αποστολή',       headerBg: 'bg-indigo-50',  dotColor: 'bg-indigo-400' },
  { key: 'completed',       label: 'Ολοκληρώθηκε',          headerBg: 'bg-emerald-50', dotColor: 'bg-emerald-400' },
]

type KanbanOrder = {
  id: string
  order_number: string
  total_price: number
  production_status: ProductionStatus
  created_at: string
  customers: { business_name: string }
}

type ProductSummary = {
  code: string
  name: string
  total_qty: number
  total_value: number
}

export default function ProductionPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'kanban' | 'summary'>('kanban')
  const [orders, setOrders] = useState<KanbanOrder[]>([])
  const [summary, setSummary] = useState<ProductSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [ordersRes, itemsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, total_price, production_status, created_at, customers(business_name)')
          .not('production_status', 'eq', 'completed')
          .order('created_at'),
        supabase
          .from('order_items')
          .select('quantity, unit_price, line_total, products(name, code)')
          .then(r => r),
      ])
      setOrders(ordersRes.data as unknown as KanbanOrder[])

      // Aggregate quantities by product code
      type RawItem = { quantity: number; unit_price: number; line_total: number; products: { name: string; code: string } | null }
      const items = (itemsRes.data ?? []) as unknown as RawItem[]
      const agg: Record<string, ProductSummary> = {}
      for (const item of items) {
        const p = item.products
        if (!p) continue
        if (!agg[p.code]) agg[p.code] = { code: p.code, name: p.name, total_qty: 0, total_value: 0 }
        agg[p.code].total_qty += item.quantity
        agg[p.code].total_value += item.line_total
      }
      setSummary(Object.values(agg).sort((a, b) => b.total_qty - a.total_qty))
      setLoading(false)
    }
    load()
  }, [supabase])

  async function moveTo(orderId: string, status: ProductionStatus) {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, production_status: status } : o))
    await supabase.from('orders').update({ production_status: status }).eq('id', orderId)
  }

  const byStage = (stage: ProductionStatus) => orders.filter(o => o.production_status === stage)

  return (
    <div className="px-8 py-7">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{L.production}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Διαχείριση σταδίων παραγωγής</p>
        </div>
        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
          {(['kanban', 'summary'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t === 'kanban' ? 'Kanban' : L.productionSummary}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban */}
      {tab === 'kanban' && (
        loading ? (
          <div className="flex gap-4">
            {STAGES.map(s => <div key={s.key} className="flex-1 min-w-52 h-80 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map(stage => (
              <div
                key={stage.key}
                className="flex-1 min-w-52 max-w-64 rounded-xl border border-slate-200 bg-white flex flex-col overflow-hidden"
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  if (dragging) moveTo(dragging, stage.key)
                  setDragging(null)
                }}
              >
                <div className={`${stage.headerBg} px-3 py-2.5 flex items-center gap-2 border-b border-slate-100`}>
                  <span className={`w-2 h-2 rounded-full ${stage.dotColor} flex-shrink-0`} />
                  <span className="text-xs font-semibold text-slate-700">{stage.label}</span>
                  <span className="ml-auto text-xs bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">
                    {byStage(stage.key).length}
                  </span>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-32">
                  {byStage(stage.key).map(order => (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={() => setDragging(order.id)}
                      className="bg-slate-50 rounded-lg border border-slate-200 p-3 cursor-grab active:cursor-grabbing hover:border-indigo-300 transition-colors"
                    >
                      <p className="text-[11px] font-mono font-bold text-indigo-600">{order.order_number}</p>
                      <p className="text-[13px] font-medium text-slate-900 mt-0.5 truncate">{order.customers?.business_name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-slate-400">{formatDate(order.created_at)}</span>
                        <span className="text-[13px] font-bold text-indigo-700">{formatCurrency(order.total_price)}</span>
                      </div>
                      {/* Quick move */}
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {STAGES.filter(s => s.key !== stage.key).slice(0, 2).map(s => (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => moveTo(order.id, s.key)}
                            className="text-[10px] bg-white border border-slate-200 hover:border-indigo-300 text-slate-500 hover:text-indigo-600 px-1.5 py-0.5 rounded-full transition-colors"
                          >
                            → {s.label.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {byStage(stage.key).length === 0 && (
                    <div className="text-center text-[11px] text-slate-300 py-6 border-2 border-dashed border-slate-100 rounded-lg">
                      Σύρετε εδώ
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Summary */}
      {tab === 'summary' && (
        <div className="card overflow-hidden max-w-3xl">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">{L.aggregatedQty}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Αθροιστικές ποσότητες από όλες τις ενεργές παραγγελίες</p>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>{L.productCode}</th>
                <th>Προϊόν</th>
                <th className="text-center">Συνολική Ποσότητα</th>
                <th className="text-right">Συνολική Αξία</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={4}><div className="h-4 rounded bg-slate-100 animate-pulse" /></td></tr>
                ))
              ) : summary.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-slate-400 text-sm">{L.noData}</td></tr>
              ) : summary.map(p => (
                <tr key={p.code}>
                  <td className="font-mono text-xs font-semibold text-slate-500">{p.code}</td>
                  <td className="font-medium text-slate-900">{p.name}</td>
                  <td className="text-center">
                    <span className="inline-flex items-center justify-center w-10 h-6 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold">
                      {p.total_qty}
                    </span>
                  </td>
                  <td className="text-right font-semibold text-slate-900">{formatCurrency(p.total_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
