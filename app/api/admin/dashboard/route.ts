import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  const [{ data: orders }, { data: sellers }, { data: agents }] = await Promise.all([
    supabaseAdmin.from('orders')
      .select('id, seller_id, assigned_agent_id, status, total_amount, original_total, call_attempts, last_call_agent_id, reminded_at, created_at, tracking_number, customer_name, delivered_at, shipped_at, returned_at, shipped_to_agent_at, last_call_at')
      .order('created_at', { ascending: false })
      .limit(50000),
    supabaseAdmin.from('sellers').select('id, name, company, email, city, status'),
    supabaseAdmin.from('agents').select('id, name, email, status'),
  ])

  return NextResponse.json({
    orders: orders || [],
    sellers: sellers || [],
    agents: agents || [],
  })
}
