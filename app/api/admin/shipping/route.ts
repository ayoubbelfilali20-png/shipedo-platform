import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const loadAll = req.nextUrl.searchParams.get('all') === '1'

  const { data } = await supabaseAdmin
    .from('orders')
    .select('id, tracking_number, customer_name, customer_phone, customer_city, customer_address, items, total_amount, original_total, status, payment_method, printed, print_count, notes, last_call_note, shipped_at, shipped_to_agent_at, delivered_at, returned_at, last_call_at, created_at, seller_id, call_attempts, reminded_at, cancel_reason, assigned_agent_id')
    .in('status', ['pending', 'confirmed', 'prepared', 'shipped_to_agent', 'shipped', 'delivered', 'returned', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(loadAll ? 50000 : 10000)

  return NextResponse.json({ orders: data || [] })
}
