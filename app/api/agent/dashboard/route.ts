import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { assignUnassignedOrders } from '@/lib/redistributeOrders'

const COLS_FULL = 'id, tracking_number, customer_name, customer_phone, customer_city, items, total_amount, original_total, status, payment_status, notes, call_attempts, reminded_at, last_call_at, last_call_agent_id, created_at, shipped_at, delivered_at, returned_at, shipped_to_agent_at, status_changed_at'

const COLS_SAFE = 'id, tracking_number, customer_name, customer_phone, customer_city, items, total_amount, original_total, status, payment_status, notes, call_attempts, reminded_at, last_call_at, last_call_agent_id, created_at, shipped_at, delivered_at, returned_at, shipped_to_agent_at'

const pages = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

async function fetchPaged(buildQuery: (cols: string, page: number) => any, cols: string) {
  const results = await Promise.all(
    pages.map(p => buildQuery(cols, p))
  )
  const hasError = results.some(r => r.error)
  return { rows: results.flatMap(r => r.data || []), hasError }
}

export async function GET(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return NextResponse.json({ ok: false }, { status: 401 })

  assignUnassignedOrders()

  const nowIso = new Date().toISOString()
  const days = Number(req.nextUrl.searchParams.get('days')) || 7
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffIso = cutoff.toISOString()

  const orFull = `created_at.gte.${cutoffIso},last_call_at.gte.${cutoffIso},shipped_at.gte.${cutoffIso},shipped_to_agent_at.gte.${cutoffIso},delivered_at.gte.${cutoffIso},returned_at.gte.${cutoffIso},status_changed_at.gte.${cutoffIso}`
  const orSafe = `created_at.gte.${cutoffIso},last_call_at.gte.${cutoffIso},shipped_at.gte.${cutoffIso},shipped_to_agent_at.gte.${cutoffIso},delivered_at.gte.${cutoffIso},returned_at.gte.${cutoffIso}`

  // Try with status_changed_at first
  let cols = COLS_FULL
  let orFilter = orFull

  const testQuery = await supabaseAdmin.from('orders').select(COLS_FULL).limit(1)
  if (testQuery.error) {
    cols = COLS_SAFE
    orFilter = orSafe
  }

  const [pendingResults, orderResults, toCallCount] = await Promise.all([
    Promise.all(
      pages.map(p =>
        supabaseAdmin.from('orders').select(cols)
          .eq('status', 'pending').eq('assigned_agent_id', agentId)
          .or(`reminded_at.is.null,reminded_at.lte.${nowIso}`)
          .order('created_at', { ascending: false })
          .range(p * 1000, (p + 1) * 1000 - 1)
      )
    ),
    Promise.all(
      pages.map(p =>
        supabaseAdmin.from('orders').select(cols)
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

  return NextResponse.json({
    pending: pendingResults.flatMap(r => r.data || []),
    orders: orderResults.flatMap(r => r.data || []),
    toCallCount: toCallCount.count || 0,
  }, { headers })
}
