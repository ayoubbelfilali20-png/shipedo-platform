import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { enrichOrderImages } from '@/lib/enrichOrderImages'

const COLS = 'id, tracking_number, customer_name, customer_phone, customer_city, items, total_amount, original_total, status, payment_status, notes, call_attempts, reminded_at, last_call_at, last_call_agent_id, created_at'

export async function GET(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return NextResponse.json({ ok: false }, { status: 401 })

  const nowIso = new Date().toISOString()
  const days = Number(req.nextUrl.searchParams.get('days')) || 7
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const [{ data: pending }, { data: orders }] = await Promise.all([
    supabaseAdmin.from('orders').select(COLS)
      .eq('status', 'pending').eq('assigned_agent_id', agentId)
      .or(`reminded_at.is.null,reminded_at.lte.${nowIso}`)
      .order('created_at', { ascending: true }).limit(1000),
    supabaseAdmin.from('orders').select(COLS)
      .eq('assigned_agent_id', agentId).neq('status', 'pending')
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false }).limit(1000),
  ])

  const [enrichedPending, enrichedOrders] = await Promise.all([
    enrichOrderImages(pending || [], supabaseAdmin),
    enrichOrderImages(orders || [], supabaseAdmin),
  ])

  return NextResponse.json({
    pending: enrichedPending,
    orders: enrichedOrders,
  })
}
