export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  resolvePeriod, aggregate, formatPeriodLabel,
  type OrderRow, type SellerRow,
} from '@/lib/billing'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const period = resolvePeriod(body)

    const [sellersRes, ordersRes] = await Promise.all([
      supabaseAdmin
        .from('sellers')
        .select('id, name, email, company, confirmation_fee_usd, upsell_fee_usd, cross_sell_fee_usd, shipping_fee_usd')
        .order('name', { ascending: true }),
      supabaseAdmin
        .from('orders')
        .select('id, seller_id, total_amount, status, created_at, tracking_number, customer_name, is_upsell, is_cross_sell')
        .eq('status', 'delivered')
        .gte('created_at', period.start)
        .lt('created_at', period.end)
        .limit(5000),
    ])
    if (sellersRes.error) return NextResponse.json({ success: false, error: sellersRes.error.message }, { status: 500 })
    if (ordersRes.error)  return NextResponse.json({ success: false, error: ordersRes.error.message },  { status: 500 })

    const sellers: SellerRow[] = (sellersRes.data ?? []).map((s: any) => ({
      id: String(s.id),
      name: s.company ?? s.name ?? null,
      email: s.email ?? null,
      confirmation_fee_usd: Number(s.confirmation_fee_usd ?? 0),
      upsell_fee_usd: Number(s.upsell_fee_usd ?? 0),
      cross_sell_fee_usd: Number(s.cross_sell_fee_usd ?? 0),
      shipping_fee_usd: Number(s.shipping_fee_usd ?? 0),
    }))

    const orders: OrderRow[] = (ordersRes.data ?? []).map((o: any) => ({
      id: String(o.id),
      seller_id: o.seller_id ? String(o.seller_id) : null,
      total_amount: Number(o.total_amount ?? 0),
      status: o.status,
      created_at: o.created_at,
      tracking_number: o.tracking_number,
      customer_name: o.customer_name,
      is_upsell: !!o.is_upsell,
      is_cross_sell: !!o.is_cross_sell,
    }))

    const rows = aggregate(sellers, orders, period)
    const totals = rows.reduce((a, r) => ({
      delivered_count: a.delivered_count + r.delivered_count,
      total_sales_usd: a.total_sales_usd + r.total_sales_usd,
      total_fees_usd:  a.total_fees_usd  + r.total_fees_usd,
      net_usd:         a.net_usd         + r.net_usd,
    }), { delivered_count: 0, total_sales_usd: 0, total_fees_usd: 0, net_usd: 0 })

    return NextResponse.json({
      success: true,
      period: { ...period, label: formatPeriodLabel(period) },
      seller_count: rows.length,
      totals,
      rows: rows.map(({ orders, ...rest }) => ({ ...rest, order_count: orders.length })),
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message ?? 'unknown error' }, { status: 500 })
  }
}
