import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const COLS_FULL = 'id, tracking_number, customer_name, customer_phone, customer_city, customer_address, items, total_amount, original_total, status, payment_method, printed, print_count, notes, last_call_note, shipped_at, shipped_to_agent_at, delivered_at, returned_at, last_call_at, created_at, seller_id, call_attempts, reminded_at, cancel_reason, delivery_tracking, status_changed_at'

const COLS_SAFE = 'id, tracking_number, customer_name, customer_phone, customer_city, customer_address, items, total_amount, original_total, status, payment_method, printed, print_count, notes, last_call_note, shipped_at, shipped_to_agent_at, delivered_at, returned_at, last_call_at, created_at, seller_id, call_attempts, reminded_at, cancel_reason, delivery_tracking'

const pages = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
const STATUSES = ['confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered', 'returned']

export async function GET(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return NextResponse.json({ orders: [] }, { status: 401 })

  const all = req.nextUrl.searchParams.get('all') === '1'

  // detect if status_changed_at exists
  let cols = COLS_FULL
  const test = await supabaseAdmin.from('orders').select('status_changed_at').limit(1)
  if (test.error) cols = COLS_SAFE

  const results = await Promise.all(
    pages.map(p => {
      let q = supabaseAdmin.from('orders').select(cols)
        .eq('assigned_agent_id', agentId)
        .in('status', STATUSES)
        .order('created_at', { ascending: false })
      if (!all) {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 30)
        q = q.gte('created_at', cutoff.toISOString())
      }
      return q.range(p * 1000, (p + 1) * 1000 - 1)
    })
  )

  const orders = results.flatMap(r => r.data || [])
  return NextResponse.json({ orders }, { headers })
}
