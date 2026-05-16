'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import React from 'react'
import { ShoppingCart, TrendingUp, Clock, Users, Factory, CheckCircle2 } from 'lucide-react'
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

const KPI_CONFIG: { key: keyof Stats; label: string; icon: React.ComponentType<{ className?: string }>; iconBg: string; iconColor: string; format: boolean }[] = [
  { key: 'totalOrders',     label: 'Total Orders',    icon: ShoppingCart,  iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-600',  format: false },
  { key: 'totalRevenue',    label: 'Revenue',         icon: TrendingUp,    iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', format: true  },
  { key: 'pendingDeposit',  label: 'Pending Deposit', icon: Clock,         iconBg: 'bg-amber-50',   iconColor: 'text-amber-600',   format: false },
  { key: 'totalCustomers',  label: 'Customers',       icon: Users,         iconBg: 'bg-blue-50',    iconColor: 'text-blue-600',    format: false },
  { key: 'inProduction',    label: 'In Production',   icon: Factory,       iconBg: 'bg-violet-50',  iconColor: 'text-violet-600',  format: false },
  { key: 'completedOrders', label: 'Completed',       icon: CheckCircle2,  iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', format: false },
]

// Recharts takes style objects as component props (not DOM style attributes)
const chartTooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [ordersRes, customersRes] = await Promise.all([
        supabase.from('orders').select('total_price, payment_status, production_status, created_at'),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
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
        inProduction:    orders.filter(o => ['in_progress','quality_check','ready_packaging'].includes(o.production_status)).length,
        completedOrders: orders.filter(o => o.production_status === 'completed').length,
        revenueByMonth:  Object.entries(byMonth).slice(-8).map(([date, revenue]) => ({ date, revenue })),
      })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="px-4 py-5 md:px-8 md:py-7 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Exhibition order overview</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-3 gap-4 mb-7">
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

      {/* Revenue chart */}
      {!loading && stats && stats.revenueByMonth.length > 0 && (
        <div className="card p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-slate-900">Revenue by Month</h2>
            <p className="text-xs text-slate-400 mt-0.5">Order totals grouped by month</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.revenueByMonth} barSize={28}>
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
                formatter={(v) => [formatCurrency(Number(v)), 'Revenue']}
                contentStyle={chartTooltipStyle}
                cursor={chartCursorStyle}
              />
              <Bar dataKey="revenue" fill="hsl(243,65%,54%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
