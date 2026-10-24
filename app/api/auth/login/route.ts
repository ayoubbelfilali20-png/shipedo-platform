import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const ADMIN_EMAIL = 'ayoub.belfilali20@gmail.com'
const ADMIN_PASSWORD = 'ayoubilyas@20'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'Email and password required' }, { status: 400 })
  }

  // Admin
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return NextResponse.json({ ok: true, user: { role: 'admin', email: ADMIN_EMAIL, name: 'Admin' } })
  }

  // Seller
  const { data: seller } = await supabaseAdmin
    .from('sellers').select('id, email, password, status, name, company, country')
    .eq('email', email).limit(1).maybeSingle()
  if (seller && seller.password === password) {
    if (seller.status === 'suspended') return NextResponse.json({ ok: false, error: 'Account suspended' })
    const { data: sc } = await supabaseAdmin
      .from('seller_countries').select('country')
      .eq('seller_id', seller.id).eq('status', 'active')
    const countries = sc && sc.length > 0 ? sc.map((r: any) => r.country) : [seller.country || 'KE']
    return NextResponse.json({ ok: true, user: { role: 'seller', id: seller.id, email: seller.email, name: seller.company || seller.name, fullName: seller.name, country: countries[0], countries } })
  }

  // Call agent
  const { data: agent } = await supabaseAdmin
    .from('agents').select('id, email, password, status, name, country')
    .eq('email', email).limit(1).maybeSingle()
  if (agent && agent.password === password) {
    if (agent.status === 'suspended') return NextResponse.json({ ok: false, error: 'Account suspended' })
    return NextResponse.json({ ok: true, user: { role: 'agent', id: agent.id, email: agent.email, name: agent.name, country: agent.country || 'KE' } })
  }

  // Delivery agent
  const { data: dAgent } = await supabaseAdmin
    .from('delivery_agents').select('id, email, password, status, name, country')
    .eq('email', email).limit(1).maybeSingle()
  if (dAgent && dAgent.password === password) {
    if (dAgent.status === 'suspended') return NextResponse.json({ ok: false, error: 'Account suspended' })
    return NextResponse.json({ ok: true, user: { role: 'delivery', id: dAgent.id, email: dAgent.email, name: dAgent.name, country: dAgent.country || 'KE' } })
  }

  // Storage agent
  const { data: sAgent } = await supabaseAdmin
    .from('storage_agents').select('id, email, password, status, name, country')
    .eq('email', email).limit(1).maybeSingle()
  if (sAgent && sAgent.password === password) {
    if (sAgent.status === 'suspended') return NextResponse.json({ ok: false, error: 'Account suspended' })
    return NextResponse.json({ ok: true, user: { role: 'storage', id: sAgent.id, email: sAgent.email, name: sAgent.name, country: sAgent.country || 'KE' } })
  }

  // Team leader
  const { data: tl } = await supabaseAdmin
    .from('team_leaders').select('id, email, password, status, name, country')
    .eq('email', email).limit(1).maybeSingle()
  if (tl && tl.password === password) {
    if (tl.status === 'suspended') return NextResponse.json({ ok: false, error: 'Account suspended' })
    return NextResponse.json({ ok: true, user: { role: 'teamleader', id: tl.id, email: tl.email, name: tl.name, country: tl.country || 'KE' } })
  }

  return NextResponse.json({ ok: false, error: 'Invalid email or password.' })
}
