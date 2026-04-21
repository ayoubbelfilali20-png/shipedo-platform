import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { enrichOrderImages } from '@/lib/enrichOrderImages'

const COLS = 'id, tracking_number, customer_name, customer_phone, customer_city, items, total_amount, original_total, status, source, subuser, created_at, call_attempts, reminded_at, cancel_reason'
const STATUSES = ['pending', 'confirmed', 'cancelled']

export async function GET(req: NextRequest) {
  const sellerId = req.headers.get('x-seller-id')
  if (!sellerId) {
    return NextResponse.json({ ok: false, error: 'missing seller id' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(COLS)
    .eq('seller_id', sellerId)
    .in('status', STATUSES)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const enriched = await enrichOrderImages(data || [], supabaseAdmin)
  return NextResponse.json(enriched)
}
