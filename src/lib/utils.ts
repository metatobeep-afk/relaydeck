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
  pending_deposit:  { label: 'Αναμονή Προκαταβολής', color: 'bg-yellow-100 text-yellow-800' },
  deposit_received: { label: 'Προκαταβολή Ελήφθη',   color: 'bg-blue-100 text-blue-800'   },
  paid:             { label: 'Εξοφλημένη',            color: 'bg-green-100 text-green-800' },
  cancelled:        { label: 'Ακυρωμένη',             color: 'bg-red-100 text-red-800'    },
}

export const PRODUCTION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  to_prepare:       { label: 'Προς Προετοιμασία',  color: 'bg-slate-100 text-slate-700'   },
  in_progress:      { label: 'Σε Εξέλιξη',         color: 'bg-orange-100 text-orange-800' },
  quality_check:    { label: 'Ποιοτικός Έλεγχος',  color: 'bg-purple-100 text-purple-800' },
  ready_packaging:  { label: 'Έτοιμο Συσκευασία',  color: 'bg-cyan-100 text-cyan-800'    },
  ready_ship:       { label: 'Έτοιμο Αποστολή',    color: 'bg-indigo-100 text-indigo-800' },
  completed:        { label: 'Ολοκληρώθηκε',       color: 'bg-green-100 text-green-800'  },
}

export const SHIPPING_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Εκκρεμεί',    color: 'bg-slate-100 text-slate-700' },
  shipped:   { label: 'Απεστάλη',    color: 'bg-blue-100 text-blue-800'  },
  delivered: { label: 'Παραδόθηκε', color: 'bg-green-100 text-green-800' },
}
