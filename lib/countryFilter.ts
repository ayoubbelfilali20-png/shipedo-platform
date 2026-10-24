import { NextRequest } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'

export function getCountryFromRequest(req: NextRequest): string | null {
  const country = req.headers.get('x-country') || req.nextUrl.searchParams.get('country')
  if (country === 'KE' || country === 'TZ') return country
  return null
}

export function applyCountryFilter(query: any, country: string | null) {
  if (country) return query.eq('country', country)
  return query
}
