import { SupabaseClient } from '@supabase/supabase-js'

export async function pickAgentForOrder(client: SupabaseClient, customerPhone?: string): Promise<string | null> {
  const { data: agents } = await client
    .from('agents')
    .select('id')
    .eq('status', 'active')

  if (!agents || agents.length === 0) return null

  // If this client already has orders assigned to an agent, use the same agent
  if (customerPhone) {
    const normalized = customerPhone.replace(/[^\d]/g, '').slice(-9)
    if (normalized.length >= 8) {
      const { data: existing } = await client
        .from('orders')
        .select('assigned_agent_id, customer_phone')
        .not('assigned_agent_id', 'is', null)
        .ilike('customer_phone', `%${normalized}`)
        .order('created_at', { ascending: false })
        .limit(1)
      const agentIds = new Set(agents.map(a => a.id))
      if (existing?.[0] && agentIds.has(existing[0].assigned_agent_id)) {
        return existing[0].assigned_agent_id
      }
    }
  }

  if (agents.length === 1) return agents[0].id

  const todayCutoff = new Date()
  todayCutoff.setHours(0, 0, 0, 0)

  const { data: todayOrders } = await client
    .from('orders')
    .select('assigned_agent_id')
    .gte('created_at', todayCutoff.toISOString())
    .not('assigned_agent_id', 'is', null)

  const counts = new Map<string, number>()
  agents.forEach(a => counts.set(a.id, 0))
  ;(todayOrders || []).forEach((o: any) => {
    if (counts.has(o.assigned_agent_id)) {
      counts.set(o.assigned_agent_id, (counts.get(o.assigned_agent_id) || 0) + 1)
    }
  })

  let bestId: string | null = null
  let bestCount = Infinity
  for (const [id, count] of counts.entries()) {
    if (count < bestCount) {
      bestCount = count
      bestId = id
    }
  }
  return bestId
}
