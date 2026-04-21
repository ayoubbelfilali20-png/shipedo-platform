import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(not set)'
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '(not set)'
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '(not set)'
  return NextResponse.json({
    url,
    service_role_last10: svc.slice(-10),
    anon_last10: anon.slice(-10),
    service_role_length: svc.length,
    has_newline: svc.includes('\n') || svc.includes('\r'),
  })
}
