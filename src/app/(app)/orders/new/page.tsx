'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency, computeUnitPrice } from '@/lib/utils'
import { L } from '@/lib/labels'
import type { Customer, Product } from '@/types/database'
import { ArrowLeft, Plus, Trash2, Search, ChevronDown, Loader2 } from 'lucide-react'

interface LineItem {
  product: Product
  quantity: number
  unit_price: number
  line_total: number
}

export default function NewOrderPage() {
  const router = useRouter()
  const supabase = createClient()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerList, setShowCustomerList] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [showProductList, setShowProductList] = useState(false)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [depositRate, setDepositRate] = useState(50)

  useEffect(() => {
    Promise.all([
      supabase.from('customers').select('*').order('business_name'),
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('company_settings').select('deposit_rate').limit(1).single(),
    ]).then(([c, p, s]) => {
      setCustomers(c.data ?? [])
      setProducts(p.data ?? [])
      if (s.data?.deposit_rate) setDepositRate(s.data.deposit_rate)
    })
  }, [supabase])

  const filteredCustomers = customerSearch
    ? customers.filter(c =>
        c.business_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(customerSearch.toLowerCase())
      )
    : customers.slice(0, 8)

  const filteredProducts = productSearch
    ? products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.code.toLowerCase().includes(productSearch.toLowerCase())
      )
    : products.slice(0, 6)

  function addProduct(product: Product) {
    const unit_price = computeUnitPrice(product.cost_price, product.price_multiplier)
    setLineItems(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i => i.product.id === product.id
          ? { ...i, quantity: i.quantity + 1, line_total: (i.quantity + 1) * i.unit_price }
          : i)
      }
      return [...prev, { product, quantity: 1, unit_price, line_total: unit_price }]
    })
    setProductSearch('')
    setShowProductList(false)
  }

  function updateQty(productId: string, qty: number) {
    if (qty <= 0) {
      setLineItems(prev => prev.filter(i => i.product.id !== productId))
    } else {
      setLineItems(prev => prev.map(i =>
        i.product.id === productId
          ? { ...i, quantity: qty, line_total: qty * i.unit_price }
          : i
      ))
    }
  }

  function updatePrice(productId: string, price: number) {
    setLineItems(prev => prev.map(i =>
      i.product.id === productId
        ? { ...i, unit_price: price, line_total: i.quantity * price }
        : i
    ))
  }

  const total = lineItems.reduce((s, i) => s + i.line_total, 0)
  const deposit = total * (depositRate / 100)

  async function handleSave() {
    if (!selectedCustomer || lineItems.length === 0) return
    setSaving(true)
    const { data: orderData } = await supabase
      .from('orders')
      .insert({ customer_id: selectedCustomer.id, total_price: total, notes: notes || null })
      .select('id, order_number')
      .single()

    if (orderData) {
      await supabase.from('order_items').insert(
        lineItems.map(i => ({
          order_id: orderData.id,
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_total: i.line_total,
        }))
      )
      router.push(`/orders/${orderData.id}`)
    }
    setSaving(false)
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
        <h1 className="text-xl font-semibold text-slate-900">{L.newOrder}</h1>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Left: customer + products */}
        <div className="col-span-3 space-y-5">

          {/* Customer selector */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Επιλογή Πελάτη</h2>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <div>
                  <p className="font-semibold text-indigo-900 text-sm">{selectedCustomer.business_name}</p>
                  <p className="text-xs text-indigo-600">{selectedCustomer.email} · {selectedCustomer.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs text-indigo-500 hover:text-indigo-700"
                >
                  {L.cancel}
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Αναζήτηση πελάτη…"
                  className="pl-8 text-sm"
                  value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setShowCustomerList(true) }}
                  onFocus={() => setShowCustomerList(true)}
                />
                {showCustomerList && (
                  <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0"
                        onClick={() => { setSelectedCustomer(c); setShowCustomerList(false); setCustomerSearch('') }}
                      >
                        <span className="font-medium text-slate-900">{c.business_name}</span>
                        <span className="text-slate-400 text-xs ml-2">{c.email}</span>
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <p className="px-4 py-3 text-sm text-slate-400">{L.noData}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Line items */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Γραμμές Παραγγελίας</h2>
            </div>

            {/* Product search / add */}
            <div className="px-5 py-3 border-b border-slate-100 relative">
              <div className="relative">
                <Plus className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Αναζήτηση και προσθήκη προϊόντος…"
                  className="pl-8 text-sm"
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setShowProductList(true) }}
                  onFocus={() => setShowProductList(true)}
                />
              </div>
              {showProductList && (
                <div className="absolute z-20 left-5 right-5 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm flex items-center justify-between border-b border-slate-100 last:border-0"
                      onClick={() => addProduct(p)}
                    >
                      <div>
                        <span className="font-mono text-xs text-slate-400 mr-2">{p.code}</span>
                        <span className="font-medium text-slate-900">{p.name}</span>
                      </div>
                      <span className="font-semibold text-indigo-600 text-sm">
                        {formatCurrency(computeUnitPrice(p.cost_price, p.price_multiplier))}
                      </span>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <p className="px-4 py-3 text-sm text-slate-400">{L.noData}</p>
                  )}
                </div>
              )}
            </div>

            {/* Items table */}
            {lineItems.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">{L.noItems}</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{L.productCode}</th>
                    <th>Προϊόν</th>
                    <th className="text-center">{L.quantity}</th>
                    <th className="text-right">{L.unitPrice}</th>
                    <th className="text-right">{L.lineTotal}</th>
                    <th><span className="sr-only">Διαγραφή</span></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map(item => (
                    <tr key={item.product.id}>
                      <td className="font-mono text-xs text-slate-400">{item.product.code}</td>
                      <td className="font-medium text-slate-900 text-[13px]">{item.product.name}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => updateQty(item.product.id, +e.target.value)}
                          title="Ποσότητα"
                          className="w-16 text-center border border-slate-200 rounded-md h-7 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mx-auto block"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={e => updatePrice(item.product.id, +e.target.value)}
                          title="Τιμή μονάδος"
                          className="w-24 text-right border border-slate-200 rounded-md h-7 text-sm px-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 ml-auto block"
                        />
                      </td>
                      <td className="text-right font-semibold text-slate-900">
                        {formatCurrency(item.line_total)}
                      </td>
                      <td>
                        <button
                          type="button"
                          aria-label="Διαγραφή γραμμής"
                          onClick={() => updateQty(item.product.id, 0)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Notes */}
            <div className="px-5 py-4 border-t border-slate-100">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block" htmlFor="order-notes">
                {L.notes}
              </label>
              <textarea
                id="order-notes"
                title="Σημειώσεις παραγγελίας"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ειδικές οδηγίες, σχόλια…"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Right: totals + actions */}
        <div className="col-span-2">
          <div className="card p-5 sticky top-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Σύνοψη</h2>

            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-500">Γραμμές</span>
                <span className="font-medium">{lineItems.length}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-500">Τεμάχια</span>
                <span className="font-medium">{lineItems.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between">
                <span className="font-semibold text-slate-900">Σύνολο</span>
                <span className="font-bold text-xl text-slate-900">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-indigo-600 font-medium">Προκαταβολή ({depositRate}%)</span>
                <span className="font-semibold text-indigo-700">{formatCurrency(deposit)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-500">Υπόλοιπο</span>
                <span className="font-medium text-slate-700">{formatCurrency(total - deposit)}</span>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={saving || !selectedCustomer || lineItems.length === 0}
            >
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {L.loading}</> : L.saveOrder}
            </Button>
            {(!selectedCustomer || lineItems.length === 0) && (
              <p className="text-xs text-slate-400 text-center mt-2">
                {!selectedCustomer ? 'Επιλέξτε πελάτη' : 'Προσθέστε τουλάχιστον 1 προϊόν'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
