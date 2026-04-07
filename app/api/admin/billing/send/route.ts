export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isServiceRoleConfigured } from '@/lib/supabaseAdmin'
import { resend, RESEND_FROM, isResendConfigured } from '@/lib/resend'
import {
  resolvePeriod,
  aggregate,
  renderInvoiceEmail,
  formatPeriodLabel,
  DEFAULT_DELIVERY_FEE,
  DEFAULT_CURRENCY,
  type OrderRow,
  type SellerRow,
} from '@/lib/billing'

/**
 * POST /api/admin/billing/send
 *
 * One-click weekly billing run. Aggregates delivered orders per seller,
 * sends an HTML statement via Resend, and writes a row to seller_payouts.
 *
 * Body:
 *   { preset?: 'this_week' | 'last_week',
 *     start?: 'YYYY-MM-DD', end?: 'YYYY-MM-DD',
 *     seller_ids?: string[],          // optional, restrict to subset
 *     delivery_fee?: number,
 *     currency?: string,
 *     sent_by?: string,               // admin name/id, optional
 *     dry_run?: boolean }             // if true, no email/insert, returns aggregation only
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const period   = resolvePeriod(body)
    const fee      = Number(body?.delivery_fee ?? DEFAULT_DELIVERY_FEE)
    const currency = String(body?.currency ?? DEFAULT_CURRENCY)
    const sentBy   = String(body?.sent_by ?? 'admin')
    const dryRun   = Boolean(body?.dry_run)
    const filterIds: Set<string> | null =
      Array.isArray(body?.seller_ids) && body.seller_ids.length > 0
        ? new Set(body.seller_ids.map((x: any) => String(x)))
        : null

    if (!dryRun && !isResendConfigured) {
      return NextResponse.json({
        success: false,
        error:   'RESEND_API_KEY is not configured. Add it to .env.local or call with { dry_run: true }.',
      }, { status: 500 })
    }
    if (!isServiceRoleConfigured) {
      console.warn('[billing/send] SUPABASE_SERVICE_ROLE_KEY not set, falling back to anon key.')
    }

    // 1. Load sellers and delivered orders
    const [sellersRes, ordersRes] = await Promise.all([
      supabaseAdmin
        .from('sellers')
        .select('id, name, email, company'),
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

    const sellers: SellerRow[] = (sellersRes.data ?? [])
      .map((s: any) => ({
        id:    String(s.id),
        name:  s.company ?? s.name ?? null,
        email: s.email ?? null,
      }))
      .filter(s => (filterIds ? filterIds.has(s.id) : true))

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

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        period:  { ...period, label: formatPeriodLabel(period) },
        sent: 0,
        failed: 0,
        skipped: 0,
        message: 'No delivered orders found for this period.',
        results: [],
      })
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        period:  { ...period, label: formatPeriodLabel(period) },
        seller_count: rows.length,
        rows:    rows.map(({ orders, ...r }) => ({ ...r, order_count: orders.length })),
      })
    }

    // 2. For each row: send the email and persist a payout row.
    let sent = 0
    let failed = 0
    let skipped = 0
    const results: any[] = []

    for (const row of rows) {
      if (!row.seller_email) {
        skipped++
        results.push({
          seller_id:   row.seller_id,
          seller_name: row.seller_name,
          status:      'skipped',
          reason:      'no email on file',
        })
        continue
      }

      const { subject, html, text } = renderInvoiceEmail(row, period)
      let messageId: string | null = null
      let emailError: string | null = null

      try {
        const res = await resend!.emails.send({
          from:    RESEND_FROM,
          to:      [row.seller_email],
          subject,
          html,
          text,
        })
        if (res.error) {
          emailError = res.error.message ?? String(res.error)
        } else {
          messageId = res.data?.id ?? null
        }
      } catch (err: any) {
        emailError = err?.message ?? 'send failed'
      }

      const status = emailError ? 'failed' : 'sent'

      const { error: insertErr } = await supabaseAdmin
        .from('seller_payouts')
        .insert({
          seller_id:        row.seller_id,
          seller_name:      row.seller_name,
          seller_email:     row.seller_email,
          period_start:     period.start,
          period_end:       period.end,
          delivered_count:  row.delivered_count,
          gross_amount:     row.gross_amount,
          delivery_fee:     row.delivery_fee,
          net_amount:       row.net_amount,
          currency:         row.currency,
          status,
          email_message_id: messageId,
          email_error:      emailError,
          sent_by:          sentBy,
        })

      if (insertErr) {
        // Email may have gone out but DB insert failed — surface it.
        results.push({
          seller_id:   row.seller_id,
          seller_name: row.seller_name,
          status:      'failed',
          reason:      `db: ${insertErr.message}`,
          email_sent:  status === 'sent',
        })
        failed++
        continue
      }

      if (status === 'sent') {
        sent++
        results.push({
          seller_id:   row.seller_id,
          seller_name: row.seller_name,
          seller_email:row.seller_email,
          status:      'sent',
          net_amount:  row.net_amount,
          message_id:  messageId,
        })
      } else {
        failed++
        results.push({
          seller_id:   row.seller_id,
          seller_name: row.seller_name,
          status:      'failed',
          reason:      emailError,
        })
      }
    }

    return NextResponse.json({
      success: true,
      period:  { ...period, label: formatPeriodLabel(period) },
      sent,
      failed,
      skipped,
      total:   rows.length,
      results,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? 'unknown error' },
      { status: 500 }
    )
  }
}