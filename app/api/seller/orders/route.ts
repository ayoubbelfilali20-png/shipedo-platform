import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const COLS = 'id, tracking_number, customer_name, customer_phone, customer_city, items, total_amount, original_total, status, source, subuser, created_at, call_attempts, reminded_at, cancel_reason'
const STATUSES = ['pending', 'confirmed', 'cancelled']

export async function GET(req: NextRequest) {
  const sellerId = req.headers.get('x-seller-id')
  if (!sellerId) {
    return NextResponse.json({ ok: false, error: 'missing seller id' }, { status: 401 })
  }

  const pages = [0, 1, 2, 3, 4]

  const results = await Promise.all(
    pages.map(p =>
      supabaseAdmin.from('orders')
        .select(COLS)
        .eq('seller_id', sellerId)
        .in('status', STATUSES)
        .order('created_at', { ascending: false })
        .range(p * 1000, (p + 1) * 1000 - 1)
    )
  )

  const err = results.find(r => r.error)
  if (err?.error) {
    return NextResponse.json({ ok: false, error: err.error.message }, { status: 500 })
  }

  const allOrders = results.flatMap(r => r.data || [])
  return NextResponse.json(allOrders)
}
