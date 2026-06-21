import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const PAGE_SIZE = 100

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const page = parseInt(sp.get('page') || '0', 10)
  const status = sp.get('status') || 'all'
  const search = sp.get('search')?.trim() || ''

  let q = supabaseAdmin.from('orders')
    .select('id, tracking_number, customer_name, customer_phone, customer_city, customer_address, items, total_amount, original_total, status, payment_method, notes, cancel_reason, printed, created_at, seller_id, assigned_agent_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (status !== 'all') q = q.eq('status', status)
  if (search) {
    q = q.or(`tracking_number.ilike.%${search}%,delivery_tracking.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,customer_city.ilike.%${search}%`)
  }

  const { data, count } = await q

  return NextResponse.json({
    orders: data || [],
    total: count || 0,
  })
}
