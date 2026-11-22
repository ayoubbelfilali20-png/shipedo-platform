import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Shared order notes, visible to every role. Stored in followup_notes so the
// follow-up dashboard and all other pages read/write the same thread.

const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ANON_UUID = '00000000-0000-0000-0000-000000000000'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 })

  if (body.action === 'list') {
    const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((id: any) => UUID_RE.test(String(id))) : []
    if (ids.length === 0) return NextResponse.json({ ok: true, notes: {} }, { headers })
    const batches: string[][] = []
    for (let i = 0; i < ids.length; i += 100) batches.push(ids.slice(i, i + 100))
    const results = await Promise.all(
      batches.map(batch =>
        supabaseAdmin.from('followup_notes')
          .select('id, order_id, agent_id, agent_name, note, created_at')
          .in('order_id', batch)
          .order('created_at', { ascending: false })
      )
    )
    const notes: Record<string, any[]> = {}
    for (const r of results) {
      for (const n of r.data || []) {
        if (!notes[n.order_id]) notes[n.order_id] = []
        notes[n.order_id].push(n)
      }
    }
    return NextResponse.json({ ok: true, notes }, { headers })
  }

  if (body.action === 'add') {
    const { orderId, note, userId, userName, userRole } = body
    if (!orderId || !note?.trim()) return NextResponse.json({ ok: false, error: 'Missing orderId or note' }, { status: 400 })
    const name = (userName || 'User').toString().slice(0, 80)
    const role = (userRole || '').toString().slice(0, 20)
    const { data, error } = await supabaseAdmin.from('followup_notes').insert({
      order_id: orderId,
      agent_id: UUID_RE.test(String(userId)) ? userId : ANON_UUID,
      agent_name: role && role !== 'followup' ? `${name} (${role})` : name,
      note: note.trim(),
    }).select().single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, note: data }, { headers })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
