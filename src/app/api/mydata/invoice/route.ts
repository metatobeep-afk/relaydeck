import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { buildInvoiceXML, submitToMyData } from '@/lib/mydata'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order_id } = await req.json()
  if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

  // Fetch order with items and customer
  const { data: order } = await supabase
    .from('orders')
    .select('*, customers(*), order_items(*, products(name))')
    .eq('id', order_id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((order as any).invoice_mark) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: 'Already invoiced', mark: (order as any).invoice_mark }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customerVat = (order.customers as any)?.vat_number as string | null
  if (!customerVat) {
    return NextResponse.json({ error: 'Ο πελάτης δεν έχει ΑΦΜ. Προσθέστε ΑΦΜ στο προφίλ πελάτη.' }, { status: 400 })
  }

  // Company settings for issuer ΑΦΜ and invoice series
  const { data: settings } = await supabase
    .from('company_settings')
    .select('afm, invoice_prefix')
    .limit(1)
    .single()

  const issuerVat = (settings as any)?.afm || '169783486'
  const series    = (settings as any)?.invoice_prefix || 'A'

  // Sequential invoice number (count of already-invoiced orders + 1)
  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .not('invoice_mark', 'is', null)
  const aa = (count ?? 0) + 1

  // Build invoice lines — stored prices are treated as NET (pre-VAT), VAT 24%
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lines = ((order as any).order_items ?? []).map((item: any, i: number) => ({
    lineNumber: i + 1,
    netValue:   item.line_total as number,
    vatAmount:  Math.round((item.line_total as number) * 0.24 * 100) / 100,
  }))

  if (lines.length === 0) {
    return NextResponse.json({ error: 'Η παραγγελία δεν έχει γραμμές' }, { status: 400 })
  }

  const xml = buildInvoiceXML({
    issuerVat,
    counterpartVat: customerVat,
    series,
    aa,
    issueDate: new Date(order.created_at).toISOString().split('T')[0],
    lines,
  })

  try {
    const { mark, uid, authCode } = await submitToMyData(xml)
    const invoice_number = `${series}-${aa}`

    // Use admin client to bypass RLS for the update
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await admin
      .from('orders')
      .update({
        invoice_mark: mark,
        invoice_uid: uid,
        invoice_number,
        invoiced_at: new Date().toISOString(),
      })
      .eq('id', order_id)
      .is('invoice_mark', null)

    return NextResponse.json({ success: true, mark, uid, authCode, invoice_number })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
