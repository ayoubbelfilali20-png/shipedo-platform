import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { pickAgentForOrder } from '@/lib/agentAssignment'

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
  const phone    = String(body.phone    || '').trim()
  if (!fullName || !phone) {
    return NextResponse.json({ ok: false, error: 'fullName and phone are required' }, { status: 400 })
  }

  const sku = body.sku ? String(body.sku).trim() : ''

  // Reuse the Order ID from the sheet if present, otherwise generate one
  const trackingNumber =
    (body.orderId && String(body.orderId).trim()) ||
    `ORD-${Date.now().toString(36).toUpperCase()}`

  // ── Deduplication: if this order already exists, return success immediately
  // (prevents sheet from creating duplicate orders when it retries ERR rows)
  if (trackingNumber) {
    const { data: existing } = await supabaseAdmin
      .from('orders')
      .select('id, tracking_number')
      .eq('tracking_number', trackingNumber)
      .eq('seller_id', seller.id)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ ok: true, order: existing })
    }
  }

  // The user's Apps Script sends totalCharge=qty and totalQuantity=price (swapped)
  const total = parseFloat(body.totalQuantity) || 0
  const qty   = parseInt(body.totalCharge)     || 1

  // ── Match product by SKU
  let productId: string | null = null
  let productName: string = sku || 'Sheet item'

  if (sku) {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id, name')
      .eq('seller_id', seller.id)
      .eq('sku', sku)
      .maybeSingle()
    if (product) {
      productId = product.id
      productName = product.name
    }
  }

  const items = [{
    product_id: productId,
    name:       productName,
    sku,
    quantity:   qty,
    unit_price: qty > 0 ? total / qty : total,
  }]

  const assignedAgentId = await pickAgentForOrder(supabaseAdmin)

  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert({
      tracking_number:   trackingNumber,
      seller_id:         seller.id,
      seller_name:       seller.name,
      assigned_agent_id: assignedAgentId,
      customer_name:     fullName,
      customer_phone:    phone,
      customer_city:     String(body.city || ''),
      customer_address:  '',
      country:           'Kenya',
      source:            'Sheet',
      items,
      total_amount:      total,
      status:            'pending',
      payment_method:    'COD',
    })
    .select('id, tracking_number')
    .single()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, order: data })
}
