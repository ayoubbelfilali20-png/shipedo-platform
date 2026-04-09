export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * POST /api/seller/withdraw
 * Headers: x-seller-id
 * Body: { amount_usd: number, method: 'binance'|'redotpay', account_details: string }
 *
 * Creates a pending withdraw_request. Wallet is NOT debited until admin validates.
 */
export async function POST(req: NextRequest) {
  const sellerId = req.headers.get('x-seller-id')
  if (!sellerId) return NextResponse.json({ ok: false, error: 'missing seller' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const amount = Number(body?.amount_usd)
  const method = String(body?.method || '')
  const account = String(body?.account_details || '').trim()

  if (!amount || amount <= 0) return NextResponse.json({ ok: false, error: 'invalid amount' }, { status: 400 })
  if (!['binance', 'redotpay'].includes(method)) return NextResponse.json({ ok: false, error: 'invalid method' }, { status: 400 })
  if (!account) return NextResponse.json({ ok: false, error: 'account_details required' }, { status: 400 })

  // Check wallet balance + pending requests
  const { data: wallet } = await supabaseAdmin
    .from('seller_wallets').select('balance_usd').eq('seller_id', sellerId).maybeSingle()
  const balance = Number(wallet?.balance_usd ?? 0)

  const { data: pending } = await supabaseAdmin
    .from('withdraw_requests')
    .select('amount_usd')
    .eq('seller_id', sellerId)
    .eq('status', 'pending')
  const lockedPending = (pending ?? []).reduce((s, w: any) => s + Number(w.amount_usd ?? 0), 0)

  if (amount > balance - lockedPending) {
    return NextResponse.json({ ok: false, error: `insufficient balance (available: $${(balance - lockedPending).toFixed(2)})` }, { status: 400 })
  }

  const { data: seller } = await supabaseAdmin
    .from('sellers').select('name, company').eq('id', sellerId).maybeSingle()

  const { data, error } = await supabaseAdmin
    .from('withdraw_requests')
    .insert({
      seller_id: sellerId,
      seller_name: seller?.company || seller?.name || null,
      amount_usd: amount,
      method,
      account_details: account,
      status: 'pending',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, request: data })
}
