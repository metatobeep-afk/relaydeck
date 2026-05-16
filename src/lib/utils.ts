import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('el-GR', { style: 'currency', currency }).format(amount)
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date))
}

export function computeUnitPrice(costPrice: number, multiplier: number) {
  return Math.round(costPrice * multiplier * 100) / 100
}

export const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_deposit: { label: 'Pending Deposit', color: 'bg-yellow-100 text-yellow-800' },
  deposit_received: { label: 'Deposit Received', color: 'bg-blue-100 text-blue-800' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
}

export const PRODUCTION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  to_prepare: { label: 'To Prepare', color: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'In Progress', color: 'bg-orange-100 text-orange-800' },
  quality_check: { label: 'Quality Check', color: 'bg-purple-100 text-purple-800' },
  ready_packaging: { label: 'Ready for Packaging', color: 'bg-cyan-100 text-cyan-800' },
  ready_ship: { label: 'Ready to Ship', color: 'bg-indigo-100 text-indigo-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
}

export const SHIPPING_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700' },
  shipped: { label: 'Shipped', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800' },
}
