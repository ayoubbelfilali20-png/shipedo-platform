import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const ORDER_COLS = 'id, seller_id, assigned_agent_id, status, total_amount, original_total, call_attempts, last_call_agent_id, reminded_at, created_at, tracking_number, customer_name, delivered_at, shipped_at, returned_at, shipped_to_agent_at, last_call_at'

async function fetchAllOrders() {
  const allOrders: any[] = []
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data } = await supabaseAdmin.from('orders')
      .select(ORDER_COLS)
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
  const [orders, { data: sellers }, { data: agents }] = await Promise.all([
    fetchAllOrders(),
    supabaseAdmin.from('sellers').select('id, name, company, email, city, status'),
    supabaseAdmin.from('agents').select('id, name, email, status'),
  ])

  return NextResponse.json({
    orders,
    sellers: sellers || [],
    agents: agents || [],
  })
}
