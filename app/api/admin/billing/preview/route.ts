export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  resolvePeriod,
  aggregate,
  formatPeriodLabel,
  DEFAULT_DELIVERY_FEE,
  DEFAULT_CURRENCY,
  type OrderRow,
  type SellerRow,
} from '@/lib/billing'

/**
 * POST /api/admin/billing/preview
 *
 * Body: { preset?: 'this_week' | 'last_week', start?: string, end?: string,
 *         delivery_fee?: number, currency?: string }
 *
 * Returns the per-seller breakdown for the requested period without
 * touching the email service or writing to the payouts table.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const period = resolvePeriod(body)
    const fee     = Number(body?.delivery_fee ?? DEFAULT_DELIVERY_FEE)
    const currency = String(body?.currency ?? DEFAULT_CURRENCY)

    const [sellersRes, ordersRes] = await Promise.all([
      supabaseAdmin
        .from('sellers')
        .select('id, name, email, company')
        .order('name', { ascending: true }),
      supabaseAdmin
        .from('orders')
        .select('id, seller_id, total_amount, status, created_at, tracking_number, customer_name')
        .eq('status', 'delivered'),
    ])

    if (sellersRes.error) {
      return NextResponse.json(
        { success: false, error: `sellers: ${sellersRes.error.message}` },
        { status: 500 }
      )
    }
    if (ordersRes.error) {
      return NextResponse.json(
        { success: false, error: `orders: ${ordersRes.error.message}` },
        { status: 500 }
      )
    }

    const sellers: SellerRow[] = (sellersRes.data ?? []).map((s: any) => ({
      id:    String(s.id),
      name:  s.company ?? s.name ?? null,
      email: s.email ?? null,
    }))

    const orders: OrderRow[] = (ordersRes.data ?? []).map((o: any) => ({
      id:              String(o.id),
      seller_id:       o.seller_id ? String(o.seller_id) : null,
      total_amount:    Number(o.total_amount ?? 0),
      status:          o.status,
      delivered_at:    null,
      created_at:      o.created_at,
      tracking_number: o.tracking_number,
      customer_name:   o.customer_name,
    }))

    const rows = aggregate(sellers, orders, period, fee, currency)
    const totals = rows.reduce(
      (acc, r) => {
        acc.delivered_count += r.delivered_count
        acc.gross_amount    += r.gross_amount
        acc.delivery_fee    += r.delivery_fee
        acc.net_amount      += r.net_amount
        return acc
      },
      { delivered_count: 0, gross_amount: 0, delivery_fee: 0, net_amount: 0 }
    )

    return NextResponse.json({
      success: true,
      period: { ...period, label: formatPeriodLabel(period) },
      delivery_fee: fee,
      currency,
      seller_count: rows.length,
      totals,
      rows: rows.map(({ orders, ...rest }) => ({
        ...rest,
        order_count: orders.length,
      })),
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? 'unknown error' },
      { status: 500 }
    )
  }
}