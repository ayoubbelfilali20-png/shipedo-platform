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
    .from('sellers').select('id, email, password, status, name, company')
    .eq('email', email).limit(1).maybeSingle()
  if (seller && seller.password === password) {
    if (seller.status === 'suspended') return NextResponse.json({ ok: false, error: 'Account suspended' })
    return NextResponse.json({ ok: true, user: { role: 'seller', id: seller.id, email: seller.email, name: seller.company || seller.name, fullName: seller.name } })
  }

  // Call agent
  const { data: agent } = await supabaseAdmin
    .from('agents').select('id, email, password, status, name')
    .eq('email', email).limit(1).maybeSingle()
  if (agent && agent.password === password) {
    if (agent.status === 'suspended') return NextResponse.json({ ok: false, error: 'Account suspended' })
    return NextResponse.json({ ok: true, user: { role: 'agent', id: agent.id, email: agent.email, name: agent.name } })
  }

  // Delivery agent
  const { data: dAgent } = await supabaseAdmin
    .from('delivery_agents').select('id, email, password, status, name')
    .eq('email', email).limit(1).maybeSingle()
  if (dAgent && dAgent.password === password) {
    if (dAgent.status === 'suspended') return NextResponse.json({ ok: false, error: 'Account suspended' })
    return NextResponse.json({ ok: true, user: { role: 'delivery', id: dAgent.id, email: dAgent.email, name: dAgent.name } })
  }

  // Storage agent
  const { data: sAgent } = await supabaseAdmin
    .from('storage_agents').select('id, email, password, status, name')
    .eq('email', email).limit(1).maybeSingle()
  if (sAgent && sAgent.password === password) {
    if (sAgent.status === 'suspended') return NextResponse.json({ ok: false, error: 'Account suspended' })
    return NextResponse.json({ ok: true, user: { role: 'storage', id: sAgent.id, email: sAgent.email, name: sAgent.name } })
  }

  return NextResponse.json({ ok: false, error: 'Invalid email or password.' })
}
