import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { assignUnassignedOrders } from '@/lib/redistributeOrders'

const COLS = 'id, tracking_number, customer_name, customer_phone, customer_city, items, total_amount, original_total, status, payment_status, notes, call_attempts, reminded_at, last_call_at, last_call_agent_id, created_at, shipped_at, delivered_at, returned_at, shipped_to_agent_at, status_changed_at'

const pages = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

export async function GET(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return NextResponse.json({ ok: false }, { status: 401 })

  assignUnassignedOrders()

  const nowIso = new Date().toISOString()
  const days = Number(req.nextUrl.searchParams.get('days')) || 7
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffIso = cutoff.toISOString()
  const orFilter = `created_at.gte.${cutoffIso},last_call_at.gte.${cutoffIso},shipped_at.gte.${cutoffIso},shipped_to_agent_at.gte.${cutoffIso},delivered_at.gte.${cutoffIso},returned_at.gte.${cutoffIso},status_changed_at.gte.${cutoffIso}`

  const [pendingResults, orderResults, toCallCount] = await Promise.all([
    Promise.all(
      pages.map(p =>
        supabaseAdmin.from('orders').select(COLS)
          .eq('status', 'pending').eq('assigned_agent_id', agentId)
          .or(`reminded_at.is.null,reminded_at.lte.${nowIso}`)
          .order('created_at', { ascending: false })
          .range(p * 1000, (p + 1) * 1000 - 1)
      )
    ),
    Promise.all(
      pages.map(p =>
        supabaseAdmin.from('orders').select(COLS)
          .eq('assigned_agent_id', agentId).neq('status', 'pending')
          .or(orFilter)
          .order('created_at', { ascending: false })
          .range(p * 1000, (p + 1) * 1000 - 1)
      )
    ),
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true })
      .eq('status', 'pending').eq('assigned_agent_id', agentId)
      .or(`reminded_at.is.null,reminded_at.lte.${nowIso}`),
  ])

  const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

  return NextResponse.json({
    pending: pendingResults.flatMap(r => r.data || []),
    orders: orderResults.flatMap(r => r.data || []),
    toCallCount: toCallCount.count || 0,
  }, { headers })
}
