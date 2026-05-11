import { SupabaseClient } from '@supabase/supabase-js'

export async function pickAgentForOrder(client: SupabaseClient, customerCity?: string): Promise<string | null> {
  const { data: agents } = await client
    .from('agents')
    .select('id, city')
    .eq('status', 'active')

  if (!agents || agents.length === 0) return null
  if (agents.length === 1) return agents[0].id

  const { data: activeOrders } = await client
    .from('orders')
    .select('assigned_agent_id')
    .in('status', ['pending', 'confirmed', 'prepared'])
    .not('assigned_agent_id', 'is', null)

  const counts = new Map<string, number>()
  agents.forEach(a => counts.set(a.id, 0))
  ;(activeOrders || []).forEach((o: any) => {
    if (counts.has(o.assigned_agent_id)) {
      counts.set(o.assigned_agent_id, (counts.get(o.assigned_agent_id) || 0) + 1)
    }
  })

  const normCity = (c?: string | null) => (c || '').trim().toLowerCase()
  const orderCity = normCity(customerCity)

  let pool = agents
  if (orderCity) {
    const cityAgents = agents.filter(a => normCity(a.city) === orderCity)
    if (cityAgents.length > 0) pool = cityAgents
  }

  let bestId: string | null = null
  let bestCount = Infinity
  for (const a of pool) {
    const count = counts.get(a.id) || 0
    if (count < bestCount) {
      bestCount = count
      bestId = a.id
    }
  }
  return bestId
}
