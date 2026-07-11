import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { assignUnassignedOrders } from '@/lib/redistributeOrders'

const COLS = 'id, tracking_number, customer_name, customer_phone, customer_city, customer_address, items, total_amount, original_total, status, payment_method, notes, call_attempts, reminded_at, last_call_note, cancel_reason, created_at, seller_id'

export async function GET(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return NextResponse.json({ ok: false }, { status: 401 })

  assignUnassignedOrders()

  const nowIso = new Date().toISOString()

  const [{ data: newOrders }, { data: followUp }, { data: confData }, { data: nextRemind }, newCount, followUpCount] = await Promise.all([
    supabaseAdmin.from('orders').select(COLS)
      .eq('status', 'pending').eq('assigned_agent_id', agentId)
      .is('reminded_at', null)
      .or('call_attempts.is.null,call_attempts.eq.0')
      .order('created_at', { ascending: true }).limit(500),
    supabaseAdmin.from('orders').select(COLS)
      .eq('status', 'pending').eq('assigned_agent_id', agentId)
      .not('reminded_at', 'is', null)
      .lte('reminded_at', nowIso)
      .order('reminded_at', { ascending: true }).limit(500),
    supabaseAdmin.from('orders').select(COLS)
      .eq('status', 'confirmed').eq('assigned_agent_id', agentId).eq('printed', false)
      .order('created_at', { ascending: true }).limit(500),
    supabaseAdmin.from('orders').select('reminded_at')
      .eq('status', 'pending').eq('assigned_agent_id', agentId)
      .gt('reminded_at', nowIso)
      .order('reminded_at', { ascending: true }).limit(1),
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true })
      .eq('status', 'pending').eq('assigned_agent_id', agentId)
      .is('reminded_at', null)
      .or('call_attempts.is.null,call_attempts.eq.0'),
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true })
      .eq('status', 'pending').eq('assigned_agent_id', agentId)
      .not('reminded_at', 'is', null)
      .lte('reminded_at', nowIso),
  ])

  const pending = [...(newOrders || []), ...(followUp || [])]

  return NextResponse.json({
    pending,
    confirmed: confData || [],
    nextRemindAt: nextRemind?.[0]?.reminded_at || null,
    counts: {
      new: newCount.count || 0,
      followUp: followUpCount.count || 0,
    },
  })
}
