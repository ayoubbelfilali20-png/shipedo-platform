import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('delivery_agents')
    .select('*')
    .order('created_at', { ascending: false })
  return NextResponse.json({ agents: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from('delivery_agents')
    .insert({
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      password: body.password,
      notes: body.notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, agent: data })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  await supabaseAdmin.from('delivery_agents').update({ status: body.status }).eq('id', body.id)
  return NextResponse.json({ ok: true })
}
