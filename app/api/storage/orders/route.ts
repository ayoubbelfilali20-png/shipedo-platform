import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const COLS_FULL = 'id, tracking_number, delivery_tracking, customer_name, customer_phone, customer_city, customer_address, items, total_amount, status, payment_method, printed, print_count, notes, last_call_note, shipped_to_agent_at, shipped_at, delivered_at, returned_at, last_call_at, created_at, last_call_agent_id, assigned_agent_id, status_changed_at'

const COLS_SAFE = 'id, tracking_number, delivery_tracking, customer_name, customer_phone, customer_city, customer_address, items, total_amount, status, payment_method, printed, print_count, notes, last_call_note, shipped_to_agent_at, shipped_at, delivered_at, returned_at, last_call_at, created_at, last_call_agent_id, assigned_agent_id'

const STATUSES = ['confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered', 'returned']
const pages = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

export async function GET() {
  let cols = COLS_FULL
  const test = await supabaseAdmin.from('orders').select('status_changed_at').limit(1)
  if (test.error) cols = COLS_SAFE

  const [orderResults, { data: agents }] = await Promise.all([
    Promise.all(
      pages.map(p =>
        supabaseAdmin.from('orders').select(cols)
          .in('status', STATUSES)
          .order('last_call_at', { ascending: false, nullsFirst: false })
          .range(p * 1000, (p + 1) * 1000 - 1)
      )
    ),
    supabaseAdmin.from('agents').select('id, name'),
  ])

  return NextResponse.json({
    orders: orderResults.flatMap(r => r.data || []),
    agents: agents || [],
  }, { headers })
}
