export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * POST /api/auth/reset
 * Body: { token: string, password: string }
 *
 * Validates the token (exists, not used, not expired), updates the
 * user's password in `sellers` or `agents`, and marks the token used.
 *
 * GET  /api/auth/reset?token=xxx
 *   Returns { valid: boolean } so the reset page can show an
 *   appropriate UI before the user types a new password.
 */

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false, reason: 'missing token' })

  const { data, error } = await supabaseAdmin
    .from('password_resets')
    .select('id, expires_at, used_at, email')
    .eq('token', token)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ valid: false, reason: 'not found' })
  if (data.used_at)   return NextResponse.json({ valid: false, reason: 'already used' })
  if (new Date(data.expires_at).getTime() < Date.now())
    return NextResponse.json({ valid: false, reason: 'expired' })

  return NextResponse.json({ valid: true, email: data.email })
}

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json().catch(() => ({}))
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: 'token required' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ success: false, error: 'password must be at least 6 characters' }, { status: 400 })
    }

    // 1. Validate token
    const { data: row, error: lookupErr } = await supabaseAdmin
      .from('password_resets')
      .select('id, role, user_id, expires_at, used_at')
      .eq('token', token)
      .maybeSingle()

    if (lookupErr || !row) {
      return NextResponse.json({ success: false, error: 'invalid token' }, { status: 400 })
    }
    if (row.used_at) {
      return NextResponse.json({ success: false, error: 'token already used' }, { status: 400 })
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ success: false, error: 'token expired' }, { status: 400 })
    }

    // 2. Update the password in the correct table
    const table = row.role === 'seller' ? 'sellers' : 'agents'
    const { error: updErr } = await supabaseAdmin
      .from(table)
      .update({ password })
      .eq('id', row.user_id)

    if (updErr) {
      return NextResponse.json({ success: false, error: updErr.message }, { status: 500 })
    }

    // 3. Mark token as used
    await supabaseAdmin
      .from('password_resets')
      .update({ used_at: new Date().toISOString() })
      .eq('id', row.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message ?? 'unknown error' }, { status: 500 })
  }
}