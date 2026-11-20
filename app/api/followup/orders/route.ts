import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const COLS = 'id, tracking_number, customer_name, customer_phone, customer_city, customer_address, items, total_amount, original_total, status, payment_method, notes, last_call_note, shipped_at, shipped_to_agent_at, delivered_at, returned_at, created_at, seller_id, delivery_tracking, country, paid_by_agent_at'

const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

export async function GET(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  if (!agentId) return NextResponse.json({ orders: [], notes: {} }, { status: 401 })

  const agentCountry = req.headers.get('x-agent-country')
  const statusFilter = req.nextUrl.searchParams.get('status')
  const showAll = req.nextUrl.searchParams.get('all') === '1'

  let q = supabaseAdmin.from('orders').select(COLS)
    .in('status', ['shipped_to_agent', 'delivered_by_agent', 'returned'])
    .order('created_at', { ascending: false })

  if (agentCountry) {
    q = q.eq('country', agentCountry)
  }

  if (statusFilter) {
    q = q.eq('status', statusFilter)
  }

  if (!showAll) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 60)
    q = q.gte('created_at', cutoff.toISOString())
  }

  const { data: orders, error } = await q.limit(2000)
  if (error) return NextResponse.json({ orders: [], notes: {}, error: error.message }, { status: 500 })

  const orderIds = (orders || []).map((o: any) => o.id)
  let notesByOrder: Record<string, any[]> = {}
  if (orderIds.length > 0) {
    const batches = []
    for (let i = 0; i < orderIds.length; i += 100) {
      batches.push(orderIds.slice(i, i + 100))
    }
    const noteResults = await Promise.all(
      batches.map(batch =>
        supabaseAdmin.from('followup_notes')
          .select('id, order_id, agent_id, agent_name, note, created_at')
          .in('order_id', batch)
          .order('created_at', { ascending: false })
      )
    )
    for (const r of noteResults) {
      for (const n of r.data || []) {
        if (!notesByOrder[n.order_id]) notesByOrder[n.order_id] = []
        notesByOrder[n.order_id].push(n)
      }
    }
  }

  return NextResponse.json({ orders: orders || [], notes: notesByOrder }, { headers })
}

export async function POST(req: NextRequest) {
  const agentId = req.headers.get('x-agent-id')
  const agentName = req.headers.get('x-agent-name') || 'Follow-up Agent'
  if (!agentId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, orderId, note } = body

  if (action === 'add_note') {
    if (!orderId || !note) return NextResponse.json({ ok: false, error: 'Missing orderId or note' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('followup_notes').insert({
      order_id: orderId,
      agent_id: agentId,
      agent_name: agentName,
      note: note.trim(),
    }).select().single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, note: data })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
