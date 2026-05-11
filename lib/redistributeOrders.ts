import { supabaseAdmin } from '@/lib/supabaseAdmin'

let lastRedistribute = 0

export async function redistributePendingOrders() {
  // Only run once per 60 seconds to avoid hammering DB
  const now = Date.now()
  if (now - lastRedistribute < 60_000) return
  lastRedistribute = now

  const [{ data: agents }, { data: unassigned }] = await Promise.all([
    supabaseAdmin.from('agents').select('id').eq('status', 'active'),
    supabaseAdmin.from('orders').select('id, assigned_agent_id')
      .eq('status', 'pending')
      .or('call_attempts.is.null,call_attempts.eq.0')
      .order('created_at', { ascending: false }),
  ])

  if (!agents || agents.length === 0 || !unassigned || unassigned.length === 0) return

  const agentIds = agents.map(a => a.id)

  // Count how many uncalled orders each agent already has
  const counts = new Map<string, number>()
  agentIds.forEach(id => counts.set(id, 0))
  unassigned.forEach(o => {
    if (o.assigned_agent_id && counts.has(o.assigned_agent_id)) {
      counts.set(o.assigned_agent_id, (counts.get(o.assigned_agent_id) || 0) + 1)
    }
  })

  // Check if already balanced (max diff <= 1)
  const vals = [...counts.values()]
  if (vals.length > 0 && Math.max(...vals) - Math.min(...vals) <= 1) {
    // Check no unassigned or assigned to inactive agents
    const needsFix = unassigned.some(o => !o.assigned_agent_id || !counts.has(o.assigned_agent_id))
    if (!needsFix) return
  }

  // Redistribute evenly: round-robin assignment
  const updates: { id: string; agent: string }[] = []
  unassigned.forEach((order, i) => {
    const targetAgent = agentIds[i % agentIds.length]
    if (order.assigned_agent_id !== targetAgent) {
      updates.push({ id: order.id, agent: targetAgent })
    }
  })

  if (updates.length > 0) {
    await Promise.all(
      updates.map(u =>
        supabaseAdmin.from('orders').update({ assigned_agent_id: u.agent }).eq('id', u.id)
      )
    )
  }
}
