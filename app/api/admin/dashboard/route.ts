import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const ORDER_COLS_FULL = 'id, seller_id, assigned_agent_id, status, total_amount, original_total, call_attempts, last_call_agent_id, reminded_at, created_at, tracking_number, customer_name, delivered_at, shipped_at, returned_at, shipped_to_agent_at, last_call_at, status_changed_at'

const ORDER_COLS_SAFE = 'id, seller_id, assigned_agent_id, status, total_amount, original_total, call_attempts, last_call_agent_id, reminded_at, created_at, tracking_number, customer_name, delivered_at, shipped_at, returned_at, shipped_to_agent_at, last_call_at'

const pages = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

async function fetchOrders(cols: string, orFilter?: string) {
  const results = await Promise.all(
    pages.map(p => {
      let q = supabaseAdmin.from('orders').select(cols)
      if (orFilter) q = q.or(orFilter)
      return q.order('created_at', { ascending: false }).range(p * 1000, (p + 1) * 1000 - 1)
    })
  )
  const hasError = results.some(r => r.error)
  return { orders: results.flatMap(r => r.data || []), hasError }
}

export async function GET(req: NextRequest) {
  const all = (req as any).nextUrl?.searchParams?.get('all') === '1'
  const days = Number((req as any).nextUrl?.searchParams?.get('days')) || 30

  const [{ data: sellers }, { data: agents }] = await Promise.all([
    supabaseAdmin.from('sellers').select('id, name, company, email, city, status'),
    supabaseAdmin.from('agents').select('id, name, email, status'),
  ])

  if (all) {
    let { orders, hasError } = await fetchOrders(ORDER_COLS_FULL)
    if (hasError && orders.length === 0) {
      const fb = await fetchOrders(ORDER_COLS_SAFE)
      orders = fb.orders
    }
    return NextResponse.json({ orders, sellers: sellers || [], agents: agents || [] }, { headers })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffIso = cutoff.toISOString()

  const orFull = `created_at.gte.${cutoffIso},last_call_at.gte.${cutoffIso},shipped_at.gte.${cutoffIso},shipped_to_agent_at.gte.${cutoffIso},delivered_at.gte.${cutoffIso},returned_at.gte.${cutoffIso},status_changed_at.gte.${cutoffIso}`
  const orSafe = `created_at.gte.${cutoffIso},last_call_at.gte.${cutoffIso},shipped_at.gte.${cutoffIso},shipped_to_agent_at.gte.${cutoffIso},delivered_at.gte.${cutoffIso},returned_at.gte.${cutoffIso}`

  let { orders, hasError } = await fetchOrders(ORDER_COLS_FULL, orFull)
  if (hasError && orders.length === 0) {
    const fb = await fetchOrders(ORDER_COLS_SAFE, orSafe)
    orders = fb.orders
  }

  return NextResponse.json({
    orders,
    sellers: sellers || [],
    agents: agents || [],
  }, { headers })
}
