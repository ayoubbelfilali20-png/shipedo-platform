import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

async function fetchAllSellerOrders(sellerId: string, cutoffIso: string) {
  const cols = 'id, seller_id, status, total_amount, original_total, items, created_at, shipped_at, delivered_at, returned_at, last_call_at, shipped_to_agent_at, status_changed_at'
  const pages = [0, 1, 2, 3, 4]

  const results = await Promise.all(
    pages.map(p =>
      supabaseAdmin.from('orders')
        .select(cols)
        .eq('seller_id', sellerId)
        .or(`created_at.gte.${cutoffIso},last_call_at.gte.${cutoffIso},shipped_at.gte.${cutoffIso},shipped_to_agent_at.gte.${cutoffIso},delivered_at.gte.${cutoffIso},returned_at.gte.${cutoffIso},status_changed_at.gte.${cutoffIso}`)
        .order('created_at', { ascending: false })
        .range(p * 1000, (p + 1) * 1000 - 1)
    )
  )

  return results.flatMap(r => r.data || [])
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
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
