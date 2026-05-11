import { SupabaseClient } from '@supabase/supabase-js'

export async function pickAgentForOrder(client: SupabaseClient): Promise<string | null> {
  const { data: agents } = await client
    .from('agents')
    .select('id')
    .eq('status', 'active')

  if (!agents || agents.length === 0) return null
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
