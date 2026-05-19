import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const ORDER_COLS = 'id, seller_id, assigned_agent_id, status, total_amount, original_total, call_attempts, last_call_agent_id, reminded_at, created_at, tracking_number, customer_name, delivered_at, shipped_at, returned_at, shipped_to_agent_at, last_call_at'

export async function GET(req: NextRequest) {
  const all = (req as any).nextUrl?.searchParams?.get('all') === '1'
  const days = Number((req as any).nextUrl?.searchParams?.get('days')) || 30

  if (all) {
    const pages = [0, 1, 2, 3, 4]
    const [p0, p1, p2, p3, p4, { data: sellers }, { data: agents }] = await Promise.all([
      ...pages.map(p => supabaseAdmin.from('orders').select(ORDER_COLS).order('created_at', { ascending: false }).range(p * 1000, (p + 1) * 1000 - 1)),
      supabaseAdmin.from('sellers').select('id, name, company, email, city, status'),
      supabaseAdmin.from('agents').select('id, name, email, status'),
    ])
    const orders = [...(p0.data || []), ...(p1.data || []), ...(p2.data || []), ...(p3.data || []), ...(p4.data || [])]
    return NextResponse.json({ orders, sellers: sellers || [], agents: agents || [] })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffIso = cutoff.toISOString()

  const [{ data: orders }, { data: sellers }, { data: agents }] = await Promise.all([
    supabaseAdmin.from('orders').select(ORDER_COLS)
      .or(`created_at.gte.${cutoffIso},last_call_at.gte.${cutoffIso},shipped_at.gte.${cutoffIso},shipped_to_agent_at.gte.${cutoffIso},delivered_at.gte.${cutoffIso},returned_at.gte.${cutoffIso}`)
      .order('created_at', { ascending: false }).limit(1000),
    supabaseAdmin.from('sellers').select('id, name, company, email, city, status'),
    supabaseAdmin.from('agents').select('id, name, email, status'),
  ])

  return NextResponse.json({
    orders: orders || [],
    sellers: sellers || [],
    agents: agents || [],
  })
}
