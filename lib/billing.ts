/**
 * Billing helpers — server-only logic for the weekly invoice run.
 *
 * Used by:
 *   /api/admin/billing/preview/route.ts
 *   /api/admin/billing/send/route.ts
 *
 * Concepts
 *   • A "billing period" is a half-open interval [start, end) on the
 *     `delivered_at` timestamp of each order.
 *   • Default period is the previous ISO week (Mon → Sun).
 *   • Default delivery fee per delivered order is 30 MAD. Configurable
 *     per request via the API body or via env DELIVERY_FEE_MAD.
 */

export const DEFAULT_DELIVERY_FEE = Number(
  process.env.DELIVERY_FEE_MAD ?? 30
)
export const DEFAULT_CURRENCY = 'MAD'

/* ---------- Period math ------------------------------------- */

export interface Period {
  start: string  // ISO date "YYYY-MM-DD"
  end:   string  // ISO date "YYYY-MM-DD" (exclusive)
  label: string
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setUTCHours(0, 0, 0, 0)
  return c
}

/** Monday of the week containing `d` (UTC). */
function startOfIsoWeek(d: Date): Date {
  const c = startOfDay(d)
  const day = c.getUTCDay()           // 0 = Sun … 6 = Sat
  const diff = (day === 0 ? -6 : 1 - day)
  c.setUTCDate(c.getUTCDate() + diff)
  return c
}

export function lastWeek(): Period {
  const thisWeekStart = startOfIsoWeek(new Date())
  const start = new Date(thisWeekStart)
  start.setUTCDate(start.getUTCDate() - 7)
  return {
    start: toIsoDate(start),
    end:   toIsoDate(thisWeekStart),
    label: 'Last week',
  }
}

export function thisWeek(): Period {
  const start = startOfIsoWeek(new Date())
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 7)
  return {
    start: toIsoDate(start),
    end:   toIsoDate(end),
    label: 'This week',
  }
}

export function customPeriod(start: string, end: string): Period {
  return { start, end, label: `${start} → ${end}` }
}

/** Resolve a period from an arbitrary request body. */
export function resolvePeriod(body: any): Period {
  if (body?.start && body?.end) return customPeriod(body.start, body.end)
  if (body?.preset === 'this_week') return thisWeek()
  return lastWeek()
}

/** Pretty human label for a period (used in emails). */
export function formatPeriodLabel(p: Period): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', {
      day:   'numeric',
      month: 'short',
      year:  'numeric',
      timeZone: 'UTC',
    })
  // end is exclusive, subtract a day for display
  const endDisplay = new Date(p.end)
  endDisplay.setUTCDate(endDisplay.getUTCDate() - 1)
  return `${fmt(p.start)} – ${fmt(endDisplay.toISOString())}`
}

/* ---------- Aggregation ------------------------------------- */

export interface OrderRow {
  id:           string
  seller_id:    string | null
  seller_name?: string | null
  total_amount: number | null
  status:       string
  delivered_at: string | null
  created_at:   string | null
  tracking_number?: string | null
  customer_name?: string | null
}

export interface SellerRow {
  id:    string
  name:  string | null
  email: string | null
}

export interface BillingRow {
  seller_id:        string
  seller_name:      string
  seller_email:     string
  delivered_count:  number
  gross_amount:     number
  delivery_fee:     number
  net_amount:       number
  currency:         string
  orders:           OrderRow[]
}

export function aggregate(
  sellers: SellerRow[],
  orders: OrderRow[],
  period: Period,
  feePerOrder = DEFAULT_DELIVERY_FEE,
  currency    = DEFAULT_CURRENCY,
): BillingRow[] {
  const startMs = new Date(period.start + 'T00:00:00Z').getTime()
  const endMs   = new Date(period.end   + 'T00:00:00Z').getTime()

  const inPeriod = (o: OrderRow) => {
    const ref = o.delivered_at ?? o.created_at
    if (!ref) return false
    const t = new Date(ref).getTime()
    return t >= startMs && t < endMs
  }

  const delivered = orders.filter(
    o => o.status === 'delivered' && o.seller_id && inPeriod(o)
  )

  const bySeller = new Map<string, OrderRow[]>()
  for (const o of delivered) {
    const key = o.seller_id as string
    if (!bySeller.has(key)) bySeller.set(key, [])
    bySeller.get(key)!.push(o)
  }

  const rows: BillingRow[] = []
  for (const seller of sellers) {
    const sellerOrders = bySeller.get(seller.id) ?? []
    if (sellerOrders.length === 0) continue
    const gross = sellerOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0)
    const fee   = feePerOrder * sellerOrders.length
    rows.push({
      seller_id:       seller.id,
      seller_name:     seller.name ?? 'Seller',
      seller_email:    seller.email ?? '',
      delivered_count: sellerOrders.length,
      gross_amount:    Number(gross.toFixed(2)),
      delivery_fee:    Number(fee.toFixed(2)),
      net_amount:      Number((gross - fee).toFixed(2)),
      currency,
      orders:          sellerOrders,
    })
  }

  rows.sort((a, b) => b.net_amount - a.net_amount)
  return rows
}

/* ---------- Email template ---------------------------------- */

export function renderInvoiceEmail(row: BillingRow, period: Period): {
  subject: string
  html:    string
  text:    string
} {
  const fmtMoney = (n: number) =>
    `${row.currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const periodLabel = formatPeriodLabel(period)
  const invoiceNo = `INV-${period.start.replace(/-/g, '')}-${row.seller_id.slice(0, 6).toUpperCase()}`

  const rowsHtml = row.orders
    .map(o => {
      const date = o.delivered_at ?? o.created_at ?? ''
      const dateStr = date
        ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        : ''
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f1f1;font-family:Inter,Arial,sans-serif;font-size:12px;color:#1a1c3a;">
            <div style="font-weight:600;">${o.tracking_number ?? o.id.slice(0, 8)}</div>
            <div style="color:#9ca3af;font-size:11px;margin-top:2px;">${o.customer_name ?? ''}</div>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f1f1;font-family:Inter,Arial,sans-serif;font-size:12px;color:#6b7280;">${dateStr}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f1f1;font-family:Inter,Arial,sans-serif;font-size:12px;color:#1a1c3a;text-align:right;font-weight:600;">${fmtMoney(o.total_amount ?? 0)}</td>
        </tr>`
    })
    .join('')

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${invoiceNo}</title>
</head>
<body style="margin:0;padding:24px;background:#f6f7fb;font-family:Inter,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.05);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#1a1c3a 0%,#252750 100%);padding:28px 32px;">
        <table role="presentation" width="100%"><tr>
          <td>
            <div style="display:inline-block;background:#f4991a;width:44px;height:44px;border-radius:12px;text-align:center;line-height:44px;color:#fff;font-size:22px;font-weight:800;">S</div>
            <div style="display:inline-block;margin-left:10px;vertical-align:middle;">
              <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-.3px;">Shipedo</div>
              <div style="color:rgba(255,255,255,.5);font-size:11px;">Logistics &amp; COD Platform</div>
            </div>
          </td>
          <td align="right">
            <div style="color:rgba(255,255,255,.5);font-size:10px;text-transform:uppercase;letter-spacing:1px;">Weekly Statement</div>
            <div style="color:#f4991a;font-family:'SFMono-Regular',Menlo,monospace;font-size:13px;font-weight:700;margin-top:4px;">${invoiceNo}</div>
          </td>
        </tr></table>
      </td>
    </tr>

    <!-- Greeting -->
    <tr>
      <td style="padding:32px 32px 12px 32px;">
        <div style="font-size:18px;font-weight:700;color:#1a1c3a;">Hi ${row.seller_name},</div>
        <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:8px 0 0 0;">
          Here is your delivery statement for <strong style="color:#1a1c3a;">${periodLabel}</strong>.
          The net amount has been credited to your Shipedo wallet and is now available for withdrawal.
        </p>
      </td>
    </tr>

    <!-- Summary card -->
    <tr>
      <td style="padding:24px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8ed;border:1px solid #fde4c1;border-radius:14px;">
          <tr>
            <td style="padding:20px 24px;">
              <div style="font-size:11px;color:#a15a00;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Net Payout</div>
              <div style="font-size:32px;font-weight:800;color:#1a1c3a;margin-top:6px;">${fmtMoney(row.net_amount)}</div>
              <table role="presentation" width="100%" style="margin-top:18px;"><tr>
                <td style="font-size:11px;color:#9a6914;">
                  <div style="text-transform:uppercase;letter-spacing:.5px;font-weight:700;">Delivered orders</div>
                  <div style="font-size:18px;font-weight:800;color:#1a1c3a;margin-top:2px;">${row.delivered_count}</div>
                </td>
                <td style="font-size:11px;color:#9a6914;">
                  <div style="text-transform:uppercase;letter-spacing:.5px;font-weight:700;">Gross revenue</div>
                  <div style="font-size:18px;font-weight:800;color:#1a1c3a;margin-top:2px;">${fmtMoney(row.gross_amount)}</div>
                </td>
                <td style="font-size:11px;color:#9a6914;">
                  <div style="text-transform:uppercase;letter-spacing:.5px;font-weight:700;">Delivery fees</div>
                  <div style="font-size:18px;font-weight:800;color:#1a1c3a;margin-top:2px;">−${fmtMoney(row.delivery_fee)}</div>
                </td>
              </tr></table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Details table -->
    <tr>
      <td style="padding:0 32px 24px 32px;">
        <div style="font-size:12px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Delivered orders breakdown</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f1f1f1;border-radius:12px;overflow:hidden;">
          <thead>
            <tr style="background:#fafafa;">
              <th align="left" style="padding:10px 12px;font-family:Inter,Arial,sans-serif;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;">Order</th>
              <th align="left" style="padding:10px 12px;font-family:Inter,Arial,sans-serif;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;">Date</th>
              <th align="right" style="padding:10px 12px;font-family:Inter,Arial,sans-serif;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;">Amount</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:0 32px 32px 32px;">
        <p style="font-size:12px;color:#9ca3af;line-height:1.6;margin:0;">
          You can review this statement and request a withdrawal anytime from your seller dashboard.
          For any question reply to this email or contact <a href="mailto:billing@shipedo.com" style="color:#f4991a;text-decoration:none;">billing@shipedo.com</a>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:18px 32px;background:#fafafa;border-top:1px solid #f1f1f1;text-align:center;">
        <div style="font-size:11px;color:#9ca3af;">© ${new Date().getFullYear()} Shipedo. This is a computer-generated statement.</div>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    `Shipedo — Weekly statement ${invoiceNo}`,
    `Period: ${periodLabel}`,
    ``,
    `Hi ${row.seller_name},`,
    ``,
    `Delivered orders : ${row.delivered_count}`,
    `Gross revenue    : ${fmtMoney(row.gross_amount)}`,
    `Delivery fees    : -${fmtMoney(row.delivery_fee)}`,
    `Net payout       : ${fmtMoney(row.net_amount)}`,
    ``,
    `The net amount is now available in your Shipedo wallet.`,
    `— Shipedo Billing`,
  ].join('\n')

  return {
    subject: `Shipedo statement — ${fmtMoney(row.net_amount)} (${row.delivered_count} orders)`,
    html,
    text,
  }
}
