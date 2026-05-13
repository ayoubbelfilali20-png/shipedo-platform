import { supabaseAdmin } from '@/lib/supabaseAdmin'

let lastRun = 0
let running = false

export async function assignUnassignedOrders() {
  if (running) return
  if (Date.now() - lastRun < 300_000) return
  running = true
  lastRun = Date.now()

  try {
    const [{ data: agents }, { data: unassigned }] = await Promise.all([
      supabaseAdmin.from('agents').select('id').eq('status', 'active').order('created_at', { ascending: true }),
      supabaseAdmin.from('orders').select('id')
        .eq('status', 'pending')
        .is('assigned_agent_id', null)
        .order('created_at', { ascending: false })
        .limit(200),
    ])

    if (!agents || agents.length === 0 || !unassigned || unassigned.length === 0) return

    const agentIds = agents.map(a => a.id)
    const batches = new Map<string, string[]>()
    agentIds.forEach(id => batches.set(id, []))

    for (let i = 0; i < unassigned.length; i++) {
      const target = agentIds[i % agentIds.length]
      batches.get(target)!.push(unassigned[i].id)
    }

    await Promise.all(
      Array.from(batches.entries())
        .filter(([, ids]) => ids.length > 0)
        .map(([agentId, ids]) =>
          supabaseAdmin.from('orders')
            .update({ assigned_agent_id: agentId })
            .in('id', ids)
            .is('assigned_agent_id', null)
        )
    )
  } finally {
    running = false
  }
}
