import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Ingest a new row from a seller's Google Sheet.
 *
 * Auth: header `x-sheet-token: <seller.sheet_ingest_token>`
 * Body: { orderId?, sku?, fullName, phone, city?, totalCharge?, totalQuantity?, productUrl? }
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get('x-sheet-token')
  if (!token) {
    return NextResponse.json({ ok: false, error: 'missing token' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 })
  }

  const { data: seller, error: sErr } = await supabaseAdmin
    .from('sellers')
    .select('id, name')
    .eq('sheet_ingest_token', token)
    .maybeSingle()

  if (sErr || !seller) {
    return NextResponse.json({ ok: false, error: 'invalid token' }, { status: 401 })
  }

  const fullName = String(body.fullName || '').trim()
  const phone = String(body.phone || '').trim()
  if (!fullName || !phone) {
    return NextResponse.json(
      { ok: false, error: 'fullName and phone are required' },
      { status: 400 }
    )
  }

  const qty = parseInt(body.totalQuantity) || 1
  const total = parseFloat(body.totalCharge) || 0
  const sku = body.sku ? String(body.sku).trim() : ''
  const productUrl = body.productUrl ? String(body.productUrl) : ''

  // Reuse the Order ID from the sheet if present, otherwise generate one
  const trackingNumber =
    (body.orderId && String(body.orderId).trim()) ||
    `ORD-${Date.now().toString(36).toUpperCase()}`

  // Try to match product by SKU for this seller
  let productId: string | null = null
  let productName: string = sku || 'Sheet item'
  let unitPrice: number = qty > 0 ? total / qty : total

  if (sku) {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id, name, selling_price')
      .eq('seller_id', seller.id)
      .eq('sku', sku)
      .maybeSingle()

    if (product) {
      productId = product.id
      productName = product.name
      unitPrice = product.selling_price ?? unitPrice
    }
  }

  const items = [
    {
      product_id: productId,
      name: productName,
      sku,
      quantity: qty,
      unit_price: unitPrice,
    },
  ]

  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert({
      tracking_number: trackingNumber,
      seller_id: seller.id,
      seller_name: seller.name,
      customer_name: fullName,
      customer_phone: phone,
      customer_city: String(body.city || ''),
      customer_address: '',
      country: 'Kenya',
      source: productUrl || 'google-sheet',
      items,
      total_amount: total,
      status: 'pending',
      payment_method: 'COD',
    })
    .select('id, tracking_number')
    .single()

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, order: data })
}
