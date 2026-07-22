import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('team_leaders')
    .select('*')
    .order('created_at', { ascending: false })
  return NextResponse.json({ leaders: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from('team_leaders')
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
  return NextResponse.json({ ok: true, leader: data })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  await supabaseAdmin.from('team_leaders').update({ status: body.status }).eq('id', body.id)
  return NextResponse.json({ ok: true })
}
