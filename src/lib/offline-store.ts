// Offline-first store: product cache + order queue
// Uses localStorage so data survives page refresh with no internet
import type { Product, Customer } from '@/types/database'

const KEYS = {
  products:  'rd_products_cache',
  customers: 'rd_customers_cache',
  queue:     'rd_order_queue',
  syncedAt:  'rd_synced_at',
} as const

export interface QueuedOrder {
  id: string              // local temp ID (UUID v4)
  createdAt: string
  customer: {
    id?: string           // set if existing customer
    business_name: string
    contact_name: string
    phone: string
    email: string
    vat_number?: string
    address?: string
    notes?: string
  }
  items: {
    product_id: string
    product_code: string
    product_name: string
    quantity: number
    unit_price: number
    line_total: number
  }[]
  total: number
  notes?: string
  synced: boolean
}

// ─── Products ─────────────────────────────────────────────────
export function cacheProducts(products: Product[]) {
  try {
    localStorage.setItem(KEYS.products, JSON.stringify(products))
    localStorage.setItem(KEYS.syncedAt, new Date().toISOString())
  } catch {}
}

export function getCachedProducts(): Product[] {
  try {
    const raw = localStorage.getItem(KEYS.products)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function getCachedAt(): string | null {
  return localStorage.getItem(KEYS.syncedAt)
}

// ─── Customers ────────────────────────────────────────────────
export function cacheCustomers(customers: Customer[]) {
  try {
    localStorage.setItem(KEYS.customers, JSON.stringify(customers))
  } catch {}
}

export function getCachedCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(KEYS.customers)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

// ─── Order queue ──────────────────────────────────────────────
export function getOrderQueue(): QueuedOrder[] {
  try {
    const raw = localStorage.getItem(KEYS.queue)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function enqueueOrder(order: Omit<QueuedOrder, 'id' | 'createdAt' | 'synced'>): QueuedOrder {
  const queued: QueuedOrder = {
    ...order,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    synced: false,
  }
  const queue = getOrderQueue()
  queue.push(queued)
  localStorage.setItem(KEYS.queue, JSON.stringify(queue))
  return queued
}

export function markOrderSynced(localId: string, orderNumber: string) {
  const queue = getOrderQueue().map(o =>
    o.id === localId ? { ...o, synced: true, orderNumber } : o
  )
  localStorage.setItem(KEYS.queue, JSON.stringify(queue))
}

export function getPendingOrders(): QueuedOrder[] {
  return getOrderQueue().filter(o => !o.synced)
}

export function clearSyncedOrders() {
  const pending = getPendingOrders()
  localStorage.setItem(KEYS.queue, JSON.stringify(pending))
}
