import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const ORDER_COLS = 'id, seller_id, assigned_agent_id, status, total_amount, original_total, call_attempts, last_call_agent_id, reminded_at, created_at, tracking_number, customer_name, delivered_at, shipped_at, returned_at, shipped_to_agent_at, last_call_at, status_changed_at'

async function fetchPaginated(query: any) {
  const all: any[] = []
  for (let p = 0; p < 10; p++) {
    const { data } = await query.range(p * 1000, (p + 1) * 1000 - 1)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < 1000) break
  }
  return all
}

export async function GET(req: NextRequest) {
  const all = (req as any).nextUrl?.searchParams?.get('all') === '1'
  const days = Number((req as any).nextUrl?.searchParams?.get('days')) || 30

  if (all) {
    const [orders, { data: sellers }, { data: agents }] = await Promise.all([
      fetchPaginated(
        supabaseAdmin.from('orders').select(ORDER_COLS).order('created_at', { ascending: false })
      ),
      supabaseAdmin.from('sellers').select('id, name, company, email, city, status'),
      supabaseAdmin.from('agents').select('id, name, email, status'),
    ])
    return NextResponse.json({ orders, sellers: sellers || [], agents: agents || [] })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffIso = cutoff.toISOString()

  const [orders, { data: sellers }, { data: agents }] = await Promise.all([
    fetchPaginated(
      supabaseAdmin.from('orders').select(ORDER_COLS)
        .or(`created_at.gte.${cutoffIso},last_call_at.gte.${cutoffIso},shipped_at.gte.${cutoffIso},shipped_to_agent_at.gte.${cutoffIso},delivered_at.gte.${cutoffIso},returned_at.gte.${cutoffIso},status_changed_at.gte.${cutoffIso}`)
        .order('created_at', { ascending: false })
    ),
    supabaseAdmin.from('sellers').select('id, name, company, email, city, status'),
    supabaseAdmin.from('agents').select('id, name, email, status'),
  ])

  return NextResponse.json({
    orders,
    sellers: sellers || [],
    agents: agents || [],
  })
}
