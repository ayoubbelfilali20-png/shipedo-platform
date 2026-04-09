export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * PATCH /api/admin/withdrawals/[id]
 * Body: { action: 'validate' | 'reject', note?: string, processed_by?: string }
 *
 * On validate: debits the seller wallet, writes wallet_transactions(withdraw).
 * On reject:   leaves wallet untouched, marks the request as rejected.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const action = String(body?.action || '')
  const note = body?.note ? String(body.note) : null
  const processedBy = body?.processed_by ? String(body.processed_by) : 'admin'

  if (!['validate', 'reject'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'invalid action' }, { status: 400 })
  }

  const { data: wr, error: wrErr } = await supabaseAdmin
    .from('withdraw_requests').select('*').eq('id', id).single()
  if (wrErr || !wr) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 })
  if (wr.status !== 'pending') return NextResponse.json({ ok: false, error: 'already processed' }, { status: 400 })

  if (action === 'reject') {
    await supabaseAdmin.from('withdraw_requests').update({
      status: 'rejected', note, processed_at: new Date().toISOString(), processed_by: processedBy,
    }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  // Validate: debit wallet
  const { data: wallet } = await supabaseAdmin
    .from('seller_wallets').select('balance_usd').eq('seller_id', wr.seller_id).maybeSingle()
  const balance = Number(wallet?.balance_usd ?? 0)
  const amount = Number(wr.amount_usd)

  if (amount > balance) return NextResponse.json({ ok: false, error: 'insufficient balance' }, { status: 400 })

  const newBal = Number((balance - amount).toFixed(2))
  await supabaseAdmin.from('seller_wallets')
    .update({ balance_usd: newBal, updated_at: new Date().toISOString() })
    .eq('seller_id', wr.seller_id)

  await supabaseAdmin.from('wallet_transactions').insert({
    seller_id: wr.seller_id,
    type: 'withdraw',
    amount_usd: -amount,
    ref_id: wr.id,
    note: `Withdraw to ${wr.method} · ${wr.account_details}`,
  })

  await supabaseAdmin.from('withdraw_requests').update({
    status: 'validated', note, processed_at: new Date().toISOString(), processed_by: processedBy,
  }).eq('id', id)

  return NextResponse.json({ ok: true })
}
