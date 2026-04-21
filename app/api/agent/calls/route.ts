import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { enrichOrderImages } from '@/lib/enrichOrderImages'

const COLS = 'id, tracking_number, customer_name, customer_phone, customer_city, customer_address, items, total_amount, original_total, status, payment_method, notes, call_attempts, reminded_at, last_call_note, cancel_reason, created_at, seller_id'

export async function GET(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return NextResponse.json({ ok: false }, { status: 401 })

  const nowIso = new Date().toISOString()

  const [{ data }, { data: confData }, { data: cancelData }] = await Promise.all([
    supabaseAdmin.from('orders').select(COLS)
      .eq('status', 'pending').eq('assigned_agent_id', agentId)
      .or(`reminded_at.is.null,reminded_at.lte.${nowIso}`)
      .order('created_at', { ascending: true }).limit(500),
    supabaseAdmin.from('orders').select(COLS)
      .eq('status', 'confirmed').eq('printed', false)
      .order('created_at', { ascending: true }).limit(500),
    supabaseAdmin.from('orders').select(COLS)
      .eq('status', 'cancelled').eq('assigned_agent_id', agentId)
      .order('created_at', { ascending: true }).limit(500),
  ])

  const [enrichedPending, enrichedConfirmed, enrichedCancelled] = await Promise.all([
    enrichOrderImages(data || [], supabaseAdmin),
    enrichOrderImages(confData || [], supabaseAdmin),
    enrichOrderImages(cancelData || [], supabaseAdmin),
  ])

  return NextResponse.json({
    pending: enrichedPending,
    confirmed: enrichedConfirmed,
    cancelled: enrichedCancelled,
  })
}
