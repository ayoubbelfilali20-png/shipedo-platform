import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const COLS = 'id, tracking_number, customer_name, customer_phone, customer_city, customer_address, items, total_amount, original_total, status, payment_method, printed, print_count, notes, last_call_note, shipped_at, shipped_to_agent_at, delivered_at, returned_at, last_call_at, created_at, seller_id, call_attempts, reminded_at, cancel_reason, assigned_agent_id'

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get('all') === '1'
  const days = Number(req.nextUrl.searchParams.get('days')) || 30

  let query = supabaseAdmin.from('orders').select(COLS)

  if (!all) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    query = query.gte('created_at', cutoff.toISOString())
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) {
    return NextResponse.json({ orders: [] }, { status: 500 })
  }

  if (all) {
    const pages = [1, 2, 3, 4]
    const more = await Promise.all(
      pages.map(p =>
        supabaseAdmin.from('orders').select(COLS)
          .order('created_at', { ascending: false })
          .range(p * 1000, (p + 1) * 1000 - 1)
      )
    )
    const orders = [
      ...(data || []),
      ...more.flatMap(r => r.data || []),
    ]
    return NextResponse.json({ orders })
  }

  return NextResponse.json({ orders: data || [] })
}
