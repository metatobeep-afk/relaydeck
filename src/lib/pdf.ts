import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from './utils'

interface CompanySettings {
  name: string
  afm: string
  doy: string
  address: string
  phone: string
  email: string
  iban: string
  bank_name: string
  swift: string
  deposit_rate: number
  invoice_prefix: string
}

interface OrderItem {
  products: { name: string; code: string }
  quantity: number
  unit_price: number
  line_total: number
}

interface OrderData {
  order_number: string
  created_at: string
  total_price: number
  notes: string | null
  payment_status: string
  customers: {
    business_name: string
    contact_name: string
    phone: string
    email: string
    afm?: string | null
    address?: string | null
  }
  order_items: OrderItem[]
}

export function generateOrderPDF(order: OrderData, company: CompanySettings): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const deposit = order.total_price * (company.deposit_rate / 100)
  const remaining = order.total_price - deposit
  const margin = 20
  const pageW = 210

  // ─── Header ──────────────────────────────────────────────
  doc.setFillColor(240, 242, 248)
  doc.rect(0, 0, pageW, 42, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(30, 30, 60)
  doc.text('RelayDeck', margin, 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 130)
  doc.text(company.name, margin, 23)
  doc.text(`AFM: ${company.afm}  |  ${company.address}`, margin, 29)
  doc.text(`${company.phone}  |  ${company.email}`, margin, 35)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(70, 80, 200)
  doc.text('ΕΠΙΒΕΒΑΙΩΣΗ ΠΑΡΑΓΓΕΛΙΑΣ', pageW - margin, 14, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 80)
  doc.text(`Αρ. Παραγγελίας: ${order.order_number}`, pageW - margin, 22, { align: 'right' })
  doc.text(`Ημερομηνία: ${formatDate(order.created_at)}`, pageW - margin, 29, { align: 'right' })

  // ─── Customer block ───────────────────────────────────────
  const cy = 50
  doc.setFillColor(250, 250, 252)
  doc.roundedRect(margin, cy, (pageW - margin * 2) * 0.48, 38, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 150)
  doc.text('ΣΤΟΙΧΕΙΑ ΠΕΛΑΤΗ', margin + 4, cy + 7)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 60)
  doc.text(order.customers.business_name, margin + 4, cy + 15)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(70, 70, 90)
  doc.text(order.customers.contact_name, margin + 4, cy + 22)
  doc.text(order.customers.phone, margin + 4, cy + 28)
  doc.text(order.customers.email, margin + 4, cy + 34)
  if (order.customers.afm) doc.text(`ΑΦΜ: ${order.customers.afm}`, margin + 4, cy + 40)

  // ─── Items table ──────────────────────────────────────────
  const tableStart = cy + 48

  autoTable(doc, {
    startY: tableStart,
    margin: { left: margin, right: margin },
    head: [['Κωδικός', 'Προϊόν', 'Ποσότητα', 'Τιμή Μον.', 'Σύνολο']],
    body: order.order_items.map(item => [
      item.products?.code ?? '',
      item.products?.name ?? '',
      item.quantity.toString(),
      formatCurrency(item.unit_price),
      formatCurrency(item.line_total),
    ]),
    headStyles: {
      fillColor: [60, 70, 200],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8.5, textColor: [50, 50, 70] },
    alternateRowStyles: { fillColor: [247, 248, 255] },
    columnStyles: {
      0: { cellWidth: 25 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 28 },
    },
  })

  // ─── Totals block ─────────────────────────────────────────
  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  const totX = pageW - margin - 70

  const drawTotalRow = (label: string, value: string, y: number, bold = false, accent = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(bold ? 10 : 9)
    doc.setTextColor(accent ? 60 : 80, accent ? 70 : 80, accent ? 200 : 100)
    doc.text(label, totX, y)
    doc.setTextColor(30, 30, 60)
    doc.text(value, pageW - margin, y, { align: 'right' })
  }

  drawTotalRow('Συνολική Αξία:', formatCurrency(order.total_price), finalY, true)
  drawTotalRow(`Προκαταβολή (${company.deposit_rate}%):`, formatCurrency(deposit), finalY + 7, false, true)
  drawTotalRow('Υπόλοιπο:', formatCurrency(remaining), finalY + 14)

  // ─── Bank details ─────────────────────────────────────────
  if (company.iban) {
    const bankY = finalY + 26
    doc.setFillColor(245, 246, 255)
    doc.roundedRect(margin, bankY, pageW - margin * 2, 24, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 150)
    doc.text('ΤΡΑΠΕΖΙΚΑ ΣΤΟΙΧΕΙΑ ΓΙΑ ΚΑΤΑΘΕΣΗ', margin + 4, bankY + 7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50, 50, 70)
    doc.text(`${company.bank_name}   IBAN: ${company.iban}   BIC: ${company.swift}`, margin + 4, bankY + 15)
    doc.text(`Αιτιολογία κατάθεσης: ${order.order_number}`, margin + 4, bankY + 21)
  }

  // ─── Notes ───────────────────────────────────────────────
  if (order.notes) {
    const noteY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 60
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 140)
    doc.text(`Σημειώσεις: ${order.notes}`, margin, noteY)
  }

  // ─── Footer ───────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(160, 160, 180)
  doc.text('Δημιουργήθηκε από RelayDeck B2B Platform', pageW / 2, 285, { align: 'center' })

  return doc
}
