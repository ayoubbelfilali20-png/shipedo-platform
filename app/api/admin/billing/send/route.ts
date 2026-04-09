export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  resolvePeriod, aggregate, formatPeriodLabel, generateInvoiceNumber,
  type OrderRow, type SellerRow,
} from '@/lib/billing'

/**
 * POST /api/admin/billing/send
 * Body: { preset?, start?, end?, seller_ids?: string[] }
 *
 * Generates seller_invoices, credits seller_wallets, writes wallet_transactions.
 * No emails are sent here — invoices are visible inside the seller dashboard.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const period = resolvePeriod(body)
    const filterIds: Set<string> | null =
      Array.isArray(body?.seller_ids) && body.seller_ids.length > 0
        ? new Set(body.seller_ids.map((x: any) => String(x))) : null

    const [sellersRes, ordersRes] = await Promise.all([
      supabaseAdmin
        .from('sellers')
        .select('id, name, email, company, confirmation_fee_usd, upsell_fee_usd, cross_sell_fee_usd, shipping_fee_usd'),
      supabaseAdmin
        .from('orders')
        .select('id, seller_id, total_amount, status, created_at, tracking_number, customer_name, is_upsell, is_cross_sell')
        .eq('status', 'delivered'),
    ])
    if (sellersRes.error) return NextResponse.json({ success: false, error: sellersRes.error.message }, { status: 500 })
    if (ordersRes.error)  return NextResponse.json({ success: false, error: ordersRes.error.message },  { status: 500 })

    const sellers: SellerRow[] = (sellersRes.data ?? [])
      .map((s: any) => ({
        id: String(s.id),
        name: s.company ?? s.name ?? null,
        email: s.email ?? null,
        confirmation_fee_usd: Number(s.confirmation_fee_usd ?? 0),
        upsell_fee_usd: Number(s.upsell_fee_usd ?? 0),
        cross_sell_fee_usd: Number(s.cross_sell_fee_usd ?? 0),
        shipping_fee_usd: Number(s.shipping_fee_usd ?? 0),
      }))
      .filter(s => filterIds ? filterIds.has(s.id) : true)

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
    if (rows.length === 0) {
      return NextResponse.json({
        success: true, sent: 0, failed: 0, total: 0, results: [],
        period: { ...period, label: formatPeriodLabel(period) },
        message: 'No delivered orders for this period.',
      })
    }

    let sent = 0, failed = 0
    const results: any[] = []

    for (const row of rows) {
      const invoiceNumber = generateInvoiceNumber()

      const { data: invoice, error: invErr } = await supabaseAdmin
        .from('seller_invoices')
        .insert({
          invoice_number: invoiceNumber,
          seller_id: row.seller_id,
          seller_name: row.seller_name,
          seller_email: row.seller_email,
          period_start: period.start,
          period_end: period.end,
          delivered_count: row.delivered_count,
          orders: row.orders.map(o => ({
            id: o.id,
            tracking: o.tracking_number,
            customer: o.customer_name,
            total_kes: o.total_amount,
            is_upsell: !!o.is_upsell,
            is_cross_sell: !!o.is_cross_sell,
          })),
          total_sales_usd: row.total_sales_usd,
          confirmation_fees_usd: row.confirmation_fees_usd,
          upsell_fees_usd: row.upsell_fees_usd,
          cross_sell_fees_usd: row.cross_sell_fees_usd,
          shipping_fees_usd: row.shipping_fees_usd,
          total_fees_usd: row.total_fees_usd,
          net_usd: row.net_usd,
          status: 'sent',
        })
        .select('id')
        .single()

      if (invErr || !invoice) {
        failed++
        results.push({ seller_id: row.seller_id, seller_name: row.seller_name, status: 'failed', reason: invErr?.message })
        continue
      }

      // Upsert wallet
      const { data: existing } = await supabaseAdmin
        .from('seller_wallets')
        .select('balance_usd')
        .eq('seller_id', row.seller_id)
        .maybeSingle()

      const currentBal = Number(existing?.balance_usd ?? 0)
      const newBal = Number((currentBal + row.net_usd).toFixed(2))

      if (existing) {
        await supabaseAdmin
          .from('seller_wallets')
          .update({ balance_usd: newBal, updated_at: new Date().toISOString() })
          .eq('seller_id', row.seller_id)
      } else {
        await supabaseAdmin
          .from('seller_wallets')
          .insert({ seller_id: row.seller_id, balance_usd: newBal })
      }

      await supabaseAdmin.from('wallet_transactions').insert({
        seller_id: row.seller_id,
        type: 'invoice',
        amount_usd: row.net_usd,
        ref_id: invoice.id,
        note: `Invoice ${invoiceNumber} · ${row.delivered_count} delivered orders`,
      })

      sent++
      results.push({
        seller_id: row.seller_id, seller_name: row.seller_name,
        status: 'sent', net_usd: row.net_usd, invoice_number: invoiceNumber,
      })
    }

    return NextResponse.json({
      success: true,
      period: { ...period, label: formatPeriodLabel(period) },
      sent, failed, total: rows.length, results,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message ?? 'unknown error' }, { status: 500 })
  }
}
