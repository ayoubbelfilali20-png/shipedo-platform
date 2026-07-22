import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { orderId, newStatus, deliveryTracking, preserveShippedToAgent, incrementStock, items } = body

  if (!orderId || !newStatus) {
    return NextResponse.json({ ok: false, error: 'Missing orderId or newStatus' }, { status: 400 })
  }

  const nowIso = new Date().toISOString()
  const patch: any = {
    status: newStatus,
    status_changed_at: nowIso,
  }

  if (newStatus === 'confirmed' || newStatus === 'prepared') {
    patch.last_call_at = nowIso
    patch.shipped_to_agent_at = null
    patch.shipped_at = null
    patch.delivered_at = null
    patch.returned_at = null
  }

  if (newStatus === 'shipped_to_agent') {
    if (!preserveShippedToAgent) {
      patch.shipped_to_agent_at = nowIso
    }
    if (deliveryTracking !== undefined) {
      patch.delivery_tracking = deliveryTracking || null
    }
  }

  if (newStatus === 'shipped') {
    patch.shipped_at = nowIso
    if (deliveryTracking) patch.delivery_tracking = deliveryTracking
  }

  if (newStatus === 'delivered') {
    patch.delivered_at = nowIso
  }

  if (newStatus === 'returned') {
    patch.returned_at = nowIso
  }

  if (newStatus === 'pending') {
    patch.shipped_to_agent_at = null
    patch.shipped_at = null
    patch.delivered_at = null
    patch.returned_at = null
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update(patch)
    .eq('id', orderId)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, order: data, patch })
}
