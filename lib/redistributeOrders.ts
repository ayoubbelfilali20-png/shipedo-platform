import { supabaseAdmin } from '@/lib/supabaseAdmin'

let lastRun = 0

export async function redistributePendingOrders() {
  if (Date.now() - lastRun < 60_000) return
  lastRun = Date.now()

  const [{ data: agents }, { data: allPending }] = await Promise.all([
    supabaseAdmin.from('agents').select('id').eq('status', 'active'),
    supabaseAdmin.from('orders').select('id, assigned_agent_id, call_attempts')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  if (!agents || agents.length === 0 || !allPending || allPending.length === 0) return

  const agentIds = agents.map(a => a.id)
  const uncalled = allPending.filter(o => !o.call_attempts || o.call_attempts === 0)

  if (uncalled.length === 0) return

  const updates: { id: string; agent: string }[] = []
  uncalled.forEach((order, i) => {
    const target = agentIds[i % agentIds.length]
    if (order.assigned_agent_id !== target) {
      updates.push({ id: order.id, agent: target })
    }
  })

  if (updates.length === 0) return

  const batches: typeof updates[] = []
  for (let i = 0; i < updates.length; i += 50) {
    batches.push(updates.slice(i, i + 50))
  }
  for (const batch of batches) {
    await Promise.all(
      batch.map(u => supabaseAdmin.from('orders').update({ assigned_agent_id: u.agent }).eq('id', u.id))
    )
  }
}
