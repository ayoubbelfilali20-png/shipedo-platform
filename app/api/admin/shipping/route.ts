import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const COLS = 'id, tracking_number, customer_name, customer_phone, customer_city, customer_address, items, total_amount, original_total, status, payment_method, printed, print_count, notes, last_call_note, shipped_at, shipped_to_agent_at, delivered_at, returned_at, last_call_at, created_at, seller_id, call_attempts, reminded_at, cancel_reason, assigned_agent_id'

async function fetchAllOrders() {
  const allOrders: any[] = []
  let from = 0
  const pageSize = 1000

  while (true) {
    const { data } = await supabaseAdmin.from('orders')
      .select(COLS)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (!data || data.length === 0) break
    allOrders.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

  return allOrders
}

export async function GET() {
  const orders = await fetchAllOrders()
  return NextResponse.json({ orders })
}
