'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { Supplier, Material } from '@/types/database'
import { Plus, Pencil, Trash2, Download, Package2, AlertTriangle } from 'lucide-react'

type MaterialForecast = Material & {
  supplier_name: string
  required: number
  to_order: number
}

const EMPTY_SUP: Omit<Supplier, 'id' | 'created_at'> = { name: '', contact_name: '', phone: '', email: '', address: '' }
const EMPTY_MAT: Omit<Material, 'id' | 'created_at' | 'supplier_id'> & { supplier_id: string } = { name: '', unit: 'pcs', cost_per_unit: 0, stock_quantity: 0, supplier_id: '' }

export default function SuppliersPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'suppliers' | 'materials' | 'forecast'>('forecast')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [forecast, setForecast] = useState<MaterialForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [supOpen, setSupOpen] = useState(false)
  const [matOpen, setMatOpen] = useState(false)
  const [editSup, setEditSup] = useState<Supplier | null>(null)
  const [editMat, setEditMat] = useState<Material | null>(null)
  const [supForm, setSupForm] = useState({ ...EMPTY_SUP })
  const [matForm, setMatForm] = useState({ ...EMPTY_MAT })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [supRes, matRes, bomRes, orderRes] = await Promise.all([
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('materials').select('*').order('name'),
      supabase.from('bill_of_materials').select('material_id, quantity_per_unit, product_id'),
      supabase.from('order_items').select('product_id, quantity').then(r =>
        supabase.from('orders').select('id').in('production_status', ['to_prepare', 'in_progress', 'quality_check', 'ready_packaging']).then(activeOrders => {
          const activeIds = new Set((activeOrders.data ?? []).map(o => o.id))
          return { data: (r.data ?? []) }
        })
      ),
    ])
    setSuppliers(supRes.data ?? [])
    setMaterials(matRes.data ?? [])

    // Build forecast
    const mats = matRes.data ?? []
    const bom = bomRes.data ?? []
    const activeItems = orderRes.data ?? []

    const required: Record<string, number> = {}
    for (const item of activeItems) {
      const bomRows = bom.filter(b => b.product_id === item.product_id)
      for (const row of bomRows) {
        required[row.material_id] = (required[row.material_id] ?? 0) + row.quantity_per_unit * item.quantity
      }
    }

    const forecastData: MaterialForecast[] = mats.map(m => {
      const req = required[m.id] ?? 0
      const toOrder = Math.max(0, req - m.stock_quantity)
      const sup = (supRes.data ?? []).find(s => s.id === m.supplier_id)
      return { ...m, supplier_name: sup?.name ?? '—', required: req, to_order: toOrder }
    }).filter(m => m.required > 0 || m.stock_quantity > 0)

    setForecast(forecastData)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveSup() {
    setSaving(true)
    if (editSup) { await supabase.from('suppliers').update(supForm).eq('id', editSup.id) }
    else { await supabase.from('suppliers').insert(supForm) }
    setSaving(false); setSupOpen(false); load()
  }

  async function saveMat() {
    setSaving(true)
    const payload = { ...matForm, supplier_id: matForm.supplier_id || null }
    if (editMat) { await supabase.from('materials').update(payload).eq('id', editMat.id) }
    else { await supabase.from('materials').insert(payload) }
    setSaving(false); setMatOpen(false); load()
  }

  function exportForecastCSV() {
    const rows = [
      ['Material', 'Unit', 'In Stock', 'Required', 'To Order', 'Cost/Unit', 'Est. Cost', 'Supplier'].join(','),
      ...forecast.map(m => [
        `"${m.name}"`, m.unit, m.stock_quantity, m.required.toFixed(2),
        m.to_order.toFixed(2), m.cost_per_unit, formatCurrency(m.to_order * m.cost_per_unit), `"${m.supplier_name}"`
      ].join(','))
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'material-forecast.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Suppliers & Materials</h1>
        <div className="flex gap-2">
          {tab === 'suppliers' && <Button onClick={() => { setEditSup(null); setSupForm({ ...EMPTY_SUP }); setSupOpen(true) }}><Plus className="w-4 h-4" /> Add Supplier</Button>}
          {tab === 'materials' && <Button onClick={() => { setEditMat(null); setMatForm({ ...EMPTY_MAT }); setMatOpen(true) }}><Plus className="w-4 h-4" /> Add Material</Button>}
          {tab === 'forecast' && <Button variant="outline" onClick={exportForecastCSV}><Download className="w-4 h-4" /> Export CSV</Button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {(['forecast', 'suppliers', 'materials'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Forecast */}
      {tab === 'forecast' && (
        <div>
          <p className="text-sm text-slate-500 mb-4">Materials required for all active production orders</p>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Material', 'In Stock', 'Required', 'To Order', 'Cost/Unit', 'Est. Cost', 'Supplier'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
                ) : forecast.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No active orders or no BOM configured</td></tr>
                ) : forecast.map(m => (
                  <tr key={m.id} className={m.to_order > 0 ? 'bg-yellow-50' : ''}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        {m.to_order > 0 && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                        {m.name}
                      </div>
                      <div className="text-xs text-slate-400">{m.unit}</div>
                    </td>
                    <td className="px-4 py-3">{m.stock_quantity}</td>
                    <td className="px-4 py-3">{m.required.toFixed(2)}</td>
                    <td className={`px-4 py-3 font-bold ${m.to_order > 0 ? 'text-red-600' : 'text-green-600'}`}>{m.to_order > 0 ? m.to_order.toFixed(2) : '✓'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(m.cost_per_unit)}</td>
                    <td className="px-4 py-3 font-semibold">{m.to_order > 0 ? formatCurrency(m.to_order * m.cost_per_unit) : '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{m.supplier_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suppliers list */}
      {tab === 'suppliers' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Name', 'Contact', 'Phone', 'Email', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.contact_name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{s.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditSup(s); setSupForm({ name: s.name, contact_name: s.contact_name ?? '', phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '' }); setSupOpen(true) }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Materials list */}
      {tab === 'materials' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Material', 'Unit', 'Stock', 'Cost/Unit', 'Supplier', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {materials.map(m => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                  <td className="px-4 py-3 text-slate-600">{m.unit}</td>
                  <td className="px-4 py-3">{m.stock_quantity}</td>
                  <td className="px-4 py-3">{formatCurrency(m.cost_per_unit)}</td>
                  <td className="px-4 py-3 text-slate-600">{suppliers.find(s => s.id === m.supplier_id)?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditMat(m); setMatForm({ name: m.name, unit: m.unit, cost_per_unit: m.cost_per_unit, stock_quantity: m.stock_quantity, supplier_id: m.supplier_id ?? '' }); setMatOpen(true) }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Supplier dialog */}
      <Dialog open={supOpen} onOpenChange={setSupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editSup ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {['name', 'contact_name', 'phone', 'email', 'address'].map(k => (
              <div key={k}>
                <label className="text-xs font-medium text-slate-600 mb-1 block capitalize">{k.replace('_', ' ')}</label>
                <Input value={supForm[k as keyof typeof supForm] as string} onChange={e => setSupForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSupOpen(false)}>Cancel</Button>
              <Button onClick={saveSup} disabled={saving || !supForm.name}>{saving ? 'Saving…' : editSup ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Material dialog */}
      <Dialog open={matOpen} onOpenChange={setMatOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editMat ? 'Edit Material' : 'Add Material'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs font-medium text-slate-600 mb-1 block">Name</label><Input value={matForm.name} onChange={e => setMatForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-slate-600 mb-1 block">Unit</label><Input value={matForm.unit} onChange={e => setMatForm(f => ({ ...f, unit: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-slate-600 mb-1 block">Stock Qty</label><Input type="number" value={matForm.stock_quantity} onChange={e => setMatForm(f => ({ ...f, stock_quantity: +e.target.value }))} /></div>
            </div>
            <div><label className="text-xs font-medium text-slate-600 mb-1 block">Cost per Unit (€)</label><Input type="number" step="0.01" value={matForm.cost_per_unit} onChange={e => setMatForm(f => ({ ...f, cost_per_unit: +e.target.value }))} /></div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Supplier</label>
              <select className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm" value={matForm.supplier_id} onChange={e => setMatForm(f => ({ ...f, supplier_id: e.target.value }))}>
                <option value="">None</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setMatOpen(false)}>Cancel</Button>
              <Button onClick={saveMat} disabled={saving || !matForm.name}>{saving ? 'Saving…' : editMat ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
