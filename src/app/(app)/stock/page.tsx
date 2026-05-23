'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, Package, Loader2, CheckCircle2, Edit2, X } from 'lucide-react'

interface Material {
  id: string
  name: string
  unit: string
  cost_per_unit: number
  stock_quantity: number
  supplier_id: string | null
  suppliers: { name: string } | null
}

const LOW_STOCK_THRESHOLD = 10

export default function StockPage() {
  const supabase = createClient()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('materials')
      .select('*, suppliers(name)')
      .order('name')
    setMaterials((data ?? []) as unknown as Material[])
    setLoading(false)
  }

  async function saveQty(id: string) {
    const qty = parseFloat(editQty)
    if (isNaN(qty) || qty < 0) return
    setSaving(true)
    await supabase.from('materials').update({ stock_quantity: qty }).eq('id', id)
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, stock_quantity: qty } : m))
    setSaving(false)
    setEditId(null)
    setSaved(id)
    setTimeout(() => setSaved(null), 2000)
  }

  const filtered = search
    ? materials.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    : materials

  const lowStock = materials.filter(m => m.stock_quantity <= LOW_STOCK_THRESHOLD)

  return (
    <div className="px-4 py-5 md:px-8 md:py-7 max-w-5xl mx-auto">

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Απόθεμα Υλικών</h1>
        <p className="text-sm text-slate-500 mt-0.5">Παρακολούθηση ποσοτήτων αποθέματος ανά υλικό</p>
      </div>

      {/* Low stock alert */}
      {!loading && lowStock.length > 0 && (
        <div className="mb-5 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Χαμηλό απόθεμα σε {lowStock.length} υλικά</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {lowStock.map(m => m.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-xs text-slate-400 mb-1">Σύνολο Υλικών</p>
            <p className="text-2xl font-semibold text-slate-900">{materials.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-400 mb-1">Χαμηλό Απόθεμα</p>
            <p className="text-2xl font-semibold text-amber-600">{lowStock.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-400 mb-1">Αξία Αποθέματος</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatCurrency(materials.reduce((s, m) => s + m.cost_per_unit * m.stock_quantity, 0))}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Αναζήτηση υλικού…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Υλικό</th>
              <th>Προμηθευτής</th>
              <th className="text-right">Κόστος/Μον.</th>
              <th className="text-center">Μονάδα</th>
              <th className="text-center">Ποσότητα</th>
              <th className="text-right">Αξία</th>
              <th><span className="sr-only">Επεξεργασία</span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="h-4 rounded bg-slate-100 animate-pulse" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-sm text-slate-400">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Δεν βρέθηκαν υλικά
                </td>
              </tr>
            ) : filtered.map(m => {
              const isLow = m.stock_quantity <= LOW_STOCK_THRESHOLD
              const isEditing = editId === m.id
              const isSaved = saved === m.id
              return (
                <tr key={m.id} className={isLow ? 'bg-amber-50/40' : ''}>
                  <td>
                    <div className="flex items-center gap-2">
                      {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                      <span className="font-medium text-slate-900 text-[13px]">{m.name}</span>
                    </div>
                  </td>
                  <td className="text-slate-500 text-[13px]">{m.suppliers?.name ?? '—'}</td>
                  <td className="text-right text-[13px] text-slate-600">{formatCurrency(m.cost_per_unit)}</td>
                  <td className="text-center text-[13px] text-slate-500">{m.unit}</td>
                  <td className="text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <Input
                          type="number"
                          value={editQty}
                          onChange={e => setEditQty(e.target.value)}
                          className="w-20 h-7 text-center text-sm"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveQty(m.id); if (e.key === 'Escape') setEditId(null) }}
                        />
                        <button type="button" onClick={() => saveQty(m.id)} disabled={saving}
                          className="text-emerald-600 hover:text-emerald-700">
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <button type="button" onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className={`text-[13px] font-semibold ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                        {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" /> : m.stock_quantity}
                      </span>
                    )}
                  </td>
                  <td className="text-right text-[13px] text-slate-600">
                    {formatCurrency(m.cost_per_unit * m.stock_quantity)}
                  </td>
                  <td>
                    {!isEditing && (
                      <button type="button"
                        onClick={() => { setEditId(m.id); setEditQty(String(m.stock_quantity)) }}
                        className="text-slate-400 hover:text-indigo-600 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
