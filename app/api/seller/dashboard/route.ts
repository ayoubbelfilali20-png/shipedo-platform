import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

async function fetchAllSellerOrders(sellerId: string, cutoffIso: string) {
  const cols = 'id, seller_id, status, total_amount, original_total, items, created_at, shipped_at, delivered_at, returned_at, last_call_at, shipped_to_agent_at'
  const allOrders: any[] = []
  let from = 0
  const pageSize = 1000

  while (true) {
    const { data } = await supabaseAdmin.from('orders')
      .select(cols)
      .eq('seller_id', sellerId)
      .gte('created_at', cutoffIso)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (!data || data.length === 0) break
    allOrders.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

  return allOrders
}

export async function GET(req: NextRequest) {
  const sellerId = req.headers.get('x-seller-id')
  if (!sellerId) return NextResponse.json({ ok: false }, { status: 401 })

  const days = Number(req.nextUrl.searchParams.get('days')) || 30
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const [orders, payoutsRes, productsRes] = await Promise.all([
    fetchAllSellerOrders(sellerId, cutoff.toISOString()),
    supabaseAdmin.from('seller_payouts')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('status', 'sent')
      .order('period_end', { ascending: false }),
    supabaseAdmin.from('products')
      .select('id, name, sku, image_url')
      .eq('seller_id', sellerId)
      .order('name'),
  ])

  return NextResponse.json({
    orders,
    payouts: payoutsRes.data || [],
    products: productsRes.data || [],
  })
}
