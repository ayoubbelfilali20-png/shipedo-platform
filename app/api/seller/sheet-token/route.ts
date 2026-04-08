import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function getSellerId(req: NextRequest): string | null {
  return req.headers.get('x-seller-id')
}

/** GET /api/seller/sheet-token — fetch existing token */
export async function GET(req: NextRequest) {
  const sellerId = getSellerId(req)
  if (!sellerId) return NextResponse.json({ ok: false, error: 'missing seller id' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('sellers')
    .select('sheet_ingest_token')
    .eq('id', sellerId)
    .maybeSingle()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, token: data?.sheet_ingest_token ?? null })
}

/** POST /api/seller/sheet-token — generate (or regenerate) token */
export async function POST(req: NextRequest) {
  const sellerId = getSellerId(req)
  if (!sellerId) return NextResponse.json({ ok: false, error: 'missing seller id' }, { status: 401 })

  // generate a random 32-char hex token
  const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const { error } = await supabaseAdmin
    .from('sellers')
    .update({ sheet_ingest_token: token })
    .eq('id', sellerId)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, token })
}
