import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const COLS = 'id, tracking_number, customer_name, customer_phone, customer_city, items, total_amount, original_total, status, source, subuser, created_at, call_attempts, reminded_at, cancel_reason'
const STATUSES = ['pending', 'confirmed', 'cancelled']

export async function GET(req: NextRequest) {
  const sellerId = req.headers.get('x-seller-id')
  if (!sellerId) {
    return NextResponse.json({ ok: false, error: 'missing seller id' }, { status: 401 })
  }

  const allOrders: any[] = []
  let from = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(COLS)
      .eq('seller_id', sellerId)
      .in('status', STATUSES)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    if (!data || data.length === 0) break
    allOrders.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

  return NextResponse.json(allOrders)
}
