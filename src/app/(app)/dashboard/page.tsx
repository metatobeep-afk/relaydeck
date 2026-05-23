'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, PAYMENT_STATUS_LABELS, PRODUCTION_STATUS_LABELS } from '@/lib/utils'
import React from 'react'
import { ShoppingCart, TrendingUp, Clock, Users, Factory, CheckCircle2, ArrowRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Stats {
  totalOrders: number
  totalRevenue: number
  pendingDeposit: number
  totalCustomers: number
  inProduction: number
  completedOrders: number
  revenueByMonth: { date: string; revenue: number }[]
}

interface RecentOrder {
  id: string
  order_number: string
  total_price: number
  payment_status: string
  production_status: string
  created_at: string
  customers: { business_name: string }
}

interface TopCustomer {
  business_name: string
  total: number
  count: number
}

const KPI_CONFIG: { key: keyof Stats; label: string; icon: React.ComponentType<{ className?: string }>; iconBg: string; iconColor: string; format: boolean }[] = [
  { key: 'totalOrders',     label: 'Παραγγελίες',         icon: ShoppingCart,  iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-600',  format: false },
  { key: 'totalRevenue',    label: 'Τζίρος',              icon: TrendingUp,    iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', format: true  },
  { key: 'pendingDeposit',  label: 'Εκκρεμείς Πληρωμές', icon: Clock,         iconBg: 'bg-amber-50',   iconColor: 'text-amber-600',   format: false },
  { key: 'totalCustomers',  label: 'Πελάτες',             icon: Users,         iconBg: 'bg-blue-50',    iconColor: 'text-blue-600',    format: false },
  { key: 'inProduction',    label: 'Σε Παραγωγή',         icon: Factory,       iconBg: 'bg-violet-50',  iconColor: 'text-violet-600',  format: false },
  { key: 'completedOrders', label: 'Ολοκληρωμένες',       icon: CheckCircle2,  iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', format: false },
]

const chartTooltipStyle = {
  fontSize: 12, borderRadius: 8,
  border: '1px solid hsl(220,13%,90%)',
  boxShadow: '0 4px 12px rgba(0,0,0,.08)',
  color: 'hsl(228,10%,14%)',
}
const chartCursorStyle = { fill: 'hsl(220,14%,97%)' }
const xAxisTickStyle = { fontSize: 11, fill: 'hsl(222,6%,58%)' }
const yAxisTickStyle = { fontSize: 11, fill: 'hsl(222,6%,58%)' }

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [ordersRes, customersRes, recentRes] = await Promise.all([
        supabase.from('orders').select('total_price, payment_status, production_status, created_at'),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('orders')
          .select('id, order_number, total_price, payment_status, production_status, created_at, customers(business_name)')
          .order('created_at', { ascending: false })
          .limit(6),
      ])

      const orders = ordersRes.data ?? []
      const byMonth: Record<string, number> = {}
      orders.forEach(o => {
        const m = new Date(o.created_at).toLocaleDateString('el-GR', { month: 'short', year: '2-digit' })
        byMonth[m] = (byMonth[m] ?? 0) + (o.total_price ?? 0)
      })

      setStats({
        totalOrders:     orders.length,
        totalRevenue:    orders.reduce((s, o) => s + (o.total_price ?? 0), 0),
        pendingDeposit:  orders.filter(o => o.payment_status === 'pending_deposit').length,
        totalCustomers:  customersRes.count ?? 0,
        inProduction:    orders.filter(o => ['in_progress', 'quality_check', 'ready_packaging'].includes(o.production_status)).length,
        completedOrders: orders.filter(o => o.production_status === 'completed').length,
        revenueByMonth:  Object.entries(byMonth).slice(-8).map(([date, revenue]) => ({ date, revenue })),
      })

      setRecentOrders((recentRes.data ?? []) as unknown as RecentOrder[])

      // Top customers from all orders
      const allOrdersRes = await supabase
        .from('orders')
        .select('total_price, customers(business_name)')
      const byCustomer: Record<string, TopCustomer> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(allOrdersRes.data ?? []).forEach((o: any) => {
        const name = (o.customers as { business_name: string } | null)?.business_name ?? '—'
        if (!byCustomer[name]) byCustomer[name] = { business_name: name, total: 0, count: 0 }
        byCustomer[name].total += o.total_price ?? 0
        byCustomer[name].count += 1
      })
      setTopCustomers(Object.values(byCustomer).sort((a, b) => b.total - a.total).slice(0, 5))

      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="px-4 py-5 md:px-8 md:py-7 max-w-6xl mx-auto">

      <div className="mb-7">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Επισκόπηση παραγγελιών & τζίρου</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-7">
        {KPI_CONFIG.map(({ key, label, icon: Icon, iconBg, iconColor, format }) => {
          const raw = stats?.[key] ?? 0
          const value = format ? formatCurrency(raw as number) : String(raw as number)
          return (
            <div key={key} className="card p-5">
              {loading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-3 w-20 rounded bg-slate-100" />
                  <div className="h-7 w-28 rounded bg-slate-100" />
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1.5">{label}</p>
                    <p className="text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
                  </div>
                  <div className={`${iconBg} w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Revenue chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-slate-900">Τζίρος ανά Μήνα</h2>
            <p className="text-xs text-slate-400 mt-0.5">Σύνολα παραγγελιών ανά μήνα</p>
          </div>
          {loading ? (
            <div className="h-52 animate-pulse bg-slate-50 rounded-lg" />
          ) : stats && stats.revenueByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.revenueByMonth} barSize={26}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,93%)" vertical={false} />
                <XAxis dataKey="date" tick={xAxisTickStyle} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={v => `€${(Number(v) / 1000).toFixed(0)}k`}
                  tick={yAxisTickStyle}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v)), 'Τζίρος']}
                  contentStyle={chartTooltipStyle}
                  cursor={chartCursorStyle}
                />
                <Bar dataKey="revenue" fill="hsl(243,65%,54%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
              Δεν υπάρχουν δεδομένα ακόμα
            </div>
          )}
        </div>

        {/* Top customers */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Κορυφαίοι Πελάτες</h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 rounded bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : topCustomers.length === 0 ? (
            <p className="text-sm text-slate-400">Δεν υπάρχουν δεδομένα</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c, i) => (
                <div key={c.business_name} className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-800 truncate">{c.business_name}</p>
                    <p className="text-[11px] text-slate-400">{c.count} παραγγελίες</p>
                  </div>
                  <span className="text-[13px] font-semibold text-slate-700 flex-shrink-0">
                    {formatCurrency(c.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Πρόσφατες Παραγγελίες</h2>
          <Link href="/orders" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
            Όλες <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Παραγγελία</th>
              <th>Πελάτης</th>
              <th>Ημερομηνία</th>
              <th>Σύνολο</th>
              <th>Πληρωμή</th>
              <th>Παραγωγή</th>
              <th><span className="sr-only">Προβολή</span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="h-4 rounded bg-slate-100 animate-pulse" /></td></tr>
              ))
            ) : recentOrders.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">Δεν υπάρχουν παραγγελίες ακόμα</td></tr>
            ) : recentOrders.map(order => (
              <tr key={order.id}>
                <td><span className="font-mono text-xs font-semibold text-indigo-600">{order.order_number}</span></td>
                <td className="font-medium text-slate-900 text-[13px]">{order.customers?.business_name}</td>
                <td className="text-slate-500 text-[13px]">{formatDate(order.created_at)}</td>
                <td className="font-semibold text-slate-900 text-[13px]">{formatCurrency(order.total_price)}</td>
                <td><span className={`badge ${PAYMENT_STATUS_LABELS[order.payment_status]?.color}`}>{PAYMENT_STATUS_LABELS[order.payment_status]?.label}</span></td>
                <td><span className={`badge ${PRODUCTION_STATUS_LABELS[order.production_status]?.color}`}>{PRODUCTION_STATUS_LABELS[order.production_status]?.label}</span></td>
                <td>
                  <Link href={`/orders/${order.id}`} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
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
