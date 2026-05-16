export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type PaymentStatus = 'pending_deposit' | 'deposit_received' | 'paid' | 'cancelled'
export type ProductionStatus = 'to_prepare' | 'in_progress' | 'quality_check' | 'ready_packaging' | 'ready_ship' | 'completed'
export type ShippingStatus = 'pending' | 'shipped' | 'delivered'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; role: 'admin' | 'salesperson'; created_at: string }
        Insert: { id: string; full_name?: string | null; role?: 'admin' | 'salesperson'; created_at?: string }
        Update: { full_name?: string | null; role?: 'admin' | 'salesperson' }
      }
      products: {
        Row: {
          id: string; name: string; code: string; description: string | null
          photo_url: string | null; cost_price: number; price_multiplier: number
          category: string | null; is_active: boolean; created_at: string
        }
        Insert: {
          id?: string; name: string; code: string; description?: string | null
          photo_url?: string | null; cost_price: number; price_multiplier?: number
          category?: string | null; is_active?: boolean; created_at?: string
        }
        Update: {
          name?: string; code?: string; description?: string | null
          photo_url?: string | null; cost_price?: number; price_multiplier?: number
          category?: string | null; is_active?: boolean
        }
      }
      customers: {
        Row: {
          id: string; business_name: string; contact_name: string
          phone: string; email: string; vat_number: string | null
          address: string | null; tags: string[] | null; notes: string | null; created_at: string
        }
        Insert: {
          id?: string; business_name: string; contact_name: string
          phone: string; email: string; vat_number?: string | null
          address?: string | null; tags?: string[] | null; notes?: string | null; created_at?: string
        }
        Update: {
          business_name?: string; contact_name?: string; phone?: string
          email?: string; vat_number?: string | null; address?: string | null
          tags?: string[] | null; notes?: string | null
        }
      }
      orders: {
        Row: {
          id: string; order_number: string; customer_id: string
          salesperson_id: string | null; total_price: number
          payment_status: PaymentStatus; production_status: ProductionStatus
          shipping_status: ShippingStatus; notes: string | null; created_at: string
        }
        Insert: {
          id?: string; order_number?: string; customer_id: string
          salesperson_id?: string | null; total_price: number
          payment_status?: PaymentStatus; production_status?: ProductionStatus
          shipping_status?: ShippingStatus; notes?: string | null; created_at?: string
        }
        Update: {
          payment_status?: PaymentStatus; production_status?: ProductionStatus
          shipping_status?: ShippingStatus; notes?: string | null; total_price?: number
        }
      }
      order_items: {
        Row: { id: string; order_id: string; product_id: string; quantity: number; unit_price: number; line_total: number }
        Insert: { id?: string; order_id: string; product_id: string; quantity: number; unit_price: number; line_total: number }
        Update: { quantity?: number; unit_price?: number; line_total?: number }
      }
      suppliers: {
        Row: { id: string; name: string; contact_name: string | null; phone: string | null; email: string | null; address: string | null; created_at: string }
        Insert: { id?: string; name: string; contact_name?: string | null; phone?: string | null; email?: string | null; address?: string | null; created_at?: string }
        Update: { name?: string; contact_name?: string | null; phone?: string | null; email?: string | null; address?: string | null }
      }
      materials: {
        Row: { id: string; name: string; unit: string; cost_per_unit: number; stock_quantity: number; supplier_id: string | null; created_at: string }
        Insert: { id?: string; name: string; unit: string; cost_per_unit?: number; stock_quantity?: number; supplier_id?: string | null; created_at?: string }
        Update: { name?: string; unit?: string; cost_per_unit?: number; stock_quantity?: number; supplier_id?: string | null }
      }
      bill_of_materials: {
        Row: { product_id: string; material_id: string; quantity_per_unit: number }
        Insert: { product_id: string; material_id: string; quantity_per_unit: number }
        Update: { quantity_per_unit?: number }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type Supplier = Database['public']['Tables']['suppliers']['Row']
export type Material = Database['public']['Tables']['materials']['Row']
export type BillOfMaterial = Database['public']['Tables']['bill_of_materials']['Row']

export type OrderWithCustomer = Order & { customers: Pick<Customer, 'business_name' | 'contact_name' | 'email' | 'phone'> }
export type OrderWithItems = Order & { order_items: (OrderItem & { products: Pick<Product, 'name' | 'code'> })[] }
export type OrderFull = OrderWithCustomer & OrderWithItems
export type CartItem = { product: Product; quantity: number; unit_price: number; line_total: number }
