// Syncs offline order queue to Supabase when connection is restored
import { createClient } from '@/lib/supabase/client'
import { getPendingOrders, markOrderSynced, clearSyncedOrders } from './offline-store'

export interface SyncResult {
  synced: number
  failed: number
  errors: string[]
}

export async function syncPendingOrders(): Promise<SyncResult> {
  const supabase = createClient()
  const pending = getPendingOrders()
  const result: SyncResult = { synced: 0, failed: 0, errors: [] }

  for (const order of pending) {
    try {
      // 1. Upsert customer
      let customerId: string

      if (order.customer.id) {
        customerId = order.customer.id
      } else {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('email', order.customer.email)
          .maybeSingle()

        if (existing) {
          customerId = existing.id
        } else {
          const { data: newCust, error } = await supabase
            .from('customers')
            .insert({
              business_name: order.customer.business_name,
              contact_name: order.customer.contact_name,
              phone: order.customer.phone,
              email: order.customer.email,
              vat_number: order.customer.vat_number ?? null,
              address: order.customer.address ?? null,
              notes: order.customer.notes ?? null,
            })
            .select('id')
            .single()

          if (error || !newCust) throw new Error(`Customer insert failed: ${error?.message}`)
          customerId = newCust.id
        }
      }

      // 2. Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          total_price: order.total,
          notes: order.notes ?? null,
        })
        .select('id, order_number')
        .single()

      if (orderError || !orderData) throw new Error(`Order insert failed: ${orderError?.message}`)

      // 3. Insert order items
      await supabase.from('order_items').insert(
        order.items.map(i => ({
          order_id: orderData.id,
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_total: i.line_total,
        }))
      )

      markOrderSynced(order.id, orderData.order_number)
      result.synced++
    } catch (e) {
      result.failed++
      result.errors.push(e instanceof Error ? e.message : String(e))
    }
  }

  if (result.synced > 0) clearSyncedOrders()
  return result
}
