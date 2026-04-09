/**
 * Billing helpers — server-only logic for the weekly invoice run.
 *
 * All money is USD. Each seller carries its own fee config:
 *   confirmation_fee_usd, upsell_fee_usd, cross_sell_fee_usd, shipping_fee_usd.
 *
 * Fee model per delivered order:
 *   confirmation_fee  → applied to every delivered order
 *   shipping_fee      → applied to every delivered order
 *   upsell_fee        → applied if order.is_upsell
 *   cross_sell_fee    → applied if order.is_cross_sell
 *
 * Order total_amount is treated as KES from the seller's storefront and
 * converted to USD via USD_TO_KES for invoicing.
 */

import { toUsd } from './currency'

export const DEFAULT_CURRENCY = 'USD'

/* ---------- Period math ------------------------------------- */

export interface Period {
  start: string  // ISO date "YYYY-MM-DD"
  end:   string  // ISO date "YYYY-MM-DD" (exclusive)
  label: string
}

function toIsoDate(d: Date): string { return d.toISOString().slice(0, 10) }
function startOfDay(d: Date): Date {
  const c = new Date(d); c.setUTCHours(0, 0, 0, 0); return c
}
function startOfIsoWeek(d: Date): Date {
  const c = startOfDay(d)
  const day = c.getUTCDay()
  const diff = (day === 0 ? -6 : 1 - day)
  c.setUTCDate(c.getUTCDate() + diff)
  return c
}

export function lastWeek(): Period {
  const thisWeekStart = startOfIsoWeek(new Date())
  const start = new Date(thisWeekStart)
  start.setUTCDate(start.getUTCDate() - 7)
  return { start: toIsoDate(start), end: toIsoDate(thisWeekStart), label: 'Last week' }
}
export function thisWeek(): Period {
  const start = startOfIsoWeek(new Date())
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 7)
  return { start: toIsoDate(start), end: toIsoDate(end), label: 'This week' }
}
export function customPeriod(start: string, end: string): Period {
  return { start, end, label: `${start} → ${end}` }
}
export function resolvePeriod(body: any): Period {
  if (body?.start && body?.end) return customPeriod(body.start, body.end)
  if (body?.preset === 'this_week') return thisWeek()
  return lastWeek()
}
export function formatPeriodLabel(p: Period): string {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const endDisplay = new Date(p.end); endDisplay.setUTCDate(endDisplay.getUTCDate() - 1)
  return `${fmt(p.start)} – ${fmt(endDisplay.toISOString())}`
}

/* ---------- Aggregation ------------------------------------- */

export interface OrderRow {
  id: string
  seller_id: string | null
  total_amount: number | null      // KES
  status: string
  created_at: string | null
  tracking_number?: string | null
  customer_name?: string | null
  is_upsell?: boolean | null
  is_cross_sell?: boolean | null
}

export interface SellerRow {
  id: string
  name: string | null
  email: string | null
  confirmation_fee_usd: number
  upsell_fee_usd: number
  cross_sell_fee_usd: number
  shipping_fee_usd: number
}

export interface BillingRow {
  seller_id: string
  seller_name: string
  seller_email: string
  delivered_count: number
  total_sales_usd: number
  confirmation_fees_usd: number
  upsell_fees_usd: number
  cross_sell_fees_usd: number
  shipping_fees_usd: number
  total_fees_usd: number
  net_usd: number
  orders: OrderRow[]
}

const r2 = (n: number) => Number(n.toFixed(2))

export function aggregate(
  sellers: SellerRow[],
  orders: OrderRow[],
  period: Period,
): BillingRow[] {
  const startMs = new Date(period.start + 'T00:00:00Z').getTime()
  const endMs   = new Date(period.end   + 'T00:00:00Z').getTime()

  const inPeriod = (o: OrderRow) => {
    if (!o.created_at) return false
    const t = new Date(o.created_at).getTime()
    return t >= startMs && t < endMs
  }

  const delivered = orders.filter(o => o.status === 'delivered' && o.seller_id && inPeriod(o))

  const bySeller = new Map<string, OrderRow[]>()
  for (const o of delivered) {
    const k = o.seller_id as string
    if (!bySeller.has(k)) bySeller.set(k, [])
    bySeller.get(k)!.push(o)
  }

  const rows: BillingRow[] = []
  for (const seller of sellers) {
    const list = bySeller.get(seller.id) ?? []
    if (list.length === 0) continue

    const salesUsd = list.reduce((s, o) => s + toUsd(Number(o.total_amount ?? 0)), 0)
    const upsellCount    = list.filter(o => o.is_upsell).length
    const crossCount     = list.filter(o => o.is_cross_sell).length

    const confirmation = seller.confirmation_fee_usd * list.length
    const shipping     = seller.shipping_fee_usd     * list.length
    const upsell       = seller.upsell_fee_usd       * upsellCount
    const crossSell    = seller.cross_sell_fee_usd   * crossCount
    const totalFees    = confirmation + upsell + crossSell + shipping
    const net          = salesUsd - totalFees

    rows.push({
      seller_id: seller.id,
      seller_name: seller.name ?? 'Seller',
      seller_email: seller.email ?? '',
      delivered_count: list.length,
      total_sales_usd: r2(salesUsd),
      confirmation_fees_usd: r2(confirmation),
      upsell_fees_usd: r2(upsell),
      cross_sell_fees_usd: r2(crossSell),
      shipping_fees_usd: r2(shipping),
      total_fees_usd: r2(totalFees),
      net_usd: r2(net),
      orders: list,
    })
  }

  rows.sort((a, b) => b.net_usd - a.net_usd)
  return rows
}

export function generateInvoiceNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let r = ''
  for (let i = 0; i < 7; i++) r += chars[Math.floor(Math.random() * chars.length)]
  return r
}
