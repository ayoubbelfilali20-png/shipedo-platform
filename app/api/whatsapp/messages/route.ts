import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone')
  const orderId = req.nextUrl.searchParams.get('orderId')

  if (!phone && !orderId) {
    return NextResponse.json({ ok: false, error: 'phone or orderId required' }, { status: 400 })
  }

  let q = supabaseAdmin
    .from('whatsapp_messages')
    .select('id, order_id, phone, direction, body, agent_name, created_at')
    .order('created_at', { ascending: true })
    .limit(100)

  if (phone) {
    // Normalize phone for matching
    let num = phone.replace(/[^\d]/g, '')
    if (/^0[17]\d{8}$/.test(num)) num = '254' + num.slice(1)
    q = q.eq('phone', num)
  } else if (orderId) {
    q = q.eq('order_id', orderId)
  }

  const { data, error } = await q
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
