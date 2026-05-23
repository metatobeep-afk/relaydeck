const BASE_URL = process.env.MYDATA_BASE_URL ?? 'https://mydata.aade.gr/api/'
const USER_ID  = process.env.MYDATA_USER_ID  ?? ''
const SUBKEY   = process.env.MYDATA_SUBSCRIPTION_KEY ?? ''

export interface InvoiceLine {
  lineNumber: number
  netValue: number
  vatAmount: number
}

export interface MyDataParams {
  issuerVat: string
  counterpartVat: string
  series: string
  aa: number
  issueDate: string  // 'YYYY-MM-DD'
  lines: InvoiceLine[]
}

function fmt(n: number) { return n.toFixed(2) }

export function buildInvoiceXML(p: MyDataParams): string {
  const totalNet   = p.lines.reduce((s, l) => s + l.netValue,  0)
  const totalVat   = p.lines.reduce((s, l) => s + l.vatAmount, 0)
  const totalGross = totalNet + totalVat

  const lineItems = p.lines.map(l => `    <invoiceDetails>
      <lineNumber>${l.lineNumber}</lineNumber>
      <netValue>${fmt(l.netValue)}</netValue>
      <vatCategory>1</vatCategory>
      <vatAmount>${fmt(l.vatAmount)}</vatAmount>
      <discountOption>false</discountOption>
      <incomeClassification>
        <icls:classificationType>E3_561_001</icls:classificationType>
        <icls:classificationCategory>category1_1</icls:classificationCategory>
        <icls:amount>${fmt(l.netValue)}</icls:amount>
      </incomeClassification>
    </invoiceDetails>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<InvoicesDoc xmlns:icls="https://www.aade.gr/myDATA/invoice/v1.0"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <invoice>
    <issuer>
      <vatNumber>${p.issuerVat}</vatNumber>
      <country>GR</country>
      <branch>0</branch>
    </issuer>
    <counterpart>
      <vatNumber>${p.counterpartVat}</vatNumber>
      <country>GR</country>
      <branch>0</branch>
    </counterpart>
    <invoiceHeader>
      <series>${p.series}</series>
      <aa>${p.aa}</aa>
      <issueDate>${p.issueDate}</issueDate>
      <invoiceType>1.1</invoiceType>
      <currency>EUR</currency>
    </invoiceHeader>
    <paymentMethods>
      <paymentMethodDetails>
        <type>5</type>
        <amount>${fmt(totalGross)}</amount>
      </paymentMethodDetails>
    </paymentMethods>
${lineItems}
    <invoiceSummary>
      <totalNetValue>${fmt(totalNet)}</totalNetValue>
      <totalVatAmount>${fmt(totalVat)}</totalVatAmount>
      <totalWithheldAmount>0.00</totalWithheldAmount>
      <totalFeesAmount>0.00</totalFeesAmount>
      <totalStampDutyAmount>0.00</totalStampDutyAmount>
      <totalOtherTaxesAmount>0.00</totalOtherTaxesAmount>
      <totalDeductionsAmount>0.00</totalDeductionsAmount>
      <totalGrossValue>${fmt(totalGross)}</totalGrossValue>
      <incomeClassification>
        <icls:classificationType>E3_561_001</icls:classificationType>
        <icls:classificationCategory>category1_1</icls:classificationCategory>
        <icls:amount>${fmt(totalNet)}</icls:amount>
      </incomeClassification>
    </invoiceSummary>
  </invoice>
</InvoicesDoc>`
}

export async function submitToMyData(xml: string): Promise<{ mark: string; uid: string; authCode: string }> {
  const url = `${BASE_URL}SendInvoices`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'aade-user-id': USER_ID,
        'Ocp-Apim-Subscription-Key': SUBKEY,
      },
      body: xml,
    })
  } catch (err: unknown) {
    const cause = err instanceof Error ? (err as NodeJS.ErrnoException).cause ?? err.message : String(err)
    throw new Error(`myDATA connection failed — URL: ${url} | Cause: ${cause}`)
  }

  const text = await res.text()

  if (!res.ok) {
    throw new Error(`myDATA HTTP ${res.status} from ${url}: ${text.slice(0, 400)}`)
  }

  const statusCode = text.match(/<statusCode>([^<]+)<\/statusCode>/)?.[1]
  if (statusCode !== 'Success') {
    const msg = text.match(/<message>([^<]+)<\/message>/)?.[1] ?? statusCode ?? 'Unknown error'
    throw new Error(`myDATA validation error: ${msg}`)
  }

  return {
    mark:     text.match(/<invoiceMark>(\d+)<\/invoiceMark>/)?.[1]                    ?? '',
    uid:      text.match(/<invoiceUid>([^<]+)<\/invoiceUid>/)?.[1]                    ?? '',
    authCode: text.match(/<authenticationCode>([^<]+)<\/authenticationCode]/)?.[1]   ?? '',
  }
}
