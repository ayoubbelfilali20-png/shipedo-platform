import { createClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client with the service role key.
 * Bypasses RLS — never import this from client components.
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
}

export const supabaseAdmin = serviceKey
  ? createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : // Fallback to anon key so /api routes still load during local dev,
    // but writes/reads will be subject to RLS.
    createClient(
      url,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

export const isServiceRoleConfigured = Boolean(serviceKey)
