import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const COLS = 'id, tracking_number, customer_name, customer_phone, customer_city, customer_address, items, total_amount, original_total, status, payment_method, printed, print_count, notes, last_call_note, shipped_at, shipped_to_agent_at, delivered_at, returned_at, last_call_at, created_at, seller_id, call_attempts, reminded_at, cancel_reason, assigned_agent_id, delivery_tracking'

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get('all') === '1'
  const days = Number(req.nextUrl.searchParams.get('days')) || 30

  if (all) {
    const pages = [0, 1, 2, 3, 4]
    const results = await Promise.all(
      pages.map(p =>
        supabaseAdmin.from('orders').select(COLS)
          .order('created_at', { ascending: false })
          .range(p * 1000, (p + 1) * 1000 - 1)
      )
    )
    return NextResponse.json({ orders: results.flatMap(r => r.data || []) })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffIso = cutoff.toISOString()

  const { data, error } = await supabaseAdmin.from('orders').select(COLS)
    .or(`created_at.gte.${cutoffIso},last_call_at.gte.${cutoffIso},shipped_at.gte.${cutoffIso},shipped_to_agent_at.gte.${cutoffIso},delivered_at.gte.${cutoffIso},returned_at.gte.${cutoffIso}`)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) {
    return NextResponse.json({ orders: [] }, { status: 500 })
  }

  return NextResponse.json({ orders: data || [] })
}
