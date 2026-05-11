import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function assignUnassignedOrders() {
  const [{ data: agents }, { data: unassigned }] = await Promise.all([
    supabaseAdmin.from('agents').select('id').eq('status', 'active').order('created_at', { ascending: true }),
    supabaseAdmin.from('orders').select('id')
      .eq('status', 'pending')
      .is('assigned_agent_id', null)
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  if (!agents || agents.length === 0 || !unassigned || unassigned.length === 0) return

  const agentIds = agents.map(a => a.id)

  // Count current pending orders per agent to continue balanced assignment
  const { data: assigned } = await supabaseAdmin
    .from('orders').select('assigned_agent_id')
    .eq('status', 'pending')
    .not('assigned_agent_id', 'is', null)

  const counts = new Map<string, number>()
  agentIds.forEach(id => counts.set(id, 0))
  ;(assigned || []).forEach((o: any) => {
    if (counts.has(o.assigned_agent_id))
      counts.set(o.assigned_agent_id, (counts.get(o.assigned_agent_id) || 0) + 1)
  })

  for (const order of unassigned) {
    // Pick agent with fewest orders
    let bestId = agentIds[0]
    let bestCount = Infinity
    for (const id of agentIds) {
      const c = counts.get(id) || 0
      if (c < bestCount) { bestCount = c; bestId = id }
    }
    await supabaseAdmin.from('orders').update({ assigned_agent_id: bestId }).eq('id', order.id)
    counts.set(bestId, (counts.get(bestId) || 0) + 1)
  }
}
