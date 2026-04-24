import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { enrichOrderImages } from '@/lib/enrichOrderImages'

export async function GET(req: NextRequest) {
  const sellerId = req.headers.get('x-seller-id')
  if (!sellerId) return NextResponse.json({ ok: false }, { status: 401 })

  const days = Number(req.nextUrl.searchParams.get('days')) || 30
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const [ordersRes, payoutsRes, productsRes] = await Promise.all([
    supabaseAdmin.from('orders')
      .select('id, seller_id, status, total_amount, original_total, items, created_at, shipped_at, delivered_at, returned_at, last_call_at, shipped_to_agent_at')
      .eq('seller_id', sellerId)
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false })
      .limit(1000),
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

  const enrichedOrders = await enrichOrderImages(ordersRes.data || [], supabaseAdmin)

  return NextResponse.json({
    orders: enrichedOrders,
    payouts: payoutsRes.data || [],
    products: productsRes.data || [],
  })
}
