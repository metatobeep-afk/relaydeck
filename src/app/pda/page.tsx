'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { computeUnitPrice, formatCurrency } from '@/lib/utils'
import { L } from '@/lib/labels'
import {
  cacheProducts, getCachedProducts, getCachedAt,
  cacheCustomers, getCachedCustomers,
  enqueueOrder, getPendingOrders,
} from '@/lib/offline-store'
import type { Product, Customer } from '@/types/database'
import {
  ShoppingCart, Search, Plus, Minus, Trash2, ChevronRight,
  Package, CheckCircle2, ArrowLeft, LayoutGrid, List,
  Users, X, ScanLine, CloudOff,
} from 'lucide-react'

// ─── BarcodeDetector type shim ────────────────────────────────
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect(src: ImageBitmapSource): Promise<{ rawValue: string; format: string }[]>
    }
  }
}

type Step = 'catalog' | 'cart' | 'customer' | 'confirm'
type CartItem = { product: Product; quantity: number; unit_price: number; line_total: number }
const EMPTY_CUSTOMER = { business_name: '', contact_name: '', phone: '', email: '', vat_number: '', address: '', notes: '' }

export default function PdaPage() {
  const supabase = createClient()

  // Data
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [cachedAt, setCachedAt] = useState<string | null>(null)

  // UI state
  const [step, setStep] = useState<Step>('catalog')
  const [catFilter, setCatFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderNumber, setOrderNumber] = useState('')
  const [saving, setSaving] = useState(false)

  // Customer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [newCustomer, setNewCustomer] = useState({ ...EMPTY_CUSTOMER })
  const [useNewCustomer, setUseNewCustomer] = useState(false)

  // Barcode scanner
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<InstanceType<NonNullable<typeof window.BarcodeDetector>> | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    setPendingCount(getPendingOrders().length)
    setCachedAt(getCachedAt())

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load from cache immediately for instant render
    const cached = getCachedProducts()
    const cachedCusts = getCachedCustomers()
    if (cached.length > 0) {
      setProducts(cached)
      setCategories([...new Set(cached.map(p => p.category).filter(Boolean))] as string[])
      setCustomers(cachedCusts)
      setLoading(false)
    }

    // Then fetch fresh data from network
    Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('customers').select('*').order('business_name'),
    ]).then(([pRes, cRes]) => {
      if (pRes.data && pRes.data.length > 0) {
        setProducts(pRes.data)
        setCategories([...new Set(pRes.data.map((p: Product) => p.category).filter(Boolean))] as string[])
        cacheProducts(pRes.data)
        setCachedAt(getCachedAt())
      }
      if (cRes.data) {
        setCustomers(cRes.data)
        cacheCustomers(cRes.data)
      }
      setLoading(false)
    }).catch(() => {
      // Network failed — already showing cached data
      setLoading(false)
    })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [supabase])

  // ─── Cart helpers ─────────────────────────────────────────
  function addToCart(product: Product, qty = 1) {
    const unit_price = computeUnitPrice(product.cost_price, product.price_multiplier)
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id)
      if (ex) return prev.map(i => i.product.id === product.id
        ? { ...i, quantity: i.quantity + qty, line_total: (i.quantity + qty) * unit_price }
        : i)
      return [...prev, { product, quantity: qty, unit_price, line_total: qty * unit_price }]
    })
  }

  function updateQty(productId: string, qty: number) {
    if (qty <= 0) setCart(prev => prev.filter(i => i.product.id !== productId))
    else setCart(prev => prev.map(i => i.product.id === productId
      ? { ...i, quantity: qty, line_total: qty * i.unit_price } : i))
  }

  const cartTotal = cart.reduce((s, i) => s + i.line_total, 0)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  // ─── Barcode scanner ──────────────────────────────────────
  const startScanner = useCallback(async () => {
    setScannerError('')
    if (!window.BarcodeDetector) { setScannerError('Ο browser δεν υποστηρίζει BarcodeDetector. Χρησιμοποιήστε Chrome/Edge.'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } } })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      detectorRef.current = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'] })
      setScannerOpen(true)
      scanLoop()
    } catch {
      setScannerError('Δεν επιτράπηκε πρόσβαση στην κάμερα.')
    }
  }, [])

  const scanLoop = useCallback(() => {
    const detect = async () => {
      if (!videoRef.current || !detectorRef.current || !streamRef.current) return
      if (videoRef.current.readyState >= 2) {
        try {
          const results = await detectorRef.current.detect(videoRef.current)
          if (results.length > 0) {
            const code = results[0].rawValue
            stopScanner()
            const matched = products.find(p => p.code === code || p.code === code.replace(/^0+/, ''))
            if (matched) addToCart(matched)
            else setScannerError(`Κωδικός "${code}" δεν βρέθηκε στον κατάλογο.`)
            return
          }
        } catch {}
      }
      rafRef.current = requestAnimationFrame(detect)
    }
    rafRef.current = requestAnimationFrame(detect)
  }, [products])

  function stopScanner() {
    setScannerOpen(false)
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
  }

  useEffect(() => () => stopScanner(), [])

  // ─── Submit order (online + offline) ─────────────────────
  async function handleSubmit() {
    setSaving(true)
    const customer = {
      id: selectedCustomer?.id,
      business_name: selectedCustomer?.business_name ?? newCustomer.business_name,
      contact_name:  selectedCustomer?.contact_name  ?? newCustomer.contact_name,
      phone:         selectedCustomer?.phone         ?? newCustomer.phone,
      email:         selectedCustomer?.email         ?? newCustomer.email,
      vat_number:    selectedCustomer?.vat_number    ?? newCustomer.vat_number  ?? undefined,
      address:       selectedCustomer?.address       ?? newCustomer.address     ?? undefined,
      notes:         selectedCustomer?.notes         ?? newCustomer.notes       ?? undefined,
    }

    if (!navigator.onLine) {
      // ── OFFLINE: queue locally ──────────────────────────
      const queued = enqueueOrder({
        customer,
        items: cart.map(i => ({
          product_id: i.product.id,
          product_code: i.product.code,
          product_name: i.product.name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_total: i.line_total,
        })),
        total: cartTotal,
        notes: newCustomer.notes || undefined,
      })
      setOrderNumber(`LOCAL-${queued.id.slice(0, 8).toUpperCase()}`)
      setPendingCount(getPendingOrders().length)
      setSaving(false)
      setStep('confirm')
      return
    }

    // ── ONLINE: save to Supabase ────────────────────────
    try {
      let customerId: string
      if (selectedCustomer) {
        customerId = selectedCustomer.id
      } else {
        const { data } = await supabase.from('customers').insert(newCustomer).select('id').single()
        customerId = data!.id
      }
      const { data: orderData } = await supabase
        .from('orders')
        .insert({ customer_id: customerId, total_price: cartTotal, notes: newCustomer.notes || null })
        .select('id, order_number')
        .single()
      if (orderData) {
        await supabase.from('order_items').insert(cart.map(i => ({
          order_id: orderData.id, product_id: i.product.id,
          quantity: i.quantity, unit_price: i.unit_price, line_total: i.line_total,
        })))
        setOrderNumber(orderData.order_number)
      }
    } catch {
      // Network error mid-submit — queue it
      enqueueOrder({
        customer,
        items: cart.map(i => ({
          product_id: i.product.id, product_code: i.product.code,
          product_name: i.product.name, quantity: i.quantity,
          unit_price: i.unit_price, line_total: i.line_total,
        })),
        total: cartTotal,
      })
      setOrderNumber('LOCAL-QUEUED')
      setPendingCount(getPendingOrders().length)
    }
    setSaving(false)
    setStep('confirm')
  }

  function reset() {
    setCart([]); setSelectedCustomer(null); setNewCustomer({ ...EMPTY_CUSTOMER })
    setUseNewCustomer(false); setStep('catalog'); setOrderNumber(''); setScannerError('')
  }

  const filtered = products.filter(p => {
    const okCat = catFilter === 'all' || p.category === catFilter
    const okSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())
    return okCat && okSearch
  })

  const filteredCustomers = customers.filter(c =>
    c.business_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(customerSearch.toLowerCase())
  )

  // ─── SCANNER OVERLAY ──────────────────────────────────────
  const ScannerOverlay = (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black">
        <span className="text-white font-semibold text-sm">{L.scanBarcode}</span>
        <button type="button" aria-label="Κλείσιμο κάμερας" onClick={stopScanner}>
          <X className="w-6 h-6 text-white" />
        </button>
      </div>
      <div className="relative flex-1">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        {/* Scan frame */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-40 border-2 border-white/60 rounded-lg relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-500 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-orange-500 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-orange-500 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-orange-500 rounded-br-lg" />
            <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-orange-500/70 -translate-y-1/2 animate-pulse" />
          </div>
        </div>
        {scannerError && (
          <div className="absolute bottom-8 left-4 right-4 bg-red-600 text-white text-sm rounded-lg p-3 text-center">
            {scannerError}
          </div>
        )}
      </div>
      <p className="text-white/60 text-xs text-center py-3">Στρέψτε την κάμερα στο barcode του προϊόντος</p>
    </div>
  )

  // ─── CATALOG ──────────────────────────────────────────────
  if (step === 'catalog') return (
    <div className="flex flex-col h-screen bg-slate-100">
      {scannerOpen && ScannerOverlay}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-2">
        <span className="font-bold text-slate-900">RelayDeck</span>
        <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">PDA</span>
        {!isOnline && (
          <span className="flex items-center gap-1 text-xs bg-slate-800 text-white px-2 py-0.5 rounded-full">
            <CloudOff className="w-3 h-3" /> Offline
          </span>
        )}
        {pendingCount > 0 && isOnline && (
          <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            {pendingCount} σε αναμονή
          </span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          title={L.scanBarcode}
          onClick={startScanner}
          className="p-2 rounded-lg text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition-colors"
        >
          <ScanLine className="w-5 h-5" />
        </button>
        <button
          type="button"
          title="Εναλλαγή προβολής"
          onClick={() => setViewMode(m => m === 'grid' ? 'list' : 'grid')}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
        >
          {viewMode === 'grid' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
        </button>
        <button
          type="button"
          onClick={() => setStep('cart')}
          className="relative bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium"
        >
          <ShoppingCart className="w-4 h-4" />
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {cartCount}
            </span>
          )}
          {formatCurrency(cartTotal)}
        </button>
      </div>

      {/* Search + scanner error */}
      <div className="bg-white px-4 pb-3 border-b border-slate-100">
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            title={L.searchOrScan}
            placeholder={L.searchOrScan}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {scannerError && !scannerOpen && (
          <p className="text-xs text-red-500 mt-1.5">{scannerError}</p>
        )}
      </div>

      {/* Categories */}
      <div className="bg-white px-4 pb-2.5 flex gap-2 overflow-x-auto border-b border-slate-100">
        {['all', ...categories].map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setCatFilter(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap mt-2 transition-colors ${catFilter === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {cat === 'all' ? 'Όλα' : cat}
          </button>
        ))}
      </div>

      {/* Products */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-44 rounded-xl bg-slate-200 animate-pulse" />)}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(p => {
              const inCart = cart.find(i => i.product.id === p.id)
              return (
                <div key={p.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="aspect-square bg-slate-50 relative">
                    {p.photo_url
                      ? <Image src={p.photo_url} alt={p.name} fill className="object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-slate-200" /></div>}
                  </div>
                  <div className="p-2.5">
                    <p className="font-mono text-[10px] text-slate-400">{p.code}</p>
                    <p className="text-[13px] font-medium text-slate-900 leading-tight">{p.name}</p>
                    <p className="font-bold text-indigo-600 mt-1">{formatCurrency(computeUnitPrice(p.cost_price, p.price_multiplier))}</p>
                    {inCart ? (
                      <div className="flex items-center gap-1.5 mt-2">
                        <button type="button" aria-label="Μείωση" onClick={() => updateQty(p.id, inCart.quantity - 1)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                        <span className="font-bold text-slate-900 w-6 text-center text-sm">{inCart.quantity}</span>
                        <button type="button" aria-label="Αύξηση" onClick={() => updateQty(p.id, inCart.quantity + 1)} className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => addToCart(p)} className="mt-2 w-full bg-indigo-600 text-white text-xs py-1.5 rounded-lg font-medium">
                        Προσθήκη
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => {
              const inCart = cart.find(i => i.product.id === p.id)
              return (
                <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
                  <div className="w-14 h-14 bg-slate-50 rounded-lg overflow-hidden relative flex-shrink-0">
                    {p.photo_url
                      ? <Image src={p.photo_url} alt={p.name} fill className="object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-slate-200" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] text-slate-400">{p.code}</p>
                    <p className="text-[13px] font-semibold text-slate-900 truncate">{p.name}</p>
                    <p className="font-bold text-indigo-600 text-sm">{formatCurrency(computeUnitPrice(p.cost_price, p.price_multiplier))}</p>
                  </div>
                  {inCart ? (
                    <div className="flex items-center gap-2">
                      <button type="button" aria-label="Μείωση" onClick={() => updateQty(p.id, inCart.quantity - 1)} className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="font-bold text-slate-900 w-6 text-center">{inCart.quantity}</span>
                      <button type="button" aria-label="Αύξηση" onClick={() => updateQty(p.id, inCart.quantity + 1)} className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <button type="button" aria-label="Προσθήκη στο καλάθι" onClick={() => addToCart(p)} className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="bg-white border-t border-slate-200 px-4 py-3">
          <button type="button" onClick={() => setStep('cart')} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold flex items-center justify-between px-4">
            <span>{cartCount} τεμάχια</span>
            <span className="flex items-center gap-1">Επισκόπηση <ChevronRight className="w-4 h-4" /></span>
            <span>{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}
    </div>
  )

  // ─── CART ─────────────────────────────────────────────────
  if (step === 'cart') return (
    <div className="flex flex-col h-screen bg-slate-100">
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button type="button" aria-label={L.back} onClick={() => setStep('catalog')} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><ArrowLeft className="w-5 h-5" /></button>
        <span className="font-bold text-slate-900">{L.cart}</span>
        <span className="text-sm text-slate-400">{cartCount} τεμ.</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {cart.map(item => (
          <div key={item.product.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            {item.product.photo_url && (
              <div className="w-12 h-12 rounded-lg overflow-hidden relative flex-shrink-0">
                <Image src={item.product.photo_url} alt={item.product.name} fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 text-sm truncate">{item.product.name}</p>
              <p className="text-xs text-slate-400 font-mono">{item.product.code}</p>
              <p className="text-xs text-slate-500">{formatCurrency(item.unit_price)} / τεμ.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Μείωση" onClick={() => updateQty(item.product.id, item.quantity - 1)} className="w-8 h-8 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
              <span className="font-bold text-slate-900 w-8 text-center">{item.quantity}</span>
              <button type="button" aria-label="Αύξηση" onClick={() => updateQty(item.product.id, item.quantity + 1)} className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
            </div>
            <div className="w-20 text-right font-bold text-indigo-700">{formatCurrency(item.line_total)}</div>
            <button type="button" aria-label="Αφαίρεση" onClick={() => updateQty(item.product.id, 0)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <div className="bg-white border-t border-slate-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold text-slate-700">Σύνολο</span>
          <span className="text-2xl font-bold text-indigo-700">{formatCurrency(cartTotal)}</span>
        </div>
        <button type="button" onClick={() => setStep('customer')} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
          {L.selectCustomer} <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )

  // ─── CUSTOMER STEP ─────────────────────────────────────────
  if (step === 'customer') return (
    <div className="flex flex-col h-screen bg-slate-100">
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button type="button" aria-label={L.back} onClick={() => setStep('cart')} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><ArrowLeft className="w-5 h-5" /></button>
        <span className="font-bold text-slate-900">{L.selectCustomer}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Existing customer */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" /> Υπάρχων Πελάτης
          </p>
          {selectedCustomer ? (
            <div className="flex items-center justify-between p-2.5 bg-indigo-50 rounded-lg">
              <div>
                <p className="font-semibold text-indigo-900 text-sm">{selectedCustomer.business_name}</p>
                <p className="text-xs text-indigo-600">{selectedCustomer.email}</p>
              </div>
              <button type="button" onClick={() => setSelectedCustomer(null)} className="text-xs text-indigo-500">✕</button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                title={L.searchCustomer}
                placeholder={L.searchCustomer}
                className="w-full pl-9 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
              />
              {customerSearch && (
                <div className="mt-1 border border-slate-200 rounded-lg overflow-hidden bg-white max-h-48 overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0"
                      onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setUseNewCustomer(false) }}
                    >
                      <span className="font-medium text-slate-900">{c.business_name}</span>
                      <span className="text-xs text-slate-400 ml-2">{c.phone}</span>
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">{L.noData}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* New customer form */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <button
            type="button"
            onClick={() => { setUseNewCustomer(!useNewCustomer); setSelectedCustomer(null) }}
            className={`w-full text-left text-sm font-semibold flex items-center justify-between ${useNewCustomer ? 'text-indigo-700' : 'text-slate-700'}`}
          >
            <span>Νέος Πελάτης</span>
            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${useNewCustomer ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
              {useNewCustomer && <span className="w-2 h-2 rounded-full bg-white" />}
            </span>
          </button>
          {useNewCustomer && (
            <div className="mt-3 space-y-2.5">
              {[
                { label: L.businessName, key: 'business_name', placeholder: 'Επωνυμία Εταιρείας', required: true },
                { label: L.contactName,  key: 'contact_name',  placeholder: 'Υπεύθυνος',  required: true },
                { label: L.phone,        key: 'phone',         placeholder: '+30 69...',   required: true },
                { label: L.email,        key: 'email',         placeholder: 'email@...',   required: true },
                { label: L.afm,          key: 'vat_number',    placeholder: 'ΑΦΜ',         required: false },
                { label: L.address,      key: 'address',       placeholder: 'Διεύθυνση',   required: false },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-slate-600 block mb-1" htmlFor={`nc-${key}`}>{label}</label>
                  <input
                    id={`nc-${key}`}
                    type="text"
                    title={label}
                    placeholder={placeholder}
                    value={newCustomer[key as keyof typeof newCustomer]}
                    onChange={e => setNewCustomer(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 h-10"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-t border-slate-200 p-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || (!selectedCustomer && (!useNewCustomer || !newCustomer.business_name || !newCustomer.email))}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? '...' : L.submit}
        </button>
      </div>
    </div>
  )

  // ─── CONFIRM ──────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-100 p-8 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">{L.orderSuccess}</h1>
      <p className="text-slate-500 mb-1 text-sm">Αριθμός παραγγελίας</p>
      <p className="text-3xl font-mono font-bold text-indigo-700 mb-8">{orderNumber}</p>
      <button type="button" onClick={reset} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold">
        {L.newSale}
      </button>
    </div>
  )
}
