'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, computeUnitPrice } from '@/lib/utils'
import type { Product } from '@/types/database'
import {
  Plus, Search, Pencil, Trash2, Package,
  Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle,
} from 'lucide-react'

// ─── CSV / Excel parser (no external deps) ───────────────────
function parseCSV(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(line => {
      const cells: string[] = []
      let cur = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') { inQuotes = !inQuotes }
        else if (ch === ',' && !inQuotes) { cells.push(cur.trim()); cur = '' }
        else { cur += ch }
      }
      cells.push(cur.trim())
      return cells
    })
}

interface CSVRow {
  name: string
  code: string
  description: string
  cost_price: number
  price_multiplier: number
  category: string
  valid: boolean
  error?: string
}

function mapCSVRows(rows: string[][]): CSVRow[] {
  if (rows.length < 2) return []
  const header = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, ''))
  return rows.slice(1).map(row => {
    const get = (key: string) => row[header.indexOf(key)]?.trim() ?? ''
    const name = get('name') || get('product_name')
    const code = get('code') || get('product_code') || get('sku')
    const cost  = parseFloat(get('cost_price') || get('cost') || '0')
    const mult  = parseFloat(get('price_multiplier') || get('multiplier') || '3')
    const error = !name ? 'Missing name' : !code ? 'Missing code' : isNaN(cost) ? 'Invalid cost' : undefined
    return {
      name, code,
      description: get('description') || get('desc') || '',
      cost_price: isNaN(cost) ? 0 : cost,
      price_multiplier: isNaN(mult) ? 3 : mult,
      category: get('category') || '',
      valid: !error,
      error,
    }
  })
}

const EMPTY: Omit<Product, 'id' | 'created_at'> = {
  name: '', code: '', description: '', photo_url: null,
  cost_price: 0, price_multiplier: 3, category: '', is_active: true,
}

export default function ProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Import modal
  const [importOpen, setImportOpen] = useState(false)
  const [importRows, setImportRows] = useState<CSVRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // ─── Edit handlers ────────────────────────────────────────
  function openCreate() { setEditing(null); setForm({ ...EMPTY }); setEditOpen(true) }
  function openEdit(p: Product) {
    setEditing(p)
    setForm({ name: p.name, code: p.code, description: p.description ?? '', photo_url: p.photo_url, cost_price: p.cost_price, price_multiplier: p.price_multiplier, category: p.category ?? '', is_active: p.is_active })
    setEditOpen(true)
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const path = `products/${Date.now()}-${file.name}`
    const { data } = await supabase.storage.from('product-photos').upload(path, file, { upsert: true })
    if (data) {
      const { data: url } = supabase.storage.from('product-photos').getPublicUrl(data.path)
      setForm(f => ({ ...f, photo_url: url.publicUrl }))
    }
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    if (editing) { await supabase.from('products').update(form).eq('id', editing.id) }
    else { await supabase.from('products').insert(form) }
    setSaving(false); setEditOpen(false); load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id); load()
  }

  // ─── CSV import handlers ──────────────────────────────────
  function readFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      setImportRows(mapCSVRows(parseCSV(text)))
      setImportDone(false)
    }
    reader.readAsText(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    readFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) readFile(file)
  }

  async function handleImport() {
    const valid = importRows.filter(r => r.valid)
    if (!valid.length) return
    setImporting(true)
    await supabase.from('products').insert(
      valid.map(r => ({
        name: r.name, code: r.code, description: r.description || null,
        cost_price: r.cost_price, price_multiplier: r.price_multiplier,
        category: r.category || null, is_active: true,
      }))
    )
    setImporting(false); setImportDone(true); load()
  }

  function closeImport() { setImportOpen(false); setImportRows([]); setImportDone(false) }

  const filtered = search
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase())
      )
    : products

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500 mt-0.5">{products.length} SKUs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Import CSV
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs mb-6">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <Input placeholder="Search by name or code…" className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Product grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="aspect-square bg-slate-100 rounded-t-xl" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-16 rounded bg-slate-100" />
                <div className="h-3 w-24 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <Package className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No products yet</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Add products manually or import from a CSV file</p>
          <Button size="sm" onClick={openCreate}><Plus className="w-3.5 h-3.5" /> Add Product</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="card overflow-hidden group hover:shadow-md transition-shadow duration-150">
              <div className="aspect-square bg-slate-50 relative">
                {p.photo_url ? (
                  <Image src={p.photo_url} alt={p.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-8 h-8 text-slate-200" />
                  </div>
                )}
                {!p.is_active && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                    Inactive
                  </span>
                )}
                {/* Actions on hover */}
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all duration-150 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button type="button" aria-label="Edit product" onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg bg-white shadow flex items-center justify-center text-slate-700 hover:text-indigo-600">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" aria-label="Delete product" onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-lg bg-white shadow flex items-center justify-center text-slate-700 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="font-mono text-[10px] text-slate-400 mb-0.5">{p.code}</p>
                <p className="text-[13px] font-medium text-slate-900 truncate">{p.name}</p>
                {p.category && <p className="text-[11px] text-slate-400 mt-0.5">{p.category}</p>}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Cost: {formatCurrency(p.cost_price)}</span>
                  <span className="text-[13px] font-semibold text-indigo-600">
                    {formatCurrency(computeUnitPrice(p.cost_price, p.price_multiplier))}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Edit / Create modal ─────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Product Name *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Wooden Ornament" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">SKU / Code *</label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. WO-001" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="product-description">Description</label>
              <textarea
                id="product-description"
                title="Product description"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.description ?? ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Cost (€)</label>
                <Input type="number" step="0.01" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Multiplier</label>
                <Input type="number" step="0.1" value={form.price_multiplier} onChange={e => setForm(f => ({ ...f, price_multiplier: +e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Sale Price</label>
                <div className="h-9 flex items-center px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-indigo-600">
                  {formatCurrency(computeUnitPrice(form.cost_price, form.price_multiplier))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Category</label>
                <Input value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Christmas Decor" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="product-photo">Photo</label>
                <input id="product-photo" type="file" accept="image/*" title="Upload product photo" onChange={handlePhoto} disabled={uploading}
                  className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-xs file:cursor-pointer" />
              </div>
            </div>
            {form.photo_url && (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                <Image src={form.photo_url} alt="Preview" fill className="object-cover" />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.name || !form.code}>
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── CSV Import modal ────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={closeImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              Import Products from CSV
            </DialogTitle>
          </DialogHeader>

          {importDone ? (
            <div className="py-10 flex flex-col items-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="font-semibold text-slate-900">
                {importRows.filter(r => r.valid).length} products imported
              </p>
              <p className="text-sm text-slate-500">Products are now available in the catalog.</p>
              <Button onClick={closeImport}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              {/* Drop zone */}
              {/* Hidden file input lives outside any interactive parent */}
              <input ref={fileRef} type="file" accept=".csv,.txt" title="Upload CSV file" className="hidden" onChange={handleFileInput} />

              {importRows.length === 0 && (
                <div>
                  <div
                    className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
                    aria-label="Click or drag to upload CSV file"
                  >
                    <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-600">Drop your CSV file here</p>
                    <p className="text-xs text-slate-400 mt-1">or click to browse</p>
                  </div>
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs font-semibold text-slate-600 mb-1">Required CSV columns:</p>
                    <p className="text-xs text-slate-500 font-mono">name, code, cost_price</p>
                    <p className="text-xs font-semibold text-slate-600 mt-2 mb-1">Optional columns:</p>
                    <p className="text-xs text-slate-500 font-mono">description, price_multiplier, category</p>
                    <a
                      href="data:text/csv;charset=utf-8,name,code,description,cost_price,price_multiplier,category%0AExample Product,EX-001,A sample product,10.00,3,Category A"
                      download="products-template.csv"
                      className="inline-block mt-2 text-xs text-indigo-600 hover:underline font-medium"
                      onClick={e => e.stopPropagation()}
                    >
                      Download template
                    </a>
                  </div>
                </div>
              )}

              {/* Preview table */}
              {importRows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-700">
                      Preview: {importRows.filter(r => r.valid).length} valid,{' '}
                      <span className="text-red-500">{importRows.filter(r => !r.valid).length} errors</span>
                    </p>
                    <button type="button" onClick={() => setImportRows([])} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                      <X className="w-3 h-3" /> Clear
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th><span className="sr-only">Status</span></th>
                          <th>Name</th>
                          <th>Code</th>
                          <th>Cost</th>
                          <th>Sale</th>
                          <th>Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.map((row, i) => (
                          <tr key={i} className={!row.valid ? 'bg-red-50' : ''}>
                            <td className="w-8">
                              {row.valid
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                : (
                                  <span title={row.error}>
                                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                  </span>
                                )
                              }
                            </td>
                            <td className="text-[13px]">{row.name || <span className="text-red-400 italic">missing</span>}</td>
                            <td className="font-mono text-[12px] text-slate-500">{row.code || <span className="text-red-400 italic">missing</span>}</td>
                            <td className="text-[13px]">{formatCurrency(row.cost_price)}</td>
                            <td className="text-[13px] font-medium text-indigo-600">{formatCurrency(computeUnitPrice(row.cost_price, row.price_multiplier))}</td>
                            <td className="text-[12px] text-slate-500">{row.category || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setImportRows([])}>Back</Button>
                    <Button
                      onClick={handleImport}
                      disabled={importing || importRows.filter(r => r.valid).length === 0}
                    >
                      {importing ? 'Importing…' : `Import ${importRows.filter(r => r.valid).length} Products`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
