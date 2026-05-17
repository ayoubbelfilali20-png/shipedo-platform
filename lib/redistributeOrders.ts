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
      supabaseAdmin.from('orders').select('id, customer_phone')
        .eq('status', 'pending')
        .is('assigned_agent_id', null)
        .order('created_at', { ascending: false })
        .limit(200),
    ])

    if (!agents || agents.length === 0 || !unassigned || unassigned.length === 0) return

    const agentIds = agents.map(a => a.id)
    const agentIdSet = new Set(agentIds)

    // Build phone→agent map from existing assigned orders
    const phones = unassigned
      .map(o => (o.customer_phone || '').replace(/[^\d]/g, '').slice(-9))
      .filter(p => p.length >= 8)
    const phoneToAgent = new Map<string, string>()

    if (phones.length > 0) {
      const { data: existing } = await supabaseAdmin
        .from('orders')
        .select('assigned_agent_id, customer_phone')
        .not('assigned_agent_id', 'is', null)
        .in('status', ['pending', 'confirmed', 'prepared', 'shipped_to_agent', 'shipped'])
        .limit(1000)
      ;(existing || []).forEach((o: any) => {
        const ph = (o.customer_phone || '').replace(/[^\d]/g, '').slice(-9)
        if (ph && agentIdSet.has(o.assigned_agent_id)) phoneToAgent.set(ph, o.assigned_agent_id)
      })
    }

    const batches = new Map<string, string[]>()
    agentIds.forEach(id => batches.set(id, []))
    let roundRobinIdx = 0

    for (const order of unassigned) {
      const ph = (order.customer_phone || '').replace(/[^\d]/g, '').slice(-9)
      let target: string

      if (ph && phoneToAgent.has(ph)) {
        target = phoneToAgent.get(ph)!
      } else {
        target = agentIds[roundRobinIdx % agentIds.length]
        roundRobinIdx++
        if (ph) phoneToAgent.set(ph, target)
      }

      batches.get(target)!.push(order.id)
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
