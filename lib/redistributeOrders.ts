import { supabaseAdmin } from '@/lib/supabaseAdmin'

let lastRun = 0

export async function assignUnassignedOrders() {
  if (Date.now() - lastRun < 300_000) return
  lastRun = Date.now()

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

  for (let i = 0; i < unassigned.length; i++) {
    const target = agentIds[i % agentIds.length]
    await supabaseAdmin.from('orders').update({ assigned_agent_id: target }).eq('id', unassigned[i].id).is('assigned_agent_id', null)
  }
}
